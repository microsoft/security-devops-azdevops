import { stagingDirectory, TestConstants } from '../../testCommon';
import * as path from 'path';
import * as assert from 'assert';
import * as os from 'os';
import * as ttm from 'azure-pipelines-task-lib/mock-test';
import { TaskLibAnswerExecResult } from 'azure-pipelines-task-lib/mock-answer';
const helpers = require(path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'msdo-helpers'));
let Inputs = helpers.Inputs;
let CommandType = helpers.CommandType;

const conMapTestFile = path.join(__dirname, 'msdoMock.js');

describe('Container Mapping tests', function () {

    var curTime = new Date().toISOString();

    async function runTask(): Promise<ttm.MockTestRunner> {
        const tr = new ttm.MockTestRunner(conMapTestFile);
        tr.nodePath = process.execPath;
        await tr.runAsync();
        assert.equal(tr.stderr, '', 'should not write errors:\n' + tr.stderr);
        return tr;
    }

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
        let tr = await runTask();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('vso[task.setvariable variable='+ helpers.Constants.PreJobStartTime +';'), true, 
            "variable not set:\n" + tr.stdout);
        assert.deepEqual(tr.warningIssues, []);
    });

    it('should process post-job', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime; 
        let tr = await runTask();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('##vso[task.debug]'+ helpers.Constants.PreJobStartTime +'='+curTime), true, 
        "Task should have been processed:\n" + tr.stdout);
        assert.equal(tr.stdOutContained('Container Mapping data sent successfully'), true, tr.stdout);
        assert.deepEqual(tr.warningIssues, []);
    });

    it('should warn and still succeed when Docker events fail', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        let mockResponse: TaskLibAnswerExecResult = {
            code: 100,
            stdout: TestConstants.Error + " Exit Code: 100"
        };
        process.env[TestConstants.MockResponse] = JSON.stringify({events: mockResponse});
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        let tr = await runTask();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.deepEqual(tr.warningIssues, [
            'Error in Container Mapping: Error: Unable to fetch Docker events: Error Exit Code: 100'
        ]);
        assert.deepEqual(tr.errorIssues, []);
        assert.equal(tr.stdOutContained('Container Mapping data sent successfully'), false, tr.stdout);
        assert.equal(tr.stdOutContained('##[endgroup]'), true, tr.stdout);
    });

    it('should warn and still succeed when Docker images fail', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        process.env[TestConstants.MockResponse] = JSON.stringify({
            images: {code: 1, stdout: 'Unable to connect to Docker'}
        });
        let tr = await runTask();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.deepEqual(tr.warningIssues, [
            'Error in Container Mapping: Error: Unable to fetch Docker images: Unable to connect to Docker'
        ]);
        assert.deepEqual(tr.errorIssues, []);
        assert.equal(tr.stdOutContained('Container Mapping data sent successfully'), false, tr.stdout);
        assert.equal(tr.stdOutContained('##[endgroup]'), true, tr.stdout);
    });

    it('should request Actor IDs and preserve the event report format', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        const dockerEvents = ['ID=sha256:first', 'ID=sha256:second'];
        process.env[TestConstants.MockResponse] = JSON.stringify({
            events: {code: 0, stdout: dockerEvents.join(os.EOL)}
        });
        let tr = await runTask();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.match(tr.stdout, new RegExp(
            `docker events --since ${curTime} --until \\S+ --filter event=push --filter type=image --format ID=\\{\\{\\.Actor\\.ID\\}\\}`
        ));
        assert.equal(tr.stdOutContained('--format ID={{.ID}}'), false, tr.stdout);
        assert.equal(tr.stdOutContained(helpers.getEncodedContent(
            TestConstants.Success, dockerEvents.join(os.EOL), TestConstants.Success
        )), true, tr.stdout);
        assert.equal(tr.stdOutContained(JSON.stringify({
            dockerVersion: TestConstants.Success,
            dockerEvents,
            dockerImages: [TestConstants.Success]
        })), true, tr.stdout);
        assert.equal(tr.stdOutContained('Container Mapping data sent successfully'), true, tr.stdout);
        assert.deepEqual(tr.warningIssues, []);
    });

    it('should encode post-job output', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        let tr = await runTask();
        var expectedEncodedOutput = helpers.getEncodedContent(TestConstants.Success, TestConstants.Success, TestConstants.Success);
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained(expectedEncodedOutput), true, "Output should have been encoded:\n" + tr.stdout);
    });

    it('should report no events without a warning', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        let mockResponse: TaskLibAnswerExecResult = {
            code: 0,
            stdout: ''
        };
        process.env[TestConstants.MockResponse] = JSON.stringify({events: mockResponse});
        let tr = await runTask();
        var expectedEncodedOutput = helpers.getEncodedContent(TestConstants.Success, '', '');
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('type=NoDockerEvents'), true, "Timeline detail not reported:\n" + tr.stdout);
        assert.equal(tr.stdOutContained(expectedEncodedOutput), true, "Encoded output not present:\n" + tr.stdout);
        assert.equal(tr.stdOutContained('Container Mapping data sent successfully'), true, tr.stdout);
        assert.deepEqual(tr.warningIssues, []);
    });
});