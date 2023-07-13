import path from "path";
import fs from "fs";
import { IExecOptions } from "azure-pipelines-task-lib/toolrunner";
import tl = require('azure-pipelines-task-lib/task');
import os from 'os';
import { Writable } from "stream";


/**
 * Enum for the possible inputs for the task (specified in task.json)
 */
export enum Inputs {
    CommandType = 'command'
}

/*
* Enum for the possible values for the Inputs.CommandType (specified in task.json)
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
    Unknown = "unknown",
    PreJobStartTime = "PREJOBSTARTTIME"
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
        tl.debug("taskJsonPath: " + taskJsonPath);
        var taskJsonVersion = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8')).version;
        return taskJsonVersion.Major + "." + taskJsonVersion.Minor + "." + taskJsonVersion.Patch;
    } catch (error) {
        tl.debug("Error occurred while getting task version: " + error);
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
    var stdOut = cmdExecute.stdout || "";
    return stdOut.trim();
}

/**
 * Encodes a string to base64.
 * 
 * @param str - The string to encode.
 * @returns The base64 encoded string.
 */
export const encode = (str: string):string => Buffer.from(str, 'binary').toString('base64');

/**
 * Returns the encoded content of the Docker version, Docker events, and Docker images in the pre-defined format -
 * DockerVersion
 * Version: TaskVersion
 * <Delim>Events:
 * DockerEvents
 * <Delim>Images:
 * DockerImages
 * 
 * @param dockerVersion - The version of Docker.
 * @param dockerEvents - The Docker events.
 * @param dockerImages - The Docker images.
 * @param taskVersion - Optional version of the task. Defaults to the version in the task.json file.
 * @param sectionDelim - Optional delimiter to separate sections in the encoded content. Defaults to ":::".
 * @returns The encoded content of the Docker version, Docker events, and Docker images.
 */
export function getEncodedContent(
    dockerVersion: string,
    dockerEvents: string,
    dockerImages: string,
    taskVersion: string = getTaskVersion()
): string {
    let data : string[] = [];
    data.push("DV: " + dockerVersion);
    data.push("Version: " + taskVersion);
    data.push("Events:");
    data.push(dockerEvents);
    data.push("Images:");
    data.push(dockerImages);
    return encode(data.join(os.EOL));
}

/**
 * Writes the specified data to the specified output stream, followed by the platform-specific end-of-line character.
 * If no output stream is specified, the data is written to the standard output stream.
 * 
 * @param data - The data to write to the output stream.
 * @param outStream - Optional. The output stream to write the data to. Defaults to the standard output stream.
 */
export function writeToOutStream(data: string, outStream: Writable = process.stdout): void {
    outStream.write(data.trim() + os.EOL);
}