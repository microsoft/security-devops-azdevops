import tl = require('azure-pipelines-task-lib/task');
import * as common from './common';
import { IExecOptions } from 'azure-pipelines-task-lib/toolrunner';
import { IMicrosoftSecurityDevOps } from './msdo-interface';
import * as client from '@microsoft/security-devops-azdevops-task-lib/msdo-client';
import * as msdoCommon from '@microsoft/security-devops-azdevops-task-lib/msdo-common';


/*
* Class for Container Mapping functionality in Code to Cloud Decorator task.
*/
export class MicrosoftSecurityDevOps implements IMicrosoftSecurityDevOps {
    private readonly commandType: common.CommandType;
    private readonly version: string;
    private readonly sectionDelim: string = ":::";
    private readonly preJobStartTime: string = "PREJOBSTARTTIME";
    private readonly imageOptions: IExecOptions = {
        silent: true
    };

    constructor(inputString: string) {
        this.commandType = inputString as common.CommandType;
        this.version = common.getTaskVersion();
    }

    /*
    * Set the start time of the job run.
    */
    private runPreJob() {
        const startTime = new Date().toISOString();
        tl.setVariable(this.preJobStartTime, startTime);
    }

    /*
    * Using the start time, fetch the docker events and docker images in this job run and log the encoded output
    */
    private runPostJob() {
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

    private async runMsdo() {
        let args: string[] = [];
    
        let config: string = tl.getInput('config');
        if (!msdoCommon.isNullOrWhiteSpace(config)) {
            args.push('-c');
            args.push(config);
        }
    
        let policy: string = tl.getInput('policy');
        if (!msdoCommon.isNullOrWhiteSpace(policy)) {
            if (policy === 'none') {
                args.push('--no-policy');
            } else {
                // Use the defined policy
                args.push('-p');
                args.push(policy);
            }
        }
    
        let categoriesString: string = tl.getInput('categories');
        if (!msdoCommon.isNullOrWhiteSpace(categoriesString)) {
            args.push('--categories');
            let categories = categoriesString.split(',');
            for (let i = 0; i < categories.length; i++) {
                let category = categories[i];
                if (!msdoCommon.isNullOrWhiteSpace(category)) {
                    args.push(category.trim());
                }
            }
        }
    
        let languagesString: string = tl.getInput('languages');
        if (!msdoCommon.isNullOrWhiteSpace(languagesString)) {
            args.push('--languages');
            let languages = languagesString.split(',');
            for (let i = 0; i < languages.length; i++) {
                let language = languages[i];
                if (!msdoCommon.isNullOrWhiteSpace(language)) {
                    args.push(language.trim());
                }
            }
        }
    
        let toolsString: string = tl.getInput('tools');
        if (!msdoCommon.isNullOrWhiteSpace(toolsString)) {
            args.push('--tool');
            let tools = toolsString.split(',');
            for (let i = 0; i < tools.length; i++) {
                let tool = tools[i];
                if (!msdoCommon.isNullOrWhiteSpace(tool)) {
                    args.push(tool.trim());
                }
            }
        }
    
        let publish: boolean = tl.getBoolInput('publish');
        let artifactName: string = tl.getInput('artifactName');
    
        let successfulExitCodes: number[] = [0];
    
        let breakEnabled: boolean = tl.getBoolInput('break');
        if (!breakEnabled) {
            // allow break
            successfulExitCodes.push(8);
        }
    
        args.push('--rich-exit-code');
    
        await client.run(args, successfulExitCodes, publish, artifactName);
    }

    /*
    * Run the specified function based on the task type
    */
    async run() {
        switch (this.commandType) {
            case common.CommandType.PreJob:
                this.runPreJob();
                break;
            case common.CommandType.PostJob:
                this.runPostJob();
                break;
            case common.CommandType.Run:
                await this.runMsdo();
                break;
            default:
                throw new Error(`Invalid command type: ${this.commandType}`);
        }
    }
}