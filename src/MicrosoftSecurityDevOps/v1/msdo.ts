import tl = require('azure-pipelines-task-lib/task');
import { CommandType } from './msdo-helpers';
import { IMicrosoftSecurityDevOps } from './msdo-interface';
import * as client from '@microsoft/security-devops-azdevops-task-lib/msdo-client';
import * as msdoCommon from '@microsoft/security-devops-azdevops-task-lib/msdo-common';


/*
* Class for Container Mapping functionality in Code to Cloud Decorator task.
*/
export class MicrosoftSecurityDevOps implements IMicrosoftSecurityDevOps {
    private readonly commandType: CommandType;
    readonly succeedOnError: boolean;

    constructor(commandType: CommandType) {
        this.succeedOnError = false;
        this.commandType = commandType;
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
        } else {
            // If the policy is not user defined, default to azuredevops
            args.push('-p');
            args.push('azuredevops');
        }
    
        let categoriesString: string = tl.getInput('categories');
        if (!msdoCommon.isNullOrWhiteSpace(categoriesString)) {
            args.push('--categories');
            let categories = categoriesString.split(',');
            for (let i = 0; i < categories.length; i++) {
                let category = categories[i];
                if (category.toLowerCase() == "secrets" && categories.length == 1) {
                    console.log('------------------------------------------------------------------------------');
                    console.log('Effective September 20th 2023, the Secret Scanning option (CredScan) within Microsoft Security DevOps (MSDO) Extension for Azure DevOps is deprecated. MSDO Secret Scanning is replaced by the Configure GitHub Advanced Security for Azure DevOps features - https://learn.microsoft.com/en-us/azure/devops/repos/security/configure-github-advanced-security-features#set-up-secret-scanning.');
                    console.log('------------------------------------------------------------------------------');
                    return;
                } else if (!msdoCommon.isNullOrWhiteSpace(category)) {
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
            case CommandType.Run:
                await this.runMsdo();
                break;
            default:
                throw new Error(`Invalid command type: ${this.commandType}`);
        }
    }
}