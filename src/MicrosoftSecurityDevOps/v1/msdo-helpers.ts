import path from "path";
import fs from "fs";
import { IExecOptions } from "azure-pipelines-task-lib/toolrunner";
import tl = require('azure-pipelines-task-lib/task');


/**
 * Enum for the possible inputs for the task
 */
export enum Inputs {
    CommandType = 'commandType'
}

/*
* Enum for the command type input
*/
export enum CommandType {
    PreJob = 'pre-job',
    PostJob = 'post-job',
    Run = 'run'
}

/**
 * Enum for defining constants used in the task.
 */
export enum Constants {
    // Unknown value
    Unknown = "unknown"
}

/**
 * Gets the version of the task by reading the task.json file.
 * 
 * @param taskPath - Optional path to the task.json file. If not provided, the function will look for it in the default location.
 * @returns The version of the task in the format "Major.Minor.Patch", or Constants.Unknown if an error occurs.
 */
export function getTaskVersion(taskPath?: string): string {
    try {
        // If the task path is not provided, use the current directory.
        var taskJsonPath = taskPath ? taskPath : path.join(__dirname, "task.json");
        console.log("taskJsonPath: " + taskJsonPath);
        var taskJsonVersion = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8')).version;
        return taskJsonVersion.Major + "." + taskJsonVersion.Minor + "." + taskJsonVersion.Patch;
    } catch (error) {
        console.log("Error occurred while getting task version: " + error);
        return Constants.Unknown;
    }
}

/**
 * Wrapper over the Task.execSync, Execute a command and return its stdout. 
 * Throw an error if the command fails.
 * 
 * @param cmd
 * @param args
 * @param options
 * @returns stdout of the command
 */
export function execTaskCmdSync(cmd: string, args: string[], options?: IExecOptions): string {
    var cmdExecute = tl.execSync(cmd, args, options);

    if (cmdExecute.code != 0) {
        throw new Error(`Failed to execute command: ${cmd} ${args}.
        Exit Code: ${cmdExecute.code}. 
        Stdout: ${cmdExecute.stdout}. 
        Stderr: ${cmdExecute.stderr}`);
    }

    return cmdExecute.stdout.trim();
}

/**
 * Encodes a string to base64.
 * 
 * @param str - The string to encode.
 * @returns The base64 encoded string.
 */
export const encode = (str: string):string => Buffer.from(str, 'binary').toString('base64');

/**
 * Environment variable name for the pre-job start time.
 */
export const preJobStartTime: string = "PREJOBSTARTTIME";