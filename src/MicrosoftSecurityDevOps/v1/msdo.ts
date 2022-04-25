import * as tl from 'azure-pipelines-task-lib/task'
import * as process from 'process';
import { MsdoClient } from 'microsoft-security-devops-azdevops-task-lib'

async function run() {
    let client = new MsdoClient();

    let args: string[] = [];

    let config: string = tl.getInput('config');
    if (!client.isNullOrWhiteSpace(config)) {
        args.push('-c');
        args.push(config);
    }

    let policy: string = tl.getInput('policy');
    if (!client.isNullOrWhiteSpace(policy)) {
        if (policy === 'none') {
            args.push('--no-policy');
        } else {
            // Use the defined policy
            args.push('-p');
            args.push(policy);
        }
    }

    let categoriesString: string = tl.getInput('categories');
    if (!client.isNullOrWhiteSpace(categoriesString)) {
        args.push('--categories');
        let categories = categoriesString.split(',');
        for (let i = 0; i < categories.length; i++) {
            let category = categories[i];
            if (!client.isNullOrWhiteSpace(category)) {
                args.push(category.trim());
            }
        }
    }

    let languagesString: string = tl.getInput('languages');
    if (!client.isNullOrWhiteSpace(languagesString)) {
        args.push('--languages');
        let languages = languagesString.split(',');
        for (let i = 0; i < languages.length; i++) {
            let language = languages[i];
            if (!client.isNullOrWhiteSpace(language)) {
                args.push(language.trim());
            }
        }
    }

    let toolsString: string = tl.getInput('tools');
    if (!client.isNullOrWhiteSpace(toolsString)) {
        args.push('--tool');
        let tools = toolsString.split(',');
        for (let i = 0; i < tools.length; i++) {
            let tool = tools[i];
            if (!client.isNullOrWhiteSpace(tool)) {
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