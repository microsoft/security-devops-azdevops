import { stagingDirectory } from '../../testCommon';
import * as path from 'path';
import os from 'os';
import * as sinon from 'sinon';
import mockery from 'mockery';
import * as Q from 'q';
import * as assert from 'assert';
import * as mtr from 'azure-pipelines-task-lib/mock-toolrunner';
import { IExecOptions } from 'azure-pipelines-task-lib/toolrunner';
const MockToolRunner = mtr.ToolRunner;

describe('Command Executor tests', function () {

    let executor;

    before(function () {
        mockery.enable({ useCleanCache: true, warnOnUnregistered: false });
        mockery.registerMock('azure-pipelines-task-lib/toolrunner', mtr);  
        executor = require(path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'command-executor'));
    });

    after(function () {
        mockery.disable();
    });

    afterEach(function () {
        mockery.resetCache();
        sinon.restore();
    });


    it('should execute commands', function(done: Mocha.Done) {      
        sinon.stub(MockToolRunner.prototype, 'exec').resolves(0);
        let executorMock = new executor.CommandExecutor('testTool', 'testArg');
        executorMock.execute().then((result : typeof executor.ICommandResult) => {
            assert.equal(result.code, 0, "code should be 0");
        });
        done();
    });

    it('should report error', function(done: Mocha.Done) {
        var mockExec = sinon.stub(MockToolRunner.prototype, 'exec');
        mockExec.rejects('error');
        let executorMock = new executor.CommandExecutor('testTool', 'testArg');
        let res = executorMock.execute().then((result : typeof executor.ICommandResult) => {
            assert.equal(result.code, -1, "code should be -1");
            assert.equal(result.output.indexOf('Error executing command') >= 0, true, "output should contain error message");
        });
        done();
    });

    it('should kill command on timeout', function(done: Mocha.Done) {
        sinon.stub(MockToolRunner.prototype, 'exec').resolves(null);
        let executorMock = new executor.CommandExecutor('testTool', 'testArg', 100);
        let setTimeoutStub = sinon.stub(global, 'setTimeout');
        let clearnTimeoutStub = sinon.stub(global, 'clearTimeout');
        let res = executorMock.execute();
        sinon.assert.calledOnce(setTimeoutStub);    
        res.then((result : typeof executor.ICommandResult) => {
            assert.equal(result.code, null, "code should be null");
            sinon.assert.notCalled(clearnTimeoutStub);
        });
        done();
    });

    it('should remove command from output', function(done: Mocha.Done) {
        let testDockerVersion = 'Docker version 18.09.2, build 6247962';
        let testOutput = '[command]C:\\Program Files\\Docker\\docker.exe --version' + os.EOL + testDockerVersion + os.EOL;
        let cleanedOutput = executor.CommandExecutor.removeCommandFromOutput(testOutput);
        assert.equal(cleanedOutput, testDockerVersion, "Command line should be removed");
        done();
    });

    [
        { name: 'LF', output: 'ID=first\n\nID=second\n' },
        { name: 'CRLF', output: 'ID=first\r\n\r\nID=second\r\n' },
        { name: 'mixed', output: 'ID=first\r\n\nID=second\n' }
    ].forEach(({ name, output }) => {
        it(`should normalize ${name} output to platform line endings`, async function() {
            sinon.stub(MockToolRunner.prototype, 'exec').callsFake((options: IExecOptions) => {
                options.outStream.write(output);
                return Q.resolve(0);
            });
            const executorMock = new executor.CommandExecutor('testTool', 'testArg');
            const result = await executorMock.execute();
            assert.equal(result.code, 0);
            assert.equal(result.output, ['ID=first', 'ID=second'].join(os.EOL));
        });
    });
});