import { IExecOptions } from "azure-pipelines-task-lib/toolrunner";
import { CommandType, Constants, execTaskCmdSync, getEncodedContent } from "./msdo-helpers";
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

        let images = execTaskCmdSync("docker", [
            "images",
            "--format",
            "CreatedAt={{.CreatedAt}}::Repo={{.Repository}}::Tag={{.Tag}}::Digest={{.Digest}}"
        ], this.imageOptions);

        console.log(getEncodedContent(
            dockerVersion,
            events,
            images));
    }

    /*
    * Run the specified function based on the task type
    */
    async run() {
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
}