import { IExecOptions } from "azure-pipelines-task-lib/toolrunner";
import { CommandType, Constants, execTaskCmdSync, getEncodedContent, writeToOutStream } from "./msdo-helpers";
import { IMicrosoftSecurityDevOps } from "./msdo-interface";
import tl = require('azure-pipelines-task-lib/task');

/**
 * Represents the tasks for container mapping that are used to fetch Docker images pushed in a job run.
 */
export class ContainerMapping implements IMicrosoftSecurityDevOps {
    private readonly commandType: CommandType;
    private readonly imageOptions: IExecOptions = {
        silent: true
    };

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
    private runPostJob() {
        let startTime = tl.getVariable(Constants.PreJobStartTime);
        if (startTime == undefined) {
            throw new Error(Constants.PreJobStartTime + " variable not set");
        }
        let dockerVersion = execTaskCmdSync("docker", ["--version"], this.imageOptions);

        let events = execTaskCmdSync("docker", [
            "events",
            "--since",
            startTime,
            "--until",
            new Date().toISOString(),
            "--filter",
            "event=push",
            "--filter",
            "type=image",
            "--format",
            "ID={{.ID}}"
        ], this.imageOptions);

        var images = "";
        if (events && events.length > 0) {
            // Only fetch Docker images if events found to avoid unnecessary calls and save time
            images = execTaskCmdSync("docker", [
                "images",
                "--format",
                "CreatedAt={{.CreatedAt}}::Repo={{.Repository}}::Tag={{.Tag}}::Digest={{.Digest}}"
            ], this.imageOptions);
        }
        else {
            // Log an issue if no events found to parse from the backend from the ADO timeline
            // We don't log a message to avoid any warning from popping up in the console output of the task
            tl.logIssue(tl.IssueType.Warning, "", null, null, null, "NoDockerEvents");
        }

        writeToOutStream(getEncodedContent(
            dockerVersion,
            events,
            images));
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
                    this.runPostJob();
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