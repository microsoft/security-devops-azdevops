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

async function runContainerMappingTask(): Promise<ttm.MockTestRunner> {
    const tr = new ttm.MockTestRunner(conMapTestFile);
    tr.nodePath = process.execPath;
    await tr.runAsync();
    return tr;
}

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
        delete process.env[TestConstants.MockResponses];
        delete process.env[helpers.Constants.PreJobStartTime];
        delete process.env[TestConstants.InputPrefix + Inputs.CommandType];
    }); 

    it('should process pre-job', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PreJob;
        const tr = await runContainerMappingTask();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('vso[task.setvariable variable='+ helpers.Constants.PreJobStartTime +';'), true, 
            "variable not set:\n" + tr.stdout);
    });

    it('should process post-job', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime; 
        const tr = await runContainerMappingTask();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.warningIssues.length, 0, 'should not warn on successful collection:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('##vso[task.debug]'+ helpers.Constants.PreJobStartTime +'='+curTime), true, 
        "Task should have been processed:\n" + tr.stdout);
    });

    it('should use structured actor IDs and preserve Docker event filters', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        const tr = await runContainerMappingTask();
        const eventsCommand = tr.stdout.split(/\r?\n/).find(line => line.startsWith('Mock command: docker events '));
        assert.ok(eventsCommand, 'Docker events command not captured:\n' + tr.stdout);
        assert.match(eventsCommand, /^Mock command: docker events --since \S+ --until \S+ --filter event=push --filter type=image --format ID=\{\{\.Actor\.ID\}\}$/);
        assert.equal(eventsCommand.includes(`--since ${curTime} --until `), true, 'should preserve the pre-job start time');
    });

    it('should always succeed if pre or post job', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        let mockResponse: TaskLibAnswerExecResult = {
            code: 100,
            stdout: TestConstants.Error + " Exit Code: 100"
        };
        process.env[TestConstants.MockResponse] = JSON.stringify(mockResponse);
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        const tr = await runContainerMappingTask();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.warningIssues.length, 1, 'should warn without failing:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('Exit Code: 100'), true, "Exit code not present:\n" + tr.stdout);
    });

    it('should warn without failing when Docker events cannot be fetched', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        const errorMessage = "Error parsing format: can't evaluate field ID in type *events.Message";
        process.env[TestConstants.MockResponses] = JSON.stringify({
            events: { code: 64, stdout: errorMessage }
        });
        const tr = await runContainerMappingTask();
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.warningIssues.length, 1, 'should emit one pipeline warning:\n' + tr.stdout);
        assert.equal(tr.warningIssues[0].includes('Unable to fetch Docker events: ' + errorMessage), true);
        assert.equal(tr.stdOutContained('Mock HTTP request body: {"dockerVersion":'), false, 'should not upload a failed collection');
    });

    it('should preserve multiple Docker events in the report and encoded output', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        const events = ['ID=registry.example.com/app:first', 'ID=registry.example.com/app:second'];
        const eventsOutput = events.join(os.EOL);
        process.env[TestConstants.MockResponses] = JSON.stringify({
            events: { code: 0, stdout: eventsOutput }
        });
        const tr = await runContainerMappingTask();
        const expectedReport = {
            dockerVersion: TestConstants.Success,
            dockerEvents: events,
            dockerImages: [TestConstants.Success]
        };
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.warningIssues.length, 0, 'should not warn:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('Mock HTTP request body: ' + JSON.stringify(expectedReport)), true, 'report should preserve event lines:\n' + tr.stdout);
        assert.equal(tr.stdOutContained(helpers.getEncodedContent(TestConstants.Success, eventsOutput, TestConstants.Success)), true, 'encoded output should preserve event lines:\n' + tr.stdout);
    });

    it('should encode post-job output', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        const tr = await runContainerMappingTask();
        var expectedEncodedOutput = helpers.getEncodedContent(TestConstants.Success, TestConstants.Success, TestConstants.Success);
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.stdOutContained(expectedEncodedOutput), true, "Output should have been encoded:\n" + tr.stdout);
    });

    it('should preserve the empty-events result without warning', async function() {
        process.env[TestConstants.InputPrefix + Inputs.CommandType] = CommandType.PostJob;
        process.env[helpers.Constants.PreJobStartTime] = curTime;
        let mockResponse: TaskLibAnswerExecResult = {
            code: 0
        };
        process.env[TestConstants.MockResponse] = JSON.stringify(mockResponse);
        const tr = await runContainerMappingTask();
        var expectedEncodedOutput = helpers.getEncodedContent(undefined, '', '');
        assert.equal(tr.succeeded, true, 'should have succeeded:\n' + tr.stdout);
        assert.equal(tr.warningIssues.length, 0, 'should not warn when there are no push events:\n' + tr.stdout);
        assert.equal(tr.stdOutContained('type=NoDockerEvents;name=NoDockerEvents;'), true, "Issue not reported:\n" + tr.stdout);
        assert.equal(tr.stdOutContained(expectedEncodedOutput), true, "Encoded output not present:\n" + tr.stdout);
    });
});