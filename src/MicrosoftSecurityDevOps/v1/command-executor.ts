import { IExecOptions, ToolRunner } from "azure-pipelines-task-lib/toolrunner";
import { Writable } from "stream";
import { writeToOutStream } from "./msdo-helpers";
import os from 'os';

export interface ICommandResult {
    code: number;
    output: string;
}

export class CommandExecutor extends ToolRunner {
    private readonly timeout: number;
    private timer: NodeJS.Timeout;
    private chunks: Buffer[];
    private outStream: Writable;
    private readonly _name: string;
    
    constructor(toolName: string, argLine: string, timeout: number = 60000) {
        super(toolName);
        this.line(argLine);
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

    public async execute(): Promise<ICommandResult> {
        this.startTimer();
        // writeToOutStream(`Executing command: ${this._name} on ${new Date().toISOString()}`, this.outStream);
        var options: IExecOptions = {
            silent: false,
            outStream: this.outStream,
            errStream: this.outStream
        };
        let exitCode = -1;
        
        try {
            exitCode = await super.exec(options);
        } catch (error) {
            writeToOutStream(`Error executing command with EC=${exitCode}: ${error}`, this.outStream);
        }

        this.stopTimer();
        var res: ICommandResult = <ICommandResult>{ code: exitCode, output: this.getCleanedOutput() };
        return res;
    }

    private startTimer: () => void = () => {
        this.timer = setTimeout(() => {
            writeToOutStream(`Timeout reached. Killing process`, this.outStream);
            this.killChildProcess();
        }, this.timeout);
    };

    private stopTimer: () => void = () => {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    private getCleanedOutput: () => string = () => {
        var cleanedOutput = [];
        Buffer.concat(this.chunks).toString().split(os.EOL).forEach((line) => {
            if (line) {
                cleanedOutput.push(line);
            }
        });
        return cleanedOutput.join(os.EOL).trim();
    }

    public static removeCommandFromOutput(output: string): string {
        // Eg: [command]C:\Program Files\Docker\docker.exe --version
        return output.replace(/\[command\](.*)\s?/g, "").trim();
    }

}