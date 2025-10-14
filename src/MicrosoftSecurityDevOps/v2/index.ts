import tl = require('azure-pipelines-task-lib/task');
import { MicrosoftDefenderCLI } from './defender-cli';
import { Inputs, CommandType, writeToOutStream } from './defender-helpers';
import { IMicrosoftDefenderCLI, IMicrosoftDefenderCLIFactory } from './defender-interface';
import { ContainerMapping } from './container-mapping';

let succeedOnError = false;

/**
 * Returns an instance of IMicrosoftDefenderCLI based on the input command type.
 * @param inputString - The input command type.
 * @returns An instance of IMicrosoftDefenderCLI.
 * @throws An error if the input command type is invalid.
 */
function _getDefenderRunner(inputString: string): IMicrosoftDefenderCLI {
    var commandType = inputString as CommandType;
    switch (commandType) {
        case CommandType.PreJob:
        case CommandType.PostJob:
            return _getExecutor(ContainerMapping, commandType);
        case CommandType.Run:
            return _getExecutor(MicrosoftDefenderCLI, commandType);
        default:
            throw new Error(`Invalid command type for the task: ${commandType}`);
    }
}

/**
 * Returns an instance of IMicrosoftDefenderCLI based on the input runner and command type.
 * (This is used to enforce strong typing for the inputs for the runner).
 * @param runner - The runner to use to create the instance of IMicrosoftDefenderCLI.
 * @param commandType - The input command type.
 * @returns An instance of IMicrosoftDefenderCLI.
 */
function _getExecutor(runner: IMicrosoftDefenderCLIFactory, commandType: CommandType): IMicrosoftDefenderCLI {
    return new runner(commandType);
}

async function run() {
    const commandType: string = tl.getInput(Inputs.CommandType, false) || CommandType.Run;
    tl.debug('Running Command: ' + commandType);
    const defenderRunner = _getDefenderRunner(commandType);
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
