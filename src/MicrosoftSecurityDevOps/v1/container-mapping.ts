import { CommandType, Constants, getEncodedContent, writeToOutStream } from "./msdo-helpers";
import { IMicrosoftSecurityDevOps } from "./msdo-interface";
import tl = require('azure-pipelines-task-lib/task');
import { CommandExecutor, ICommandResult } from "./command-executor";
import {v4 as uuidv4} from 'uuid';
import * as os from 'os';
import * as https from "https";

const ContainerMappingUrlProd: string = "https://dfdinfra-afdendpoint-prod-d5fqbucbg7fue0cf.z01.azurefd.net/azuredevops/v1/container-mappings";
const TokenApiVersion: string = "api-version=7.1-preview.1";

/**
 * Represents the tasks for container mapping that are used to fetch Docker images pushed in a job run.
 */
export class ContainerMapping implements IMicrosoftSecurityDevOps {
    private readonly commandType: CommandType;

    readonly succeedOnError: boolean;

    constructor(commandType: CommandType) {
        this.succeedOnError = true;
        this.commandType = commandType;
    }

    /*
    * Set the start time of the job run.
    */
    private runPreJob() {
        const startTime = new Date().toISOString();
        tl.setVariable(Constants.PreJobStartTime, startTime);
    }

    /*
    * Using the start time, fetch the docker events and docker images in this job run and log the encoded output.
    */
    private async runPostJob() {
        let startTime = tl.getVariable(Constants.PreJobStartTime);
        if (startTime == undefined || startTime.length <= 0) {
            startTime = new Date(new Date().getTime() - 10000).toISOString();
            writeToOutStream(Constants.PreJobStartTime + " variable not set/undefined, using now-10secs ");
        }

        let reportData = {
            dockerVersion: "",
            dockerEvents: [],
            dockerImages: []
        };

        // Initialize the commands 
        let dockerVersionCmd = new CommandExecutor('docker', '--version');
        let eventsCmd = new CommandExecutor('docker', `events --since ${startTime} --until ${new Date().toISOString()} --filter event=push --filter type=image --format ID={{.ID}}`);
        let imagesCmd = new CommandExecutor('docker', 'images --format CreatedAt={{.CreatedAt}}::Repo={{.Repository}}::Tag={{.Tag}}::Digest={{.Digest}}');

        // Execute all commands in parallel
        let dvPromise : Promise<ICommandResult> = dockerVersionCmd.execute();
        let evPromise : Promise<ICommandResult> = eventsCmd.execute();
        let imPromise : Promise<ICommandResult> = imagesCmd.execute();

        // Get the OIDC token
        let bearerTokenPromise: Promise<string> = this.GetOIDCToken();            

        // Wait for Docker version
        let dockerVersion: ICommandResult = await dvPromise;
        if (dockerVersion.code != 0) {
            writeToOutStream(`Error fetching Docker Version: ${dockerVersion.output}`);
            dockerVersion.output = Constants.Unknown;
        }
        const cleanedDockerVersion = CommandExecutor.removeCommandFromOutput(dockerVersion.output);
        tl.debug(`Docker Version: ${cleanedDockerVersion}`);
        reportData.dockerVersion = cleanedDockerVersion;

        // Wait for Docker events command to verify any images were built on this run
        let events: ICommandResult = await evPromise;
        if (events.code != 0) {
            throw new Error(`Unable to fetch Docker events: ${events.output}`);
        }

        const cleanedEventsOutput = CommandExecutor.removeCommandFromOutput(events.output);
        var images: ICommandResult;
        if (!cleanedEventsOutput) {
            tl.debug(`No Docker events found`);
            // Log a detail if no events found. We will check for this DetailTimeline record from our backend to reduce calls to ADO REST API to be mindful of Rate Limits., remove after oidc
            tl.logDetail(uuidv4(), "No Docker events found", null, "NoDockerEvents", "NoDockerEvents", 999); //remove after oidc
            // Initialize an empty Command Result for Docker images
            images = <ICommandResult>{ code: 0, output: "" };
        }
        else {
            reportData.dockerEvents = cleanedEventsOutput.split(os.EOL);
            // Wait for Docker images command only if events were found
            images = await imPromise;
            if (images.code != 0) {
                throw new Error(`Unable to fetch Docker images: ${images.output}`);
            }
        }

        const cleanedImagesOutput = CommandExecutor.removeCommandFromOutput(images.output);
        reportData.dockerImages = cleanedImagesOutput.split(os.EOL);

        //remove after oidc
        writeToOutStream(getEncodedContent(
            cleanedDockerVersion, 
            cleanedEventsOutput, 
            cleanedImagesOutput));
        //remove after oidc

        tl.debug(JSON.stringify(reportData));

        // Upload the data
        tl.debug(`Finished data collection, starting API calls`);        

        let bearerToken: string = await bearerTokenPromise
            .then((token) => {  
                if (!token) {
                    throw new Error("Empty OIDC token received");
                }
                return token; 
            })
            .catch((error) => {
                throw new Error("Unable to get token: " + error);
            });        

        const sendStartTime = new Date().toISOString();
        await this.SendReport(JSON.stringify(reportData), bearerToken);
        const sendEndTime = new Date().toISOString();
        //writeToOutStream("Container Mapping data sent successfully in " + (new Date(sendEndTime).getTime() - new Date(sendStartTime).getTime()) + "ms"); //readd after oidc
        writeToOutStream(`##[debug]Container Mapping data sent successfully in ${(new Date(sendEndTime).getTime() - new Date(sendStartTime).getTime())}ms`); //remove after oidc
    }

    /*
    * Get the OIDC Token. Returns the token as a string.
    */
    private async GetOIDCToken(): Promise<string>
    {
        // https://learn.microsoft.com/rest/api/azure/devops/distributedtask/oidctoken/create?view=azure-devops-rest-7.1
        let collectionUri = tl.getVariable('SYSTEM_CollectionUri');        
        let teamProjectId = tl.getVariable('SYSTEM_TeamProjectId');
        let hostType = tl.getVariable('SYSTEM_HostType');
        let planId = tl.getVariable('SYSTEM_PlanId');
        let jobId = tl.getVariable('SYSTEM_JobId');        
        let uri = collectionUri + teamProjectId + "/_apis/distributedtask/hubs/" + hostType + "/plans/" + planId + "/jobs/" + jobId + "/oidctoken?" + TokenApiVersion;

        let bearerToken = tl.getVariable('SYSTEM_ACCESSTOKEN');
        let data = JSON.stringify({authorizationId: "00000000-0000-0000-0000-000000000000"});
        
        return this.PostData(uri, data, bearerToken, true)
            .then((response) => JSON.parse(response))
            .then((json) => json.oidcToken)
            .catch((reason) => { throw new Error("Unable to get token: " + reason); });
    }

    /*
    * Upload the data to Defender for DevOps. Returns the status code of the API call.
    */
    private async SendReport(reportData: string, bearerToken: string): Promise<number>
    {
        let alternateDevOpsServer: string = tl.getInput('alternateDevOpsServer');
        let containerMappingUrl: string = (alternateDevOpsServer && alternateDevOpsServer.length > 0) ? alternateDevOpsServer : ContainerMappingUrlProd;

        return this.PostData(containerMappingUrl, reportData, bearerToken, false)
            .then(response => response.statusCode)
            .catch((reason) => { throw new Error("Unable to post data: " + reason); })
    }

    /*
    * Post Request to the specified URI with the data and auth token provided. Returns the response object.
    */
    private async PostData(uri: string, data: string, auth: string, returnData: boolean): Promise<any>
    {
        return new Promise(async (resolve, reject) => {
            let options = {
                method: 'POST',
                timeout: 2500,
                body: data,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + auth,
                    'Content-Length': '' + data.length
                }
            };
            writeToOutStream(`##[debug]${options['method'].toUpperCase()} ${uri}`);

            const req = https.request(uri, options, (res) => {
                let resData = '';
                res.on('data', (chunk) => {
                    resData += chunk.toString();
                });
                
                res.on('end', () => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        return reject(`Received Failed Status code when calling url: ${res.statusCode} ${resData}`);
                    }
                    writeToOutStream(`##[debug]Received Status code: ${res.statusCode} and Status message: ${res.statusMessage}`);

                    // Return the data if requested
                    if (returnData) {
                        resolve(resData);
                    }
                    // Return client response otherwise
                    resolve(res);
                });
                
                res.on('error', (error) => {
                    reject(new Error(`Error calling url error: ${error}`));
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Error calling url: ${error}`));
            });

            req.write(data);
            req.end();
        });
    }

    /*
    * Run the specified function based on the task type.
    */
    async run() {
        // Group command adds a collapsible section in the logs - https://learn.microsoft.com/en-us/azure/devops/pipelines/scripts/logging-commands?view=azure-devops&tabs=bash#formatting-commands
        writeToOutStream("##[group]This task was injected as part of Microsoft Defender for DevOps enablement- https://go.microsoft.com/fwlink/?linkid=2231419");
        // This section is used as a delimiter while fetching logs from the REST API in our backend, remove after oidc
        writeToOutStream("##[section]:::::"); //remove after oidc

        try {
            switch (this.commandType) {
                case CommandType.PreJob:
                    this.runPreJob();
                    break;
                case CommandType.PostJob:
                    await this.runPostJob();
                    break;
                default:
                    throw new Error(`Invalid command type for Container Mapping: ${this.commandType}`);
            }
        }
        catch (error) {
            // Log the error
            writeToOutStream("Error in Container Mapping: " + error);
        }
        finally {
            // End the collapsible section
            writeToOutStream("##[endgroup]");
        }
    }
}