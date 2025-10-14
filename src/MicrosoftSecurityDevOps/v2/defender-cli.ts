import tl = require('azure-pipelines-task-lib/task');
import * as fs from 'fs';
import * as path from 'path';
import { ScanType, Inputs, CommandType, validateScanType, validateFileSystemPath, validateImageName, parseAdditionalArgs } from './defender-helpers';
import { IMicrosoftDefenderCLI } from './defender-interface';
import { scanDirectory, scanImage } from '@microsoft/security-devops-azdevops-task-lib/defender-client';

/*
* Class for Microsoft Defender CLI functionality
*/
export class MicrosoftDefenderCLI implements IMicrosoftDefenderCLI {
    private readonly commandType: CommandType;
    readonly succeedOnError: boolean;

    constructor(commandType: CommandType) {
        this.commandType = commandType;
        this.succeedOnError = false;
    }

    private async runDefenderCLI() {
        // Get and validate scan type
        const scanTypeInput: string = tl.getInput(Inputs.ScanType, true) || ScanType.FileSystem;
        const scanType = validateScanType(scanTypeInput);
        
        let target: string;
        
        // Get target based on scan type and validate
        switch (scanType) {
            case ScanType.FileSystem:
                const fileSystemPath = tl.getInput(Inputs.FileSystemPath, true);
                if (!fileSystemPath) {
                    throw new Error('Filesystem path is required for filesystem scan');
                }
                target = validateFileSystemPath(fileSystemPath);
                break;
                
            case ScanType.Image:
                const imageName = tl.getInput(Inputs.ImageName, true);
                if (!imageName) {
                    throw new Error('Image name is required for image scan');
                }
                target = validateImageName(imageName);
                break;
                
            default:
                throw new Error(`Unsupported scan type: ${scanType}`);
        }
        
        // Get and parse additional arguments
        const additionalArgsInput = tl.getInput(Inputs.AdditionalArgs, false);
        let additionalArgs = parseAdditionalArgs(additionalArgsInput);
        
        // Handle break on critical vulnerability checkbox
        const breakOnCritical = tl.getBoolInput(Inputs.Break, false);
        
        // Remove --defender-break from additional args if it was manually added
        additionalArgs = additionalArgs.filter(arg => arg !== '--defender-break');
        
        // Add --defender-break if the checkbox is checked
        if (breakOnCritical) {
            additionalArgs.push('--defender-break');
            tl.debug('Break on critical vulnerability enabled: adding --defender-break flag');
        }
        
        // Determine successful exit codes
        let successfulExitCodes: number[] = [0];
        
        // Generate output path
        const outputPath = path.join(process.env.BUILD_STAGINGDIRECTORY || process.cwd(), 'defender.sarif');
        const policy = 'mdc'; // Default policy
        
        // Log scan information
        tl.debug(`Scan Type: ${scanType}`);
        tl.debug(`Target: ${target}`);
        tl.debug(`Policy: ${policy}`);
        tl.debug(`Output Path: ${outputPath}`);
        if (additionalArgs.length > 0) {
            tl.debug(`Additional Arguments: ${additionalArgs.join(' ')}`);
        }
        
        // Set environment variable to indicate execution via extension
        process.env.Defender_Extension = 'true';
        tl.debug('Environment variable set: Defender_Extension=true');
        
        try {
            // Execute the appropriate scan function from task lib
            if (scanType === ScanType.FileSystem) {
                await scanDirectory(target, policy, outputPath, successfulExitCodes, additionalArgs);
            } else if (scanType === ScanType.Image) {
                await scanImage(target, policy, outputPath, successfulExitCodes, additionalArgs);
            }
            
        } catch (error) {
            tl.error(`Defender CLI execution failed: ${error}`);
            throw error;
        }
    }

    /*
    * Run the Defender CLI scan
    */
    async run() {
        await this.runDefenderCLI();
    }
}
