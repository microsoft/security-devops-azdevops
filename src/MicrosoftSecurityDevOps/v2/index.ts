import tl = require('azure-pipelines-task-lib/task');
import { MicrosoftDefenderCLI } from './defender-cli';
import { writeToOutStream } from './defender-helpers';

let succeedOnError = false;

async function run() {
    const defenderRunner = new MicrosoftDefenderCLI();
    succeedOnError = defenderRunner.succeedOnError;
    await defenderRunner.run();
}

run().catch(error => {
    if (succeedOnError) {
        writeToOutStream('Ran into error: ' + error);
        // Always mark it as success even on error
        tl.setResult(tl.TaskResult.Succeeded, 'Finished execution', true);
    } else {
        tl.setResult(tl.TaskResult.Failed, error);
    }
});
