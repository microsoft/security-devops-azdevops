import { stagingDirectory, TestConstants } from '../../testCommon';
import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';
import { TaskLibAnswerExecResult } from 'azure-pipelines-task-lib/mock-answer';
const helpers = require(path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'msdo-helpers'));
let Inputs = helpers.Inputs;
let CommandType = helpers.CommandType;

const conMapTestFile = path.join(__dirname, 'msdoMock.js');

describe('Container Mapping tests', function () {

    var curTime = new Date().toISOString();

    // Set the trace to true before running the tests.
    // This will enable debug messages to be logged in a file.
    this.beforeAll(() => {
        process.env[TestConstants.TaskTestTrace] = '1';
    });

    // Reset the environment variables for each test.
    this.afterEach(() => {
        delete process.env[TestConstants.MockResponse];
        delete process.env[helpers.Constants.PreJobStartTime];
        delete process.env[TestConstants.InputPrefix + Inputs.CommandType];
    }); 

    it('should process pre-job', async function() {        
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PreJob;
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(conMapTestFile);
        await tr.runAsync();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('vso[task.setvariable variable='+ helpers.Constants.PreJobStartTime +';'), true, 
            "variable not set:\n" + tr.stdout);
    });

    it('should process post-job', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime; 
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(conMapTestFile);
        await tr.runAsync();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('##vso[task.debug]'+ helpers.Constants.PreJobStartTime +'='+curTime), true, 
        "Task should have been processed:\n" + tr.stdout);
    });

    it('should always succeed if pre or post job', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        let mockResponse: TaskLibAnswerExecResult = {
            code: 100,
            stdout: TestConstants.Error + " Exit Code: 100"
        };
        process.env[TestConstants.MockResponse] = JSON.stringify(mockResponse);
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(conMapTestFile);
        await tr.runAsync();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('Exit Code: 100'), true, "Exit code not present:\n" + tr.stdout);
    });

    it('should encode post-job output', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(conMapTestFile);
        await tr.runAsync();
        var expectedEncodedOutput = helpers.getEncodedContent(TestConstants.Success, TestConstants.Success, TestConstants.Success);
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained(expectedEncodedOutput), true, "Output should have been encoded:\n" + tr.stdout);
    });

    it('should not fetch images if no events', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        let mockResponse: TaskLibAnswerExecResult = {
            code: 0
        };
        process.env[TestConstants.MockResponse] = JSON.stringify(mockResponse);
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(conMapTestFile);
        await tr.runAsync();
        var expectedEncodedOutput = helpers.getEncodedContent(undefined, '', '');
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('NoDockerEvents'), true, "Issue not reported:\n" + tr.stdout);
        assert.equal(tr.stdOutContained(expectedEncodedOutput), true, "Encoded output not present:\n" + tr.stdout);
    });
});
