import * as assert from 'assert';
import * as sinon from 'sinon';
import * as tl from 'azure-pipelines-task-lib/task';
import { MicrosoftDefenderCLI } from '../../../src/MicrosoftSecurityDevOps/v2/defender-cli';
import { ScanType, Inputs } from '../../../src/MicrosoftSecurityDevOps/v2/defender-helpers';

// Mock the defender-client module
const defenderClient = require('@microsoft/security-devops-azdevops-task-lib/defender-client');

// Mock the pipeline-summary module
const pipelineSummary = require('../../../src/MicrosoftSecurityDevOps/v2/pipeline-summary');

describe('MicrosoftDefenderCLI Tests', () => {
    let getInputStub: sinon.SinonStub;
    let getBoolInputStub: sinon.SinonStub;
    let setVariableStub: sinon.SinonStub;
    let debugStub: sinon.SinonStub;
    let errorStub: sinon.SinonStub;
    let warningStub: sinon.SinonStub;
    let scanDirectoryStub: sinon.SinonStub;
    let scanImageStub: sinon.SinonStub;
    let postPipelineSummaryStub: sinon.SinonStub;

    beforeEach(() => {
        getInputStub = sinon.stub(tl, 'getInput');
        getBoolInputStub = sinon.stub(tl, 'getBoolInput');
        setVariableStub = sinon.stub(tl, 'setVariable');
        debugStub = sinon.stub(tl, 'debug');
        errorStub = sinon.stub(tl, 'error');
        warningStub = sinon.stub(tl, 'warning');
        scanDirectoryStub = sinon.stub(defenderClient, 'scanDirectory');
        scanImageStub = sinon.stub(defenderClient, 'scanImage');
        postPipelineSummaryStub = sinon.stub(pipelineSummary, 'postPipelineSummary');
        
        // Setup environment variable
        process.env.BUILD_STAGINGDIRECTORY = '/tmp/staging';
        
        // Default stubs for boolean inputs
        getBoolInputStub.withArgs(Inputs.Debug, false).returns(false);
        getBoolInputStub.withArgs(Inputs.PrSummary, false).returns(true);
        getBoolInputStub.withArgs(Inputs.Break, false).returns(false);
    });

    afterEach(() => {
        sinon.restore();
        delete process.env.BUILD_STAGINGDIRECTORY;
    });

    describe('Constructor', () => {
        it('should create instance', () => {
            const cli = new MicrosoftDefenderCLI();
            assert.ok(cli);
            assert.equal(cli.succeedOnError, false);
        });
    });

    describe('run - FileSystem Scan', () => {
        it('should execute filesystem scan successfully with default command', async () => {
            // Command defaults to 'fs' when not provided
            getInputStub.withArgs(Inputs.Command).returns(null);
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            assert.ok(scanDirectoryStub.calledWith(
                process.cwd(),
                'azuredevops',
                sinon.match.string,
                [0],
                sinon.match.array
            ));
        });

        it('should execute filesystem scan with explicit fs command', async () => {
            getInputStub.withArgs(Inputs.Command).returns('fs');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
        });

        it('should handle scan directory errors', async () => {
            getInputStub.withArgs(Inputs.Command).returns('fs');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            scanDirectoryStub.rejects(new Error('Scan failed'));
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            
            try {
                await cli.run();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.message.includes('Scan failed'));
                assert.ok(errorStub.calledOnce);
            }
        });
    });

    describe('run - Image Scan', () => {
        it('should execute image scan successfully', async () => {
            getInputStub.withArgs(Inputs.Command).returns('image');
            getInputStub.withArgs(Inputs.ImageName, true).returns('nginx:latest');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            scanImageStub.resolves();
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanImageStub.calledOnce);
            assert.ok(scanImageStub.calledWith(
                'nginx:latest',
                'azuredevops',
                sinon.match.string,
                [0],
                sinon.match.array
            ));
        });

        it('should throw error when image name is missing', async () => {
            getInputStub.withArgs(Inputs.Command).returns('image');
            getInputStub.withArgs(Inputs.ImageName, true).returns(null);
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');

            const cli = new MicrosoftDefenderCLI();
            
            try {
                await cli.run();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.message.includes('Image name is required'));
            }
        });

        it('should throw error for invalid image name format', async () => {
            getInputStub.withArgs(Inputs.Command).returns('image');
            getInputStub.withArgs(Inputs.ImageName, true).returns('invalid@image');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');

            const cli = new MicrosoftDefenderCLI();
            
            try {
                await cli.run();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.message.includes('Invalid image name format'));
            }
        });

        it('should handle scan image errors', async () => {
            getInputStub.withArgs(Inputs.Command).returns('image');
            getInputStub.withArgs(Inputs.ImageName, true).returns('nginx:latest');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            scanImageStub.rejects(new Error('Image scan failed'));
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            
            try {
                await cli.run();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.message.includes('Image scan failed'));
                assert.ok(errorStub.calledOnce);
            }
        });
    });

    describe('run - Model Scan', () => {
        it('should execute model scan successfully', async () => {
            getInputStub.withArgs(Inputs.Command).returns('model');
            getInputStub.withArgs(Inputs.ModelPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            
            // Mock the tool for model scan
            const toolStub = {
                arg: sinon.stub().returnsThis(),
                exec: sinon.stub().resolves(0)
            };
            const toolSinonStub = sinon.stub(tl, 'tool').returns(toolStub as any);
            sinon.stub(tl, 'getVariable').returns(undefined);
            process.env.DEFENDER_FILEPATH = '/path/to/defender';
            
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            // Model scan uses runModelScan which calls tl.tool
            assert.ok(toolSinonStub.calledOnce);
            
            delete process.env.DEFENDER_FILEPATH;
        });

        it('should throw error when model path is missing', async () => {
            getInputStub.withArgs(Inputs.Command).returns('model');
            getInputStub.withArgs(Inputs.ModelPath, true).returns(null);
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');

            const cli = new MicrosoftDefenderCLI();
            
            try {
                await cli.run();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.message.includes('Model path is required'));
            }
        });
    });

    describe('Output Path Generation', () => {
        it('should use BUILD_STAGINGDIRECTORY when available', async () => {
            const stagingDir = process.platform === 'win32' ? 'C:\\custom\\staging' : '/custom/staging';
            process.env.BUILD_STAGINGDIRECTORY = stagingDir;
            getInputStub.withArgs(Inputs.Command).returns('fs');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const outputPath = scanDirectoryStub.firstCall.args[2];
            // Check that the output path contains the staging directory (platform-agnostic)
            assert.ok(outputPath.includes('custom') && outputPath.includes('staging'));
        });

        it('should use current working directory when BUILD_STAGINGDIRECTORY is not set', async () => {
            delete process.env.BUILD_STAGINGDIRECTORY;
            getInputStub.withArgs(Inputs.Command).returns('fs');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const outputPath = scanDirectoryStub.firstCall.args[2];
            assert.ok(outputPath.endsWith('defender.sarif'));
        });
    });

    describe('Scan Type Validation', () => {
        it('should throw error for invalid scan type', async () => {
            getInputStub.withArgs(Inputs.Command).returns('invalid-scan-type');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');

            const cli = new MicrosoftDefenderCLI();
            
            try {
                await cli.run();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.message.includes('Invalid scan type'));
            }
        });

        it('should default to filesystem when command is not provided', async () => {
            getInputStub.withArgs(Inputs.Command).returns(null);
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
        });
    });

    describe('Break on Critical Vulnerability', () => {
        it('should add --defender-break flag when break input is true', async () => {
            getInputStub.withArgs(Inputs.Command).returns('fs');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            getBoolInputStub.withArgs(Inputs.Break, false).returns(true);
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const additionalArgs = scanDirectoryStub.firstCall.args[4];
            assert.ok(additionalArgs.includes('--defender-break'));
        });

        it('should not add --defender-break flag when break input is false', async () => {
            getInputStub.withArgs(Inputs.Command).returns('fs');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            getBoolInputStub.withArgs(Inputs.Break, false).returns(false);
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const additionalArgs = scanDirectoryStub.firstCall.args[4];
            assert.ok(!additionalArgs.includes('--defender-break'));
        });
    });

    describe('Debug Mode', () => {
        it('should add --defender-debug flag when debug is true', async () => {
            getInputStub.withArgs(Inputs.Command).returns('fs');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            getBoolInputStub.withArgs(Inputs.Debug, false).returns(true);
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const additionalArgs = scanDirectoryStub.firstCall.args[4];
            assert.ok(additionalArgs.includes('--defender-debug'), 'Expected --defender-debug flag in additionalArgs');
        });

        it('should NOT add --defender-debug flag when debug is false', async () => {
            getInputStub.withArgs(Inputs.Command).returns('fs');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            getBoolInputStub.withArgs(Inputs.Debug, false).returns(false);
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const additionalArgs = scanDirectoryStub.firstCall.args[4];
            assert.ok(!additionalArgs.includes('--defender-debug'), 'Expected --defender-debug flag to NOT be in additionalArgs');
        });
    });

    describe('Additional Arguments', () => {
        it('should pass additional arguments to scan function', async () => {
            getInputStub.withArgs(Inputs.Command).returns('fs');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('--verbose --extra-arg');
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const additionalArgs = scanDirectoryStub.firstCall.args[4];
            assert.ok(additionalArgs.includes('--verbose'));
            assert.ok(additionalArgs.includes('--extra-arg'));
        });
    });

    describe('PR Summary', () => {
        it('should call postPipelineSummary when pr-summary is true', async () => {
            getInputStub.withArgs(Inputs.Command).returns('fs');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            getBoolInputStub.withArgs(Inputs.PrSummary, false).returns(true);
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(postPipelineSummaryStub.calledOnce, 'Expected postPipelineSummary to be called when pr-summary is true');
        });

        it('should NOT call postPipelineSummary when pr-summary is false', async () => {
            getInputStub.withArgs(Inputs.Command).returns('fs');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            getBoolInputStub.withArgs(Inputs.PrSummary, false).returns(false);
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(postPipelineSummaryStub.notCalled, 'Expected postPipelineSummary to NOT be called when pr-summary is false');
        });

        it('should call postPipelineSummary with correct arguments', async () => {
            getInputStub.withArgs(Inputs.Command).returns('fs');
            getInputStub.withArgs(Inputs.Policy).returns(null);
            getInputStub.withArgs(Inputs.Args).returns('');
            getBoolInputStub.withArgs(Inputs.PrSummary, false).returns(true);
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(postPipelineSummaryStub.calledOnce);
            const callArgs = postPipelineSummaryStub.firstCall.args;
            // Verify outputPath, scanType, and target are passed
            assert.ok(callArgs[0].endsWith('defender.sarif'), 'Expected outputPath to end with defender.sarif');
            assert.equal(callArgs[1], ScanType.FileSystem, 'Expected scanType to be FileSystem');
            assert.equal(callArgs[2], process.cwd(), 'Expected target to be the filesystem path');
        });
    
        describe('Policy Input', () => {
            it('should default policy to azuredevops when no input is provided', async () => {
                getInputStub.withArgs(Inputs.Command).returns('fs');
                getInputStub.withArgs(Inputs.Policy).returns(null);
                getInputStub.withArgs(Inputs.Args).returns('');
                scanDirectoryStub.resolves();
                postPipelineSummaryStub.resolves();
    
                const cli = new MicrosoftDefenderCLI();
                await cli.run();
    
                assert.ok(scanDirectoryStub.calledOnce);
                const policyArg = scanDirectoryStub.firstCall.args[1];
                assert.equal(policyArg, 'azuredevops', 'Expected default policy to be azuredevops');
            });
    
            it('should pass microsoft policy when selected', async () => {
                getInputStub.withArgs(Inputs.Command).returns('fs');
                getInputStub.withArgs(Inputs.Policy).returns('microsoft');
                getInputStub.withArgs(Inputs.Args).returns('');
                scanDirectoryStub.resolves();
                postPipelineSummaryStub.resolves();
    
                const cli = new MicrosoftDefenderCLI();
                await cli.run();
    
                assert.ok(scanDirectoryStub.calledOnce);
                const policyArg = scanDirectoryStub.firstCall.args[1];
                assert.equal(policyArg, 'microsoft', 'Expected policy to be microsoft');
            });
    
            it('should pass empty string when policy is none', async () => {
                getInputStub.withArgs(Inputs.Command).returns('fs');
                getInputStub.withArgs(Inputs.Policy).returns('none');
                getInputStub.withArgs(Inputs.Args).returns('');
                scanDirectoryStub.resolves();
                postPipelineSummaryStub.resolves();
    
                const cli = new MicrosoftDefenderCLI();
                await cli.run();
    
                assert.ok(scanDirectoryStub.calledOnce);
                const policyArg = scanDirectoryStub.firstCall.args[1];
                assert.equal(policyArg, '', 'Expected policy to be empty string when none is selected');
            });
    
            it('should pass policy to image scan', async () => {
                getInputStub.withArgs(Inputs.Command).returns('image');
                getInputStub.withArgs(Inputs.ImageName, true).returns('nginx:latest');
                getInputStub.withArgs(Inputs.Policy).returns('microsoft');
                getInputStub.withArgs(Inputs.Args).returns('');
                scanImageStub.resolves();
                postPipelineSummaryStub.resolves();
    
                const cli = new MicrosoftDefenderCLI();
                await cli.run();
    
                assert.ok(scanImageStub.calledOnce);
                const policyArg = scanImageStub.firstCall.args[1];
                assert.equal(policyArg, 'microsoft', 'Expected policy to be microsoft for image scan');
            });
    
            it('should not add --defender-policy flag for model scan when policy is none', async () => {
                getInputStub.withArgs(Inputs.Command).returns('model');
                getInputStub.withArgs(Inputs.ModelPath, true).returns(process.cwd());
                getInputStub.withArgs(Inputs.Policy).returns('none');
                getInputStub.withArgs(Inputs.Args).returns('');
    
                // Mock the tool for model scan
                const argCalls: string[] = [];
                const toolStub = {
                    arg: sinon.stub().callsFake((a: string) => { argCalls.push(a); return toolStub; }),
                    exec: sinon.stub().resolves(0)
                };
                sinon.stub(tl, 'tool').returns(toolStub as any);
                sinon.stub(tl, 'getVariable').returns(undefined);
                process.env.DEFENDER_FILEPATH = '/path/to/defender';
                postPipelineSummaryStub.resolves();
    
                const cli = new MicrosoftDefenderCLI();
                await cli.run();
    
                assert.ok(!argCalls.includes('--defender-policy'), 'Expected --defender-policy to NOT be in args when policy is none');
                
                delete process.env.DEFENDER_FILEPATH;
            });
    
            it('should add --defender-policy flag for model scan when policy is set', async () => {
                getInputStub.withArgs(Inputs.Command).returns('model');
                getInputStub.withArgs(Inputs.ModelPath, true).returns(process.cwd());
                getInputStub.withArgs(Inputs.Policy).returns('azuredevops');
                getInputStub.withArgs(Inputs.Args).returns('');
    
                // Mock the tool for model scan
                const argCalls: string[] = [];
                const toolStub = {
                    arg: sinon.stub().callsFake((a: string) => { argCalls.push(a); return toolStub; }),
                    exec: sinon.stub().resolves(0)
                };
                sinon.stub(tl, 'tool').returns(toolStub as any);
                sinon.stub(tl, 'getVariable').returns(undefined);
                process.env.DEFENDER_FILEPATH = '/path/to/defender';
                postPipelineSummaryStub.resolves();
    
                const cli = new MicrosoftDefenderCLI();
                await cli.run();
    
                assert.ok(argCalls.includes('--defender-policy'), 'Expected --defender-policy to be in args when policy is azuredevops');
                const policyIndex = argCalls.indexOf('--defender-policy');
                assert.equal(argCalls[policyIndex + 1], 'azuredevops', 'Expected policy value to be azuredevops');
                
                delete process.env.DEFENDER_FILEPATH;
            });
        });
    });
});