import tl = require('azure-pipelines-task-lib/task');
import { MicrosoftSecurityDevOps } from './msdo';
import { Inputs } from "./common";

let succeedOnError = false;

async function run() {
    const commandType: string = tl.getInputRequired(Inputs.CommandType);
    succeedOnError = commandType == "pre-job" || commandType == "post-job";
    console.log('Running ', commandType);
    const conMap = new MicrosoftSecurityDevOps(commandType);
    await conMap.run();
}

run().catch(error => {
    if (succeedOnError) {
        console.log("Ran into error: " + error);
        // Always mark it as success even on error
        tl.setResult(tl.TaskResult.Succeeded, "Finished execution", true);
    } else {
        tl.setResult(tl.TaskResult.Failed, error);
    }
});