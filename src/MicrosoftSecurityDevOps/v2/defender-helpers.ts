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
    // New input names (v2 task.json)
    Command = 'command',           // Scan type: fs, image, model
    Args = 'args',                 // Additional arguments
    FileSystemPath = 'fileSystemPath', // Filesystem path for fs scan
    ImageName = 'imageName',       // Container image name
    ModelPath = 'modelPath',       // Path to AI model
    Break = 'break',               // Fail on critical vulnerabilities
    Debug = 'debug',               // Enable debug logging
    PrSummary = 'pr-summary',      // Post vulnerability summary
    Policy = 'policy',             // Policy name (azuredevops, microsoft, none)
    
    // Legacy aliases for backward compatibility
    /** @deprecated Use Command instead */
    CommandType = 'command',
    /** @deprecated Use Command instead */
    ScanType = 'command',
    /** @deprecated Use Args instead */
    AdditionalArgs = 'args',
    /** @deprecated Use PrSummary instead */
    PublishSummary = 'pr-summary'
}

/*
* Enum for the possible values for the Inputs.Command (scan type, specified in task.json)
*/
export enum ScanType {
    FileSystem = 'fs',
    Image = 'image',
    Model = 'model'
}

/*
* Enum for the possible values for the Inputs.CommandType (specified in task.json)
* @deprecated - Kept for backward compatibility, use Inputs.Command with ScanType instead
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
export function validateFileSystemPath(fsPath: string): string {
    if (!fsPath || fsPath.trim() === '') {
        throw new Error('Filesystem path cannot be empty for filesystem scan');
    }
    
    const trimmedPath = fsPath.trim();
    
    // Check if path exists
    if (!fs.existsSync(trimmedPath)) {
        throw new Error(`Filesystem path does not exist: ${trimmedPath}`);
    }
    
    return trimmedPath;
}

/**
 * Checks if a given string is a URL (http:// or https://).
 *
 * @param input - The string to check
 * @returns True if the input is a URL, false otherwise
 */
export function isUrl(input: string): boolean {
    if (!input) {
        return false;
    }
    const lowercased = input.toLowerCase();
    return lowercased.startsWith('http://') || lowercased.startsWith('https://');
}

/**
 * Validates a URL for model scanning.
 *
 * @param url - The URL to validate
 * @returns The validated URL
 * @throws An error if the URL format is invalid
 */
export function validateModelUrl(url: string): string {
    try {
        const parsedUrl = new URL(url);
        
        // Ensure protocol is http or https
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            throw new Error(`Invalid URL protocol: ${parsedUrl.protocol}. Only http:// and https:// are supported.`);
        }
        
        // Ensure there's a hostname
        if (!parsedUrl.hostname) {
            throw new Error('URL must have a valid hostname.');
        }
        
        return url;
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error(`Invalid URL format: ${url}`);
        }
        throw error;
    }
}

/**
 * Validates the model path input for AI model scans.
 * Supports both local file paths and URLs (http:// or https://).
 *
 * @param modelPath - The model path or URL to validate
 * @returns The validated path or URL
 * @throws An error if the path/URL is invalid or (for local paths) doesn't exist
 */
export function validateModelPath(modelPath: string): string {
    if (!modelPath || modelPath.trim() === '') {
        throw new Error('Model path cannot be empty for model scan');
    }
    
    const trimmedPath = modelPath.trim();
    
    // Check if it's a URL - if so, validate as URL and return
    if (isUrl(trimmedPath)) {
        return validateModelUrl(trimmedPath);
    }
    
    // Local path validation
    // Check if path exists
    if (!fs.existsSync(trimmedPath)) {
        throw new Error(`Model path does not exist: ${trimmedPath}`);
    }
    
    // Check if it's a file or directory (both are valid for model paths)
    const stats = fs.statSync(trimmedPath);
    if (!stats.isFile() && !stats.isDirectory()) {
        throw new Error(`Model path must be a file or directory: ${trimmedPath}`);
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
 * Sets up debug logging for the task.
 * When enabled, sets the SYSTEM_DEBUG variable to enable verbose logging.
 *
 * @param enabled - Whether debug logging should be enabled
 */
export function setupDebugLogging(enabled: boolean): void {
    if (enabled) {
        tl.setVariable('SYSTEM_DEBUG', 'true');
        tl.debug('Debug logging enabled');
    }
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