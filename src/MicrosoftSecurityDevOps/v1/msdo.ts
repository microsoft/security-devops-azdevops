import * as tl from 'azure-pipelines-task-lib/task'
import * as process from 'process';
import * as client from '@microsoft/security-devops-azdevops-task-lib/msdo-client';
import * as common from '@microsoft/security-devops-azdevops-task-lib/msdo-common';

async function run() {
    let args: string[] = [];

    let config: string = tl.getInput('config');
    if (!common.isNullOrWhiteSpace(config)) {
        args.push('-c');
        args.push(config);
    }

    let policy: string = tl.getInput('policy');
    if (!common.isNullOrWhiteSpace(policy)) {
        if (policy === 'none') {
            args.push('--no-policy');
        } else {
            // Use the defined policy
            args.push('-p');
            args.push(policy);
        }
    }

    let categoriesString: string = tl.getInput('categories');
    if (!common.isNullOrWhiteSpace(categoriesString)) {
        args.push('--categories');
        let categories = categoriesString.split(',');
        for (let i = 0; i < categories.length; i++) {
            let category = categories[i];
            if (!common.isNullOrWhiteSpace(category)) {
                args.push(category.trim());
            }
        }
    }

    let languagesString: string = tl.getInput('languages');
    if (!common.isNullOrWhiteSpace(languagesString)) {
        args.push('--languages');
        let languages = languagesString.split(',');
        for (let i = 0; i < languages.length; i++) {
            let language = languages[i];
            if (!common.isNullOrWhiteSpace(language)) {
                args.push(language.trim());
            }
        }
    }

    let toolsString: string = tl.getInput('tools');
    if (!common.isNullOrWhiteSpace(toolsString)) {
        args.push('--tool');
        let tools = toolsString.split(',');
        for (let i = 0; i < tools.length; i++) {
            let tool = tools[i];
            if (!common.isNullOrWhiteSpace(tool)) {
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

run().catch((error) => tl.setResult(tl.TaskResult.Failed, error));