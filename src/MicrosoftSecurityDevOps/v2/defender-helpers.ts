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
    ScanType = 'scanType',
    FileSystemPath = 'fileSystemPath',
    ImageName = 'imageName',
    AdditionalArgs = 'additionalArgs'
}

/*
* Enum for the possible values for the Inputs.ScanType (specified in task.json)
*/
export enum ScanType {
    FileSystem = 'filesystem',
    Image = 'image'
}

/*
* Enum for CommandType - kept for ContainerMapping backward compatibility
* Note: This is no longer used in the main task execution flow
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
    PreJobStartTime = "PREJOBSTARTTIME",
    DefenderExecutable = "Defender"
}

/**
 * Validates the scan type input and returns the corresponding enum value.
 * 
 * @param scanTypeInput - The scan type input string
 * @returns The validated ScanType enum value
 * @throws An error if the scan type is invalid
 */
export function validateScanType(scanTypeInput: string): ScanType {
    const scanType = scanTypeInput as ScanType;
    if (!Object.values(ScanType).includes(scanType)) {
        throw new Error(`Invalid scan type: ${scanTypeInput}. Valid options are: ${Object.values(ScanType).join(', ')}`);
    }
    return scanType;
}

/**
 * Validates the filesystem path input for filesystem scans.
 * 
 * @param path - The filesystem path to validate
 * @returns The validated path
 * @throws An error if the path is invalid or doesn't exist
 */
export function validateFileSystemPath(path: string): string {
    if (!path || path.trim() === '') {
        throw new Error('Filesystem path cannot be empty for filesystem scan');
    }
    
    const trimmedPath = path.trim();
    
    // Check if path exists
    if (!fs.existsSync(trimmedPath)) {
        throw new Error(`Filesystem path does not exist: ${trimmedPath}`);
    }
    
    return trimmedPath;
}

/**
 * Validates the image name input for container image scans.
 * 
 * @param imageName - The container image name to validate
 * @returns The validated image name
 * @throws An error if the image name is invalid
 */
export function validateImageName(imageName: string): string {
    if (!imageName || imageName.trim() === '') {
        throw new Error('Image name cannot be empty for image scan');
    }
    
    const trimmedImageName = imageName.trim();
    
    // Basic validation for image name format
    // Allow alphanumeric, dots, hyphens, underscores, slashes, and colons
    const imageNameRegex = /^[a-zA-Z0-9._\-\/]+(?::[a-zA-Z0-9._\-]+)?$/;
    
    if (!imageNameRegex.test(trimmedImageName)) {
        throw new Error(`Invalid image name format: ${trimmedImageName}. Image name should follow container image naming conventions.`);
    }
    
    return trimmedImageName;
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
    dockerImages: string
): string {
    let data : string[] = [];
    data.push("DockerVersion: " + dockerVersion);
    data.push("DockerEvents:");
    data.push(dockerEvents);
    data.push("DockerImages:");
    data.push(dockerImages);
    return encode(data.join(os.EOL));
}

/**
 * Parses additional CLI arguments from a string into an array.
 * Handles quoted strings and splits on whitespace.
 * 
 * @param additionalArgs - The additional arguments string to parse
 * @returns Array of parsed arguments, or empty array if input is empty/null
 */
export function parseAdditionalArgs(additionalArgs: string | undefined): string[] {
    if (!additionalArgs || additionalArgs.trim() === '') {
        return [];
    }
    
    const args: string[] = [];
    const trimmedArgs = additionalArgs.trim();
    
    // Simple regex to match quoted strings or non-whitespace sequences
    // Matches: "quoted string" or 'quoted string' or non-whitespace
    const regex = /(?:[^\s"']+|"[^"]*"|'[^']*')+/g;
    const matches = trimmedArgs.match(regex);
    
    if (matches) {
        for (const match of matches) {
            // Remove surrounding quotes if present
            let arg = match;
            if ((arg.startsWith('"') && arg.endsWith('"')) || 
                (arg.startsWith("'") && arg.endsWith("'"))) {
                arg = arg.slice(1, -1);
            }
            args.push(arg);
        }
    }
    
    tl.debug(`Parsed additional arguments: ${JSON.stringify(args)}`);
    return args;
}
