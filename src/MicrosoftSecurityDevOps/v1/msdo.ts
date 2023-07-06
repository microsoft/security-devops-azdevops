import tl = require('azure-pipelines-task-lib/task');
import { CommandType, getTaskVersion, execTaskCmdSync, getEncodedContent, Constants } from './msdo-helpers';
import { IExecOptions } from 'azure-pipelines-task-lib/toolrunner';
import { IMicrosoftSecurityDevOps } from './msdo-interface';
import * as client from '@microsoft/security-devops-azdevops-task-lib/msdo-client';
import * as msdoCommon from '@microsoft/security-devops-azdevops-task-lib/msdo-common';


/*
* Class for Container Mapping functionality in Code to Cloud Decorator task.
*/
export class MicrosoftSecurityDevOps implements IMicrosoftSecurityDevOps {
    private readonly commandType: CommandType;
    private readonly version: string;
    private readonly imageOptions: IExecOptions = {
        silent: true
    };

    constructor(inputString: string) {
        this.commandType = inputString as CommandType;
        this.version = getTaskVersion();
        tl.debug("Task version: " + this.version);
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
            images,
            this.version));
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
            case CommandType.PreJob:
                this.runPreJob();
                break;
            case CommandType.PostJob:
                this.runPostJob();
                break;
            case CommandType.Run:
                await this.runMsdo();
                break;
            default:
                throw new Error(`Invalid command type: ${this.commandType}`);
        }
    }
}