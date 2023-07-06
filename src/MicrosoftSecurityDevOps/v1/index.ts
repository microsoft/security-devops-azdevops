import tl = require('azure-pipelines-task-lib/task');
import { MicrosoftSecurityDevOps } from './msdo';
import { Inputs, CommandType } from './msdo-helpers';

let succeedOnError = false;

async function run() {
    const commandType: string = tl.getInput(Inputs.CommandType, false) || CommandType.Run;
    succeedOnError = commandType == CommandType.PreJob || commandType == CommandType.PostJob;
    console.log('Running ', commandType);
    const conMap = new MicrosoftSecurityDevOps(commandType);
    await conMap.run();
}

run().catch(error => {
    if (succeedOnError) {
        console.log('Ran into error: ' + error);
        // Always mark it as success even on error
        tl.setResult(tl.TaskResult.Succeeded, 'Finished execution', true);
    } else {
        tl.setResult(tl.TaskResult.Failed, error);
    }
});