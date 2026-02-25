import tl = require('azure-pipelines-task-lib/task');
import * as path from 'path';
import { ScanType, Inputs, validateScanType, validateImageName, validateModelPath, validateFileSystemPath, parseAdditionalArgs, setupDebugLogging } from './defender-helpers';
import { IMicrosoftDefenderCLI } from './defender-interface';
import { scanDirectory, scanImage } from '@microsoft/security-devops-azdevops-task-lib/defender-client';
import { postPipelineSummary } from './pipeline-summary';

/*
* Class for Microsoft Defender CLI functionality
*/
export class MicrosoftDefenderCLI implements IMicrosoftDefenderCLI {
    readonly succeedOnError: boolean;
    private prSummaryEnabled: boolean = true;

    constructor() {
        this.succeedOnError = false;
    }

    private async runDefenderCLI() {
        // Get debug setting early to enable verbose logging
        const debug = tl.getBoolInput(Inputs.Debug, false);
        if (debug) {
            setupDebugLogging(true);
            tl.debug('Debug logging enabled');
        }

        // Get and validate scan type using new 'command' input with 'fs' as default
        const command: string = tl.getInput(Inputs.Command) || 'fs';
        const scanType = validateScanType(command);
        
        // Get pr-summary flag (defaults to true per task.json)
        const prSummaryInput = tl.getBoolInput(Inputs.PrSummary, false);
        this.prSummaryEnabled = prSummaryInput !== undefined ? prSummaryInput : true;
        
        // Store pr-summary flag as pipeline variable for post-processing
        tl.setVariable('DefenderPrSummaryEnabled', this.prSummaryEnabled.toString());
        tl.debug(`PR Summary enabled: ${this.prSummaryEnabled}`);
        
        // Get and parse additional arguments using new 'args' input
        const argsInput = tl.getInput(Inputs.Args) || '';
        let additionalArgs = parseAdditionalArgs(argsInput);
        
        let target: string;
        
        // Get target based on scan type and validate
        switch (scanType) {
            case ScanType.FileSystem:
                // For filesystem scan, get path from input or use Build.SourcesDirectory
                const fileSystemPath = tl.getInput(Inputs.FileSystemPath, false) ||
                                       tl.getVariable('Build.SourcesDirectory') ||
                                       process.cwd();
                target = validateFileSystemPath(fileSystemPath);
                tl.debug(`Filesystem scan using directory: ${target}`);
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
        
        // Handle break on critical vulnerability checkbox
        const breakOnCritical = tl.getBoolInput(Inputs.Break, false);
        
        // Remove --defender-break from additional args if it was manually added
        additionalArgs = additionalArgs.filter(arg => arg !== '--defender-break');
        
        // Add --defender-break if the checkbox is checked
        if (breakOnCritical) {
            additionalArgs.push('--defender-break');
            tl.debug('Break on critical vulnerability enabled: adding --defender-break flag');
        }
        
        // Remove --defender-debug from additional args if it was manually added
        additionalArgs = additionalArgs.filter(arg => arg !== '--defender-debug');
        
        // Add --defender-debug if the debug checkbox is checked
        if (debug) {
            additionalArgs.push('--defender-debug');
            tl.debug('Debug mode enabled: adding --defender-debug flag');
        }
        
        // Determine successful exit codes
        let successfulExitCodes: number[] = [0];
        
        // Generate output path
        const outputPath = path.join(process.env.BUILD_STAGINGDIRECTORY || process.cwd(), 'defender.sarif');
        
        // Get policy from input, default to 'azuredevops'
        const policyInput: string = tl.getInput(Inputs.Policy) || 'azuredevops';
        let policy: string;
        if (policyInput === 'none') {
            policy = '';
        } else {
            policy = policyInput;
        }
        
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
            switch (scanType) {
                case ScanType.FileSystem:
                    await scanDirectory(target, policy, outputPath, successfulExitCodes, additionalArgs);
                    break;
                    
                case ScanType.Image:
                    await scanImage(target, policy, outputPath, successfulExitCodes, additionalArgs);
                    break;
                    
                case ScanType.Model:
                    // For model scanning, we need to use the underlying CLI directly since task-lib doesn't have scanModel()
                    await this.runModelScan(target, policy, outputPath, successfulExitCodes, additionalArgs);
                    break;
            }
            
            // Post pipeline summary if enabled
            if (this.prSummaryEnabled) {
                tl.debug('Posting pipeline summary...');
                await postPipelineSummary(outputPath, scanType, target);
            }
        } catch (error) {
            // Still try to post summary on error if enabled (for partial results)
            if (this.prSummaryEnabled) {
                try {
                    await postPipelineSummary(outputPath, scanType, target);
                } catch (summaryError) {
                    tl.debug(`Failed to post summary after error: ${summaryError}`);
                }
            }
            
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
        
        // Construct the command arguments: scan model <path> [--defender-policy <policy>] --defender-output <output>
        const args = [
            'scan',
            'model',
            modelPath,
        ];
        
        if (policy) {
            args.push('--defender-policy', policy);
        }
        
        args.push('--defender-output', outputPath);
        
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