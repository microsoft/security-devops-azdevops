import { stagingDirectory, TestConstants } from '../../testCommon';
import { TaskLibAnswerExecResult } from 'azure-pipelines-task-lib/mock-answer';
import * as tmrm from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';
import { Readable, Writable } from 'stream';

let taskPath = path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'index.js');

let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

let successResponse: TaskLibAnswerExecResult = {
    code: 0,
    stdout: TestConstants.Success
};

let response: string = process.env[TestConstants.MockResponse];
let mockResponses: Record<string, TaskLibAnswerExecResult> = response ? JSON.parse(response) : {};

class ExecutorMock {
    private readonly response: TaskLibAnswerExecResult;

    constructor(toolName: string, argLine: string) {
        console.log(`[command]${toolName} ${argLine}`);
        this.response = mockResponses[argLine.split(' ')[0]] || successResponse;
    }

    public async execute() {
        return {code: this.response.code, output: this.response.stdout};
    }

    public static removeCommandFromOutput(output: string) : string {
        return output;
    }
}

tmr.registerMock('./command-executor', {
    CommandExecutor: ExecutorMock
});

tmr.registerMock('https', {
    request: (_uri, _options, callback) => new Writable({
        write(_chunk, _encoding, done) {
            done();
        },
        final(done) {
            const response = Object.assign(
                Readable.from([JSON.stringify({oidcToken: 'test-oidc-token'})]),
                {statusCode: 200, statusMessage: 'OK'}
            );
            callback(response);
            done();
        }
    })
});

tmr.run();
