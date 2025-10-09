import * as assert from 'assert';
import * as sinon from 'sinon';
import * as tl from 'azure-pipelines-task-lib/task';
import { MicrosoftDefenderCLI } from '../../../src/MicrosoftSecurityDevOps/v2/defender-cli';
import { ScanType, Inputs } from '../../../src/MicrosoftSecurityDevOps/v2/defender-helpers';

// Mock the defender-client module
const defenderClient = require('@microsoft/security-devops-azdevops-task-lib/defender-client');

describe('MicrosoftDefenderCLI Tests', () => {
    let getInputStub: sinon.SinonStub;
    let debugStub: sinon.SinonStub;
    let errorStub: sinon.SinonStub;
    let scanDirectoryStub: sinon.SinonStub;
    let scanImageStub: sinon.SinonStub;

    beforeEach(() => {
        getInputStub = sinon.stub(tl, 'getInput');
        debugStub = sinon.stub(tl, 'debug');
        errorStub = sinon.stub(tl, 'error');
        scanDirectoryStub = sinon.stub(defenderClient, 'scanDirectory');
        scanImageStub = sinon.stub(defenderClient, 'scanImage');
        
        // Setup environment variable
        process.env.BUILD_STAGINGDIRECTORY = '/tmp/staging';
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
        it('should execute filesystem scan successfully', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            assert.ok(scanDirectoryStub.calledWith(
                process.cwd(),
                'mdc',
                sinon.match.string,
                [0]
            ));
        });

        it('should throw error when filesystem path is missing', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(null);

            const cli = new MicrosoftDefenderCLI();
            
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

            const cli = new MicrosoftDefenderCLI();
            
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
            scanDirectoryStub.rejects(new Error('Scan failed'));

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
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.Image);
            getInputStub.withArgs(Inputs.ImageName, true).returns('nginx:latest');
            scanImageStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanImageStub.calledOnce);
            assert.ok(scanImageStub.calledWith(
                'nginx:latest',
                'mdc',
                sinon.match.string,
                [0]
            ));
        });

        it('should throw error when image name is missing', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.Image);
            getInputStub.withArgs(Inputs.ImageName, true).returns(null);

            const cli = new MicrosoftDefenderCLI();
            
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

            const cli = new MicrosoftDefenderCLI();
            
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
            scanImageStub.rejects(new Error('Image scan failed'));

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

    describe('Output Path Generation', () => {
        it('should use BUILD_STAGINGDIRECTORY when available', async () => {
            process.env.BUILD_STAGINGDIRECTORY = '/custom/staging';
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const outputPath = scanDirectoryStub.firstCall.args[2];
            assert.ok(outputPath.includes('/custom/staging'));
        });

        it('should use current working directory when BUILD_STAGINGDIRECTORY is not set', async () => {
            delete process.env.BUILD_STAGINGDIRECTORY;
            getInputStub.withArgs(Inputs.ScanType, true).returns(ScanType.FileSystem);
            getInputStub.withArgs(Inputs.FileSystemPath, true).returns(process.cwd());
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
            const outputPath = scanDirectoryStub.firstCall.args[2];
            assert.ok(outputPath.endsWith('defender.sarif'));
        });
    });

    describe('Scan Type Validation', () => {
        it('should throw error for invalid scan type', async () => {
            getInputStub.withArgs(Inputs.ScanType, true).returns('invalid-scan-type');

            const cli = new MicrosoftDefenderCLI();
            
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
            scanDirectoryStub.resolves();

            const cli = new MicrosoftDefenderCLI();
            await cli.run();

            assert.ok(scanDirectoryStub.calledOnce);
        });
    });
});
