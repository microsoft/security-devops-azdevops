import tl = require('azure-pipelines-task-lib/task');
import * as common from './common';
import { IExecOptions } from 'azure-pipelines-task-lib/toolrunner';
import { ICodeToCloud } from './c2c';


/*
* Class for Container Mapping functionality in Code to Cloud Decorator task.
*/
export class ContainerMapping implements ICodeToCloud {
    private readonly taskType: common.TaskType;
    private readonly version: string;
    private readonly sectionDelim: string = ":::";
    private readonly preJobStartTime: string = "PREJOBSTARTTIME";
    private readonly imageOptions: IExecOptions = {
        silent: true
    };

    constructor(inputString: string) {
        this.taskType = inputString as common.TaskType;
        this.version = common.getTaskVersion();
    }

    /*
    * Set the start time of the job run.
    */
    private runPre() {
        const startTime = new Date().toISOString();
        tl.setVariable(this.preJobStartTime, startTime);
    }

    /*
    * Using the start time, fetch the docker events and docker images in this job run and log the encoded output
    */
    private runPost() {
        let startTime = tl.getVariable(this.preJobStartTime);
        if (startTime == undefined) {
            throw new Error(this.preJobStartTime + " variable not set");
        }
        let data : string[] = [];
        data.push(common.execTaskCmdSync("docker", ["--version"], this.imageOptions));
        data.push("Version: " + this.version);
        data.push(this.sectionDelim + "Events:");

        var events = common.execTaskCmdSync("docker", [
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
                
        data.push(events);
        
        data.push(this.sectionDelim + "Images:");
        var images = common.execTaskCmdSync("docker", [
            "images",
            "--format",
            "CreatedAt={{.CreatedAt}}::Repo={{.Repository}}::Tag={{.Tag}}::Digest={{.Digest}}"
            ], this.imageOptions);
        data.push(images);
        console.log(common.encode(data.join("\n")));
    }

    /*
    * Run the specified function based on the task type
    */
    run() {
        switch (this.taskType) {
            case common.TaskType.PreJob:
                this.runPre();
                break;
            case common.TaskType.PostJob:
                this.runPost();
                break;
            default:
                throw new Error('Invalid task type');
        }
    }
}