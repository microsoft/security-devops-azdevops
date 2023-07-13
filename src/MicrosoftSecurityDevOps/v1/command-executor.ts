import { IExecOptions, ToolRunner } from "azure-pipelines-task-lib/toolrunner";
import { Writable } from "stream";
import { writeToOutStream } from "./msdo-helpers";
import * as os from 'os';

/**
 * Represents the result of a command execution.
 */
export interface ICommandResult {
    /**
     * The exit code of the command.
     */
    code: number;
    /**
     * The output of the command (Currently the errors are also forwarded to the output)
     */
    output: string;
}

/**
 * Represents an executor and returns the result of the execution.
 */
interface IExecutor {
    /**
     * Executes the command line tool and returns the result of the execution.
     * @returns A promise that resolves to an object containing the exit code and output of the command.
     */
    execute(): Promise<ICommandResult>;
}

/**
 * Represents an executor that executes a command line tool (abstraction over the `azure-pipelines-task-lib/toolrunner.ToolRunner`).
 * The executor will enforce a timeout on the execution of the command and kill the child process.
 */
export class CommandExecutor implements IExecutor {
    /**
     * The timeout for the command execution in milliseconds.
     */
    private readonly timeout: number;
    /**
     * The timer used to enforce the timeout.
     */
    private timer: NodeJS.Timeout;
    /**
     * The chunks of output received from the command execution.
     */
    private chunks: Buffer[];
    /**
     * The writable stream used to capture the output of the command execution.
     */
    private outStream: Writable;
    /**
     * The name of the command being executed.
     */
    private readonly _name: string;
    /**
     * The tool runner used to execute the command.
     */
    private toolRunner: ToolRunner;
    
    /**
     * Creates a new instance of the CommandExecutor class.
     * @param toolName The name of the command line tool to execute.
     * @param argLine The arguments to pass to the command line tool.
     * @param timeout The timeout for the command execution in milliseconds (Defaults to a minute)
     */
    constructor(toolName: string, argLine: string, timeout: number = 60*1000) {
        this.toolRunner = new ToolRunner(toolName);
        this.toolRunner.line(argLine);
        this._name = `${toolName} ${argLine}`;
        this.timeout = timeout;
        this.chunks = [];
        const outChunks = this.chunks;
        this.outStream = new Writable({
            write(chunk, encoding, callback) {
                outChunks.push(Buffer.from(chunk, encoding));
                callback();
            }
        });
    }

    /**
     * <inheritdoc/>
     */
    public async execute(): Promise<ICommandResult> {
        this.startTimer();
        var options: IExecOptions = {
            silent: false,
            outStream: this.outStream,
            errStream: this.outStream
        };
        let exitCode = -1;
        
        try {
            exitCode = await this.toolRunner.exec(options);
        } catch (error) {
            writeToOutStream(`Error executing command with EC=${exitCode}: ${error}`, this.outStream);
        }

        this.stopTimer();
        var res: ICommandResult = <ICommandResult>{ code: exitCode, output: this.getCleanedOutput() };
        return res;
    }

    /**
     * Starts the timer used to enforce the timeout.
     */
    private startTimer: () => void = () => {
        this.timer = setTimeout(() => {
            writeToOutStream(`Timeout reached. Killing process`, this.outStream);
            this.toolRunner.killChildProcess();
        }, this.timeout);
    };

    /**
     * Stops the timer used to enforce the timeout.
     */
    private stopTimer: () => void = () => {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    /**
     * Cleans up the output of the command execution by removing empty lines and trimming whitespace.
     * @returns The cleaned up output of the command execution.
     */
    private getCleanedOutput: () => string = () => {
        var cleanedOutput = [];
        Buffer.concat(this.chunks).toString().split(os.EOL).forEach((line) => {
            if (line) {
                cleanedOutput.push(line);
            }
        });
        return cleanedOutput.join(os.EOL).trim();
    }

    /**
     * Removes the [command] prefix from the output of the command execution.
     * @param output The output of the command execution.
     * @returns The output of the command execution without the command prefix.
     */
    public static removeCommandFromOutput(output: string): string {
        // Eg: [command]C:\Program Files\Docker\docker.exe --version
        return output.replace(/\[command\](.*)\s?/g, "").trim();
    }

}