import tl = require('azure-pipelines-task-lib/task');
import * as fs from 'fs';
import * as path from 'path';
import { ScanType, Inputs, CommandType, validateScanType, validateFileSystemPath, validateImageName, validateModelPath, parseAdditionalArgs } from './defender-helpers';
import { IMicrosoftDefenderCLI } from './defender-interface';
import { scanDirectory, scanImage } from '@microsoft/security-devops-azdevops-task-lib/defender-client';
import { postPipelineSummary } from './pipeline-summary';

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
                
            case ScanType.Model:
                const modelPath = tl.getInput(Inputs.ModelPath, true);
                if (!modelPath) {
                    throw new Error('Model path is required for model scan');
                }
                target = validateModelPath(modelPath);
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
        
        // Handle debug mode checkbox
        const debugMode = tl.getBoolInput(Inputs.Debug, false);
        
        // Remove --defender-debug from additional args if it was manually added
        additionalArgs = additionalArgs.filter(arg => arg !== '--defender-debug');
        
        // Add --verbose if the debug checkbox is checked
        if (debugMode) {
            additionalArgs.push('--defender-debug');
            tl.debug('Debug mode enabled: adding --defender-debug flag');
        }
        
        // Handle publishSummary option (default true)
        const publishSummary = tl.getBoolInput(Inputs.PublishSummary, false) !== false;
        
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
            } else if (scanType === ScanType.Model) {
                // For model scanning, we need to use the underlying CLI directly since task-lib doesn't have scanModel()
                // The task-lib's scan function (internal) constructs: defender scan <scanType> <target> --defender-policy <policy> --defender-output <output>
                // We'll manually construct and run this command since we can't call the internal scan() function
                await this.runModelScan(target, policy, outputPath, successfulExitCodes, additionalArgs);
            }
            
            // Post pipeline summary if enabled
            if (publishSummary) {
                try {
                    await postPipelineSummary(outputPath, scanType, target);
                    tl.debug('Pipeline summary posted successfully');
                } catch (summaryError) {
                    tl.warning(`Failed to post pipeline summary: ${summaryError}`);
                }
            }
        } catch (error) {
            tl.error(`Defender CLI execution failed: ${error}`);
            throw error;
        }
    }

    /**
     * Runs a model scan using the Defender CLI directly.
     * This is needed because the task-lib doesn't export a scanModel() function.
     *
     * @param modelPath - Path to the AI model to scan
     * @param policy - Policy to use (e.g., 'mdc')
     * @param outputPath - Path to write SARIF output
     * @param successfulExitCodes - Array of exit codes considered successful
     * @param additionalArgs - Additional CLI arguments
     */
    private async runModelScan(
        modelPath: string,
        policy: string,
        outputPath: string,
        successfulExitCodes: number[],
        additionalArgs: string[]
    ): Promise<void> {
        // Get the Defender CLI path from environment (set by task-lib)
        const cliFilePath = process.env.DEFENDER_FILEPATH;
        
        if (!cliFilePath) {
            throw new Error('DEFENDER_FILEPATH environment variable is not set. Defender CLI may not be installed.');
        }
        
        // Construct the command arguments: scan model <path> --defender-policy <policy> --defender-output <output>
        const args = [
            'scan',
            'model',
            modelPath,
            '--defender-policy', policy,
            '--defender-output', outputPath
        ];
        
        // Append additional arguments if provided
        if (additionalArgs && additionalArgs.length > 0) {
            args.push(...additionalArgs);
            tl.debug(`Appending additional arguments: ${additionalArgs.join(' ')}`);
        }
        
        // Execute the Defender CLI
        const tool = tl.tool(cliFilePath);
        for (const arg of args) {
            tool.arg(arg);
        }
        
        // Check if system debug is enabled
        const systemDebug = tl.getVariable("system.debug");
        if (systemDebug === 'true') {
            tool.arg('--defender-debug');
        }
        
        tl.debug('Running Microsoft Defender CLI for model scan...');
        const options = {
            ignoreReturnCode: true
        };
        
        const exitCode = await tool.exec(options);
        
        // Check if exit code is successful
        let success = false;
        for (const successCode of successfulExitCodes) {
            if (exitCode === successCode) {
                success = true;
                break;
            }
        }
        
        if (!success) {
            throw new Error(`Defender CLI exited with an error exit code: ${exitCode}`);
        }
    }

    /*
    * Run the Defender CLI scan
    */
    async run() {
        await this.runDefenderCLI();
    }
}
