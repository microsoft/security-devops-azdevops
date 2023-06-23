import tl = require('azure-pipelines-task-lib/task');
import { ContainerMapping } from './containerMapping';
import * as common from "./common";

/*
* Run the specified function based on the task type
*/
async function run() {
    const commandType: string = tl.getInputRequired(Inputs.CommandType);
    console.log('Running ', commandType);

    switch (commandType) {
        case common.CommandType.PreJob:
            this.runPre();
            break;
        case common.CommandType.PostJob:
            this.runPost();
            break;
        default:
            throw new Error('Invalid task type');
    }
}

run().catch(error => {
    console.log("Ran into error: " + error);
    // Always mark it as success even on error
    tl.setResult(tl.TaskResult.Succeeded, "Finished execution", true);
});