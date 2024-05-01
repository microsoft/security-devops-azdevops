import { CommandType, Constants, getEncodedContent, writeToOutStream } from "./msdo-helpers";
import { IMicrosoftSecurityDevOps } from "./msdo-interface";
import tl = require('azure-pipelines-task-lib/task');
import { CommandExecutor, ICommandResult } from "./command-executor";
import {v4 as uuidv4} from 'uuid';

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
    * Using the start time, fetch the docker events and docker images in this job run and log the encoded output
    */
    private async runPostJob() {
        let startTime = tl.getVariable(Constants.PreJobStartTime);
        if (startTime == undefined || startTime.length <= 0) {
            startTime = new Date(new Date().getTime() - 10000).toISOString();
            writeToOutStream(Constants.PreJobStartTime + " variable not set/undefined, using now-10secs ");
        }

        // Initialize the commands 
        let dockerVersionCmd = new CommandExecutor('docker', '--version');
        let eventsCmd = new CommandExecutor('docker', `events --since ${startTime} --until ${new Date().toISOString()} --filter event=push --filter type=image --format ID={{.ID}}`);
        let imagesCmd = new CommandExecutor('docker', 'images --format CreatedAt={{.CreatedAt}}::Repo={{.Repository}}::Tag={{.Tag}}::Digest={{.Digest}}');

        // Execute all commands in parallel
        let dvPromise : Promise<ICommandResult> = dockerVersionCmd.execute();
        let evPromise : Promise<ICommandResult> = eventsCmd.execute();
        let imPromise : Promise<ICommandResult> = imagesCmd.execute();

        // Wait for Docker version
        let dockerVersion: ICommandResult = await dvPromise;
        if (dockerVersion.code != 0) {
            writeToOutStream(`Error fetching Docker Version: ${dockerVersion.output}`);
            dockerVersion.output = Constants.Unknown;
        }
        const cleanedDockerVersion = CommandExecutor.removeCommandFromOutput(dockerVersion.output);
        tl.debug(`Docker Version: ${cleanedDockerVersion}`);

        // Wait for Docker events command to verify any images were built on this run
        let events: ICommandResult = await evPromise;
        if (events.code != 0) {
            throw new Error(`Unable to fetch Docker events: ${events.output}`);
        }

        const cleanedEventsOutput = CommandExecutor.removeCommandFromOutput(events.output);
        var images: ICommandResult;
        if (!cleanedEventsOutput) {
            tl.debug(`No Docker events found`);
            // Log a detail if no events found. We will check for this DetailTimeline record from our backend to reduce calls to ADO REST API to be mindful of Rate Limits.
            tl.logDetail(uuidv4(), "No Docker events found", null, "NoDockerEvents", "NoDockerEvents", 999);
            // Initialize an empty Command Result for Docker images
            images = <ICommandResult>{ code: 0, output: "" };
        }
        else {
            // Wait for Docker images command only if events were found
            images = await imPromise;
            if (images.code != 0) {
                throw new Error(`Unable to fetch Docker images: ${images.output}`);
            }
        }

        writeToOutStream(getEncodedContent(
            cleanedDockerVersion, 
            cleanedEventsOutput, 
            CommandExecutor.removeCommandFromOutput(images.output)));
    }

    /*
    * Run the specified function based on the task type
    */
    async run() {
        // Group command adds a collapsible section in the logs - https://learn.microsoft.com/en-us/azure/devops/pipelines/scripts/logging-commands?view=azure-devops&tabs=bash#formatting-commands
        writeToOutStream("##[group]This task was injected as part of Microsoft Defender for DevOps enablement- https://go.microsoft.com/fwlink/?linkid=2231419");
        // This section is used as a delimiter while fetching logs from the REST API in our backend, do not modify
        writeToOutStream("##[section]:::::");

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