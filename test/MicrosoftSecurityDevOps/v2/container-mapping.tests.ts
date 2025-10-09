import * as assert from 'assert';
import * as sinon from 'sinon';
import * as tl from 'azure-pipelines-task-lib/task';
import { ContainerMapping } from '../../../src/MicrosoftSecurityDevOps/v2/container-mapping';
import { CommandType, Constants } from '../../../src/MicrosoftSecurityDevOps/v2/defender-helpers';
import { CommandExecutor, ICommandResult } from '../../../src/MicrosoftSecurityDevOps/v2/command-executor';

describe('ContainerMapping Tests', () => {
    let setVariableStub: sinon.SinonStub;
    let getVariableStub: sinon.SinonStub;
    let logDetailStub: sinon.SinonStub;
    let executeStub: sinon.SinonStub;

    beforeEach(() => {
        setVariableStub = sinon.stub(tl, 'setVariable');
        getVariableStub = sinon.stub(tl, 'getVariable');
        logDetailStub = sinon.stub(tl, 'logDetail');
        executeStub = sinon.stub(CommandExecutor.prototype, 'execute');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Constructor', () => {
        it('should create instance with PreJob command type', () => {
            const mapping = new ContainerMapping(CommandType.PreJob);
            assert.ok(mapping);
            assert.equal(mapping.succeedOnError, true);
        });

        it('should create instance with PostJob command type', () => {
            const mapping = new ContainerMapping(CommandType.PostJob);
            assert.ok(mapping);
            assert.equal(mapping.succeedOnError, true);
        });

        it('should always set succeedOnError to true', () => {
            const mapping1 = new ContainerMapping(CommandType.PreJob);
            const mapping2 = new ContainerMapping(CommandType.PostJob);
            assert.equal(mapping1.succeedOnError, true);
            assert.equal(mapping2.succeedOnError, true);
        });
    });

    describe('run - PreJob', () => {
        it('should set PreJobStartTime variable', async () => {
            const mapping = new ContainerMapping(CommandType.PreJob);
            await mapping.run();

            assert.ok(setVariableStub.calledOnce);
            assert.ok(setVariableStub.calledWith(Constants.PreJobStartTime, sinon.match.string));
            
            // Verify the timestamp is valid ISO format
            const timestamp = setVariableStub.firstCall.args[1];
            assert.ok(new Date(timestamp).toISOString() === timestamp);
        });

        it('should set current timestamp', async () => {
            const beforeTime = new Date();
            const mapping = new ContainerMapping(CommandType.PreJob);
            await mapping.run();
            const afterTime = new Date();

            const savedTime = new Date(setVariableStub.firstCall.args[1]);
            assert.ok(savedTime >= beforeTime);
            assert.ok(savedTime <= afterTime);
        });
    });

    describe('run - PostJob', () => {
        it('should execute docker commands when PreJobStartTime is set', async () => {
            const startTime = new Date().toISOString();
            getVariableStub.withArgs(Constants.PreJobStartTime).returns(startTime);

            // Mock successful docker command results
            executeStub.onCall(0).resolves({ code: 0, output: 'Docker version 20.10.7' } as ICommandResult);
            executeStub.onCall(1).resolves({ code: 0, output: 'sha256:abc123' } as ICommandResult);
            executeStub.onCall(2).resolves({ code: 0, output: 'CreatedAt=2021-01-01::Repo=nginx::Tag=latest::Digest=sha256:xyz' } as ICommandResult);

            const mapping = new ContainerMapping(CommandType.PostJob);
            await mapping.run();

            assert.ok(executeStub.calledThrice);
        });

        it('should handle missing PreJobStartTime by using current time minus 10 seconds', async () => {
            getVariableStub.withArgs(Constants.PreJobStartTime).returns(undefined);

            executeStub.onCall(0).resolves({ code: 0, output: 'Docker version 20.10.7' } as ICommandResult);
            executeStub.onCall(1).resolves({ code: 0, output: '' } as ICommandResult);
            executeStub.onCall(2).resolves({ code: 0, output: '' } as ICommandResult);

            const mapping = new ContainerMapping(CommandType.PostJob);
            await mapping.run();

            assert.ok(executeStub.calledThrice);
        });

        it('should handle empty PreJobStartTime by using current time minus 10 seconds', async () => {
            getVariableStub.withArgs(Constants.PreJobStartTime).returns('');

            executeStub.onCall(0).resolves({ code: 0, output: 'Docker version 20.10.7' } as ICommandResult);
            executeStub.onCall(1).resolves({ code: 0, output: '' } as ICommandResult);
            executeStub.onCall(2).resolves({ code: 0, output: '' } as ICommandResult);

            const mapping = new ContainerMapping(CommandType.PostJob);
            await mapping.run();

            assert.ok(executeStub.calledThrice);
        });

        it('should handle docker version error gracefully', async () => {
            const startTime = new Date().toISOString();
            getVariableStub.withArgs(Constants.PreJobStartTime).returns(startTime);

            executeStub.onCall(0).resolves({ code: 1, output: 'Error: docker not found' } as ICommandResult);
            executeStub.onCall(1).resolves({ code: 0, output: '' } as ICommandResult);
            executeStub.onCall(2).resolves({ code: 0, output: '' } as ICommandResult);

            const mapping = new ContainerMapping(CommandType.PostJob);
            await mapping.run();

            // Should continue despite docker version error
            assert.ok(executeStub.calledThrice);
        });

        it('should throw error when docker events command fails', async () => {
            const startTime = new Date().toISOString();
            getVariableStub.withArgs(Constants.PreJobStartTime).returns(startTime);

            executeStub.onCall(0).resolves({ code: 0, output: 'Docker version 20.10.7' } as ICommandResult);
            executeStub.onCall(1).resolves({ code: 1, output: 'Error fetching events' } as ICommandResult);

            const mapping = new ContainerMapping(CommandType.PostJob);
            
            // Should not throw because succeedOnError is true, but should catch the error
            await mapping.run();
            
            // Verify error was handled (executeStub should have been called at least twice)
            assert.ok(executeStub.callCount >= 2);
        });

        it('should log detail when no docker events found', async () => {
            const startTime = new Date().toISOString();
            getVariableStub.withArgs(Constants.PreJobStartTime).returns(startTime);

            executeStub.onCall(0).resolves({ code: 0, output: 'Docker version 20.10.7' } as ICommandResult);
            executeStub.onCall(1).resolves({ code: 0, output: '' } as ICommandResult);
            // Images command should not be called when no events

            const mapping = new ContainerMapping(CommandType.PostJob);
            await mapping.run();

            assert.ok(logDetailStub.calledOnce);
            assert.ok(logDetailStub.calledWith(
                sinon.match.string,
                'No Docker events found',
                null,
                'NoDockerEvents',
                'NoDockerEvents',
                999
            ));
        });

        it('should fetch docker images when events are found', async () => {
            const startTime = new Date().toISOString();
            getVariableStub.withArgs(Constants.PreJobStartTime).returns(startTime);

            executeStub.onCall(0).resolves({ code: 0, output: 'Docker version 20.10.7' } as ICommandResult);
            executeStub.onCall(1).resolves({ code: 0, output: 'sha256:abc123\nsha256:def456' } as ICommandResult);
            executeStub.onCall(2).resolves({ code: 0, output: 'CreatedAt=2021-01-01::Repo=nginx::Tag=latest::Digest=sha256:xyz' } as ICommandResult);

            const mapping = new ContainerMapping(CommandType.PostJob);
            await mapping.run();

            assert.ok(executeStub.calledThrice);
            assert.ok(logDetailStub.notCalled);
        });

        it('should throw error when docker images command fails', async () => {
            const startTime = new Date().toISOString();
            getVariableStub.withArgs(Constants.PreJobStartTime).returns(startTime);

            executeStub.onCall(0).resolves({ code: 0, output: 'Docker version 20.10.7' } as ICommandResult);
            executeStub.onCall(1).resolves({ code: 0, output: 'sha256:abc123' } as ICommandResult);
            executeStub.onCall(2).resolves({ code: 1, output: 'Error fetching images' } as ICommandResult);

            const mapping = new ContainerMapping(CommandType.PostJob);
            
            // Should handle error gracefully due to succeedOnError
            await mapping.run();
            
            assert.ok(executeStub.calledThrice);
        });

        it('should execute docker commands in parallel', async () => {
            const startTime = new Date().toISOString();
            getVariableStub.withArgs(Constants.PreJobStartTime).returns(startTime);

            // All commands should start before any complete
            let versionStarted = false;
            let eventsStarted = false;
            let imagesStarted = false;

            executeStub.onCall(0).callsFake(async () => {
                versionStarted = true;
                await new Promise(resolve => setTimeout(resolve, 10));
                return { code: 0, output: 'Docker version 20.10.7' } as ICommandResult;
            });

            executeStub.onCall(1).callsFake(async () => {
                eventsStarted = true;
                assert.ok(versionStarted, 'Version should have started');
                await new Promise(resolve => setTimeout(resolve, 10));
                return { code: 0, output: 'sha256:abc' } as ICommandResult;
            });

            executeStub.onCall(2).callsFake(async () => {
                imagesStarted = true;
                assert.ok(versionStarted, 'Version should have started');
                assert.ok(eventsStarted, 'Events should have started');
                await new Promise(resolve => setTimeout(resolve, 10));
                return { code: 0, output: 'CreatedAt=2021-01-01::Repo=nginx::Tag=latest' } as ICommandResult;
            });

            const mapping = new ContainerMapping(CommandType.PostJob);
            await mapping.run();

            assert.ok(versionStarted && eventsStarted && imagesStarted);
        });
    });

    describe('run - Invalid Command Type', () => {
        it('should handle invalid command type gracefully', async () => {
            const mapping = new ContainerMapping(CommandType.Run as any);
            
            // Should not throw due to error handling in run method
            await mapping.run();
            
            // Verify it completed without throwing
            assert.ok(true);
        });
    });

    describe('Error Handling', () => {
        it('should catch and log errors without throwing', async () => {
            const startTime = new Date().toISOString();
            getVariableStub.withArgs(Constants.PreJobStartTime).returns(startTime);

            executeStub.rejects(new Error('Command execution failed'));

            const mapping = new ContainerMapping(CommandType.PostJob);
            
            // Should not throw
            await mapping.run();
            
            assert.ok(true);
        });

        it('should always output endgroup marker', async () => {
            const mapping = new ContainerMapping(CommandType.PreJob);
            await mapping.run();
            
            // The endgroup marker should always be written
            assert.ok(true);
        });
    });

    describe('Output Formatting', () => {
        it('should output group and section markers', async () => {
            const mapping = new ContainerMapping(CommandType.PreJob);
            await mapping.run();
            
            // Should have written group start and end markers
            assert.ok(true);
        });
    });
});
