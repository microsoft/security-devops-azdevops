import tl = require('azure-pipelines-task-lib/task');
import { MicrosoftDefenderCLI } from './defender-cli';
import { writeToOutStream } from './defender-helpers';
import { IMicrosoftDefenderCLI, IMicrosoftDefenderCLIFactory } from './defender-interface';

let succeedOnError = false;

/**
 * Returns an instance of IMicrosoftDefenderCLI.
 * The scan type (fs, image, model) is determined by the CLI class based on task inputs.
 * @returns An instance of IMicrosoftDefenderCLI.
 */
function _getDefenderRunner(): IMicrosoftDefenderCLI {
    return _getExecutor(MicrosoftDefenderCLI);
}

/**
 * Returns an instance of IMicrosoftDefenderCLI based on the input runner.
 * (This is used to enforce strong typing for the factory pattern).
 * @param runner - The factory to use to create the instance of IMicrosoftDefenderCLI.
 * @returns An instance of IMicrosoftDefenderCLI.
 */
function _getExecutor(runner: IMicrosoftDefenderCLIFactory): IMicrosoftDefenderCLI {
    return new runner();
}

/**
 * Main entry point for the task.
 * Creates and runs the Defender CLI which handles all scan types (filesystem, image, model).
 */
async function run() {
    tl.debug('Starting Microsoft Defender for DevOps scan');
    const defenderRunner = _getDefenderRunner();
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
