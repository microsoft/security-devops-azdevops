import { stagingDirectory, TestConstants } from '../../testCommon';
import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';
const helpers = require(path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'msdo-helpers'));
let Inputs = helpers.Inputs;
let CommandType = helpers.CommandType;

const conMapTestFile = path.join(__dirname, 'msdoMock.js');

describe('MicrosoftSecurityDevOps tests', function () {

    var curTime = new Date().toISOString();

    // Set the trace to true before running the tests.
    // This will enable debug messages to be logged in a file.
    this.beforeAll(() => {
        process.env[TestConstants.TaskTestTrace] = '1';
    });

    // Reset the environment variables for each test.
    this.afterEach(() => {
        delete process.env[TestConstants.MockReturnCode];
        delete process.env[helpers.Constants.PreJobStartTime];
        delete process.env[TestConstants.InputPrefix + Inputs.CommandType];
    }); 

    it('should process pre-job', function(done: Mocha.Done) {        
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PreJob;
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(conMapTestFile);
        tr.run();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('vso[task.setvariable variable='+ helpers.Constants.PreJobStartTime +';'), true, 
            "variable not set:" + tr.stdout);
        done();
    });

    it('should process post-job', function(done: Mocha.Done) {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime; 
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(conMapTestFile);
        tr.run();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('##vso[task.debug]'+ helpers.Constants.PreJobStartTime +'='+curTime), true, 
        "Task should have been processed: " + tr.stdout);
        done();
    });

    it('should always succeed if pre or post job', function(done: Mocha.Done) {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[TestConstants.MockReturnCode] = '100';
        process.env[helpers.Constants.PreJobStartTime] = new Date().toISOString();;
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(conMapTestFile);
        tr.run();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('Exit Code: 100'), true, "Exit code not present: " + tr.stdout);
        done();
    });

    it('should encode post-job output', function(done: Mocha.Done) {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(conMapTestFile);
        tr.run();
        var expectedEncodedOutput = helpers.getEncodedContent(TestConstants.Success, TestConstants.Success, TestConstants.Success);
        console.log("Expected encoded output: " + expectedEncodedOutput);
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained(expectedEncodedOutput), true, "Output should have been encoded:\n" + tr.stdout);
        done();
    });
});