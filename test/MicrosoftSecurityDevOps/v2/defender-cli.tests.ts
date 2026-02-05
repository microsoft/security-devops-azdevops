import * as assert from 'assert';
import * as sinon from 'sinon';
import * as tl from 'azure-pipelines-task-lib/task';
import { MicrosoftDefenderCLI } from '../../../src/MicrosoftSecurityDevOps/v2/defender-cli';
import { ScanType, Inputs, CommandType } from '../../../src/MicrosoftSecurityDevOps/v2/defender-helpers';

// Mock the defender-client module
const defenderClient = require('@microsoft/security-devops-azdevops-task-lib/defender-client');

// Mock the pipeline-summary module
const pipelineSummary = require('../../../src/MicrosoftSecurityDevOps/v2/pipeline-summary');

describe('MicrosoftDefenderCLI Tests', () => {
    let getInputStub: sinon.SinonStub;
    let getBoolInputStub: sinon.SinonStub;
    let debugStub: sinon.SinonStub;
    let errorStub: sinon.SinonStub;
    let warningStub: sinon.SinonStub;
    let scanDirectoryStub: sinon.SinonStub;
    let scanImageStub: sinon.SinonStub;
    let postPipelineSummaryStub: sinon.SinonStub;

    beforeEach(() => {
        getInputStub = sinon.stub(tl, 'getInput');
        getBoolInputStub = sinon.stub(tl, 'getBoolInput');
        debugStub = sinon.stub(tl, 'debug');
        errorStub = sinon.stub(tl, 'error');
        warningStub = sinon.stub(tl, 'warning');
        scanDirectoryStub = sinon.stub(defenderClient, 'scanDirectory');
        scanImageStub = sinon.stub(defenderClient, 'scanImage');
        postPipelineSummaryStub = sinon.stub(pipelineSummary, 'postPipelineSummary');
        
        // Setup environment variable
        process.env.BUILD_STAGINGDIRECTORY = '/tmp/staging';
        
        // Default stub values for getBoolInput
        getBoolInputStub.withArgs(Inputs.Break, false).returns(false);
        getBoolInputStub.withArgs(Inputs.Debug, false).returns(false);
        getBoolInputStub.withArgs(Inputs.PublishSummary, false).returns(false);
    });

    afterEach(() => {
        sinon.restore();
        delete process.env.BUILD_STAGINGDIRECTORY;
    });

    describe('Constructor', () => {
        it('should create instance', () => {
            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            assert.ok(cli);
            assert.equal(cli.succeedOnError, false);
        });
    });

    describe('run - FileSystem Scan', () => {
        it('should execute filesystem scan successfully', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            assert.ok(scanDirectoryStub.calledWith(
                process.cwd(),
                'mdc',
                sinon.match.string,
                [0],
                sinon.match.array
            ));
        });

        it('should throw error when filesystem path is missing', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(null);

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            
            try {
                await cli.run();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.message.includes('Filesystem path is required'));
            }
        });

        it('should throw error when filesystem path does not exist', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns('/non/existent/path');

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            
            try {
                await cli.run();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.message.includes('does not exist'));
            }
        });

        it('should handle scan directory errors', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            scanDirectoryStub.rejects(new Error('Scan failed'));

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            
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
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.Image);
            getInputStub.withArgs(Inputs.ImageName, true).returns('nginx:latest');
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            scanImageStub.resolves();

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(scanImageStub.calledOnce);
            assert.ok(scanImageStub.calledWith(
                'nginx:latest',
                'mdc',
                sinon.match.string,
                [0],
                sinon.match.array
            ));
        });

        it('should throw error when image name is missing', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.Image);
            getInputStub.withArgs(Inputs.ImageName, true).returns(null);

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            
            try {
                await cli.run();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.message.includes('Image name is required'));
            }
        });

        it('should throw error for invalid image name format', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.Image);
            getInputStub.withArgs(Inputs.ImageName, true).returns('invalid@image');

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            
            try {
                await cli.run();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.message.includes('Invalid image name format'));
            }
        });

        it('should handle scan image errors', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.Image);
            getInputStub.withArgs(Inputs.ImageName, true).returns('nginx:latest');
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            scanImageStub.rejects(new Error('Image scan failed'));

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            
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
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.Model);
            getInputStub.withArgs(Inputs.ModelPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            assert.ok(scanDirectoryStub.calledWith(
                process.cwd(),
                'mdc',
                sinon.match.string,
                [0],
                sinon.match.array
            ));
        });

        it('should throw error when model path is missing', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.Model);
            getInputStub.withArgs(Inputs.ModelPath, true).returns(null);

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            
            try {
                await cli.run();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.message.includes('Model path is required'));
            }
        });

        it('should throw error when model path does not exist', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.Model);
            getInputStub.withArgs(Inputs.ModelPath, true).returns('/non/existent/model/path');

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            
            try {
                await cli.run();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.message.includes('does not exist'));
            }
        });

        it('should use scanDirectory function for model scan', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.Model);
            getInputStub.withArgs(Inputs.ModelPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            // Model scan uses scanDirectory, not scanImage
            assert.ok(scanDirectoryStub.calledOnce);
            assert.ok(scanImageStub.notCalled);
        });
    });

    describe('Debug Mode', () => {
        it('should add --defender-debug flag when debug is true', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            getBoolInputStub.withArgs(Inputs.Debug, false).returns(true);
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const additionalArgs = scanDirectoryStub.firstCall.args[4];
            assert.ok(additionalArgs.includes('--defender-debug'), 'Expected --defender-debug flag in additionalArgs');
        });

        it('should NOT add --defender-debug flag when debug is false', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            getBoolInputStub.withArgs(Inputs.Debug, false).returns(false);
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const additionalArgs = scanDirectoryStub.firstCall.args[4];
            assert.ok(!additionalArgs.includes('--defender-debug'), 'Expected --defender-debug flag to NOT be in additionalArgs');
        });

        it('should NOT add duplicate --defender-debug if already in additionalArgs', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns('--defender-debug --some-other-flag');
            getBoolInputStub.withArgs(Inputs.Debug, false).returns(true);
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const additionalArgs = scanDirectoryStub.firstCall.args[4] as string[];
            const debugCount = additionalArgs.filter(arg => arg === '--defender-debug').length;
            assert.equal(debugCount, 1, 'Expected exactly one --defender-debug flag');
        });

        it('should add --defender-debug flag for image scan when debug is true', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.Image);
            getInputStub.withArgs(Inputs.ImageName, true).returns('nginx:latest');
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            getBoolInputStub.withArgs(Inputs.Debug, false).returns(true);
            scanImageStub.resolves();

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(scanImageStub.calledOnce);
            const additionalArgs = scanImageStub.firstCall.args[4];
            assert.ok(additionalArgs.includes('--defender-debug'), 'Expected --defender-debug flag in additionalArgs for image scan');
        });

        it('should add --defender-debug flag for model scan when debug is true', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.Model);
            getInputStub.withArgs(Inputs.ModelPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            getBoolInputStub.withArgs(Inputs.Debug, false).returns(true);
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const additionalArgs = scanDirectoryStub.firstCall.args[4];
            assert.ok(additionalArgs.includes('--defender-debug'), 'Expected --defender-debug flag in additionalArgs for model scan');
        });
    });

    describe('Output Path Generation', () => {
        it('should use BUILD_STAGINGDIRECTORY when available', async () => {
            process.env.BUILD_STAGINGDIRECTORY = '/custom/staging';
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const outputPath = scanDirectoryStub.firstCall.args[2];
            assert.ok(outputPath.includes('/custom/staging'));
        });

        it('should use current working directory when BUILD_STAGINGDIRECTORY is not set', async () => {
            delete process.env.BUILD_STAGINGDIRECTORY;
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const outputPath = scanDirectoryStub.firstCall.args[2];
            assert.ok(outputPath.endsWith('defender.sarif'));
        });
    });

    describe('Scan Type Validation', () => {
        it('should throw error for invalid scan type', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns('invalid-scan-type');

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            
            try {
                await cli.run();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.message.includes('Invalid scan type'));
            }
        });

        it('should default to filesystem when scan type is not provided', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(null);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
        });
    });

    describe('Publish Summary Toggle', () => {
        it('should call postPipelineSummary when publishSummary is true', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            getBoolInputStub.withArgs(Inputs.PublishSummary, false).returns(true);
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves(true);

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(postPipelineSummaryStub.calledOnce, 'Expected postPipelineSummary to be called when publishSummary is true');
        });

        it('should NOT call postPipelineSummary when publishSummary is false', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            getBoolInputStub.withArgs(Inputs.PublishSummary, false).returns(false);
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves(true);

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(postPipelineSummaryStub.notCalled, 'Expected postPipelineSummary to NOT be called when publishSummary is false');
        });

        it('should call postPipelineSummary by default when publishSummary is not specified', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            // Return undefined to simulate input not being specified - defaults to true
            getBoolInputStub.withArgs(Inputs.PublishSummary, false).returns(undefined);
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves(true);

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(postPipelineSummaryStub.calledOnce, 'Expected postPipelineSummary to be called by default when not specified');
        });

        it('should continue task execution even if summary posting fails', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            getBoolInputStub.withArgs(Inputs.PublishSummary, false).returns(true);
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.rejects(new Error('Summary failed'));

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            // Should not throw - task should complete successfully despite summary failure
            await cli.run();

            assert.ok(postPipelineSummaryStub.calledOnce, 'Expected postPipelineSummary to be called');
            assert.ok(warningStub.called, 'Expected warning to be logged when summary posting fails');
        });

        it('should call postPipelineSummary with correct arguments', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            getInputStub.withArgs(Inputs.AdditionalArgs, false).returns(null);
            getBoolInputStub.withArgs(Inputs.PublishSummary, false).returns(true);
            scanDirectoryStub.resolves();
            postPipelineSummaryStub.resolves(true);

            const cli = new MicrosoftDefenderCLI(CommandType.Run);
            await cli.run();

            assert.ok(postPipelineSummaryStub.calledOnce);
            const callArgs = postPipelineSummaryStub.firstCall.args;
            // Verify outputPath, scanType, and target are passed
            assert.ok(callArgs[0].endsWith('defender.sarif'), 'Expected outputPath to end with defender.sarif');
            assert.equal(callArgs[1], ScanType.FileSystem, 'Expected scanType to be FileSystem');
            assert.equal(callArgs[2], process.cwd(), 'Expected target to be the filesystem path');
        });
    });
});
