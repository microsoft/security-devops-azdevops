import { stagingDirectory, TestConstants } from '../../testCommon';
import { TaskLibAnswerExecResult } from 'azure-pipelines-task-lib/mock-answer';
import * as tmrm from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';
import { EventEmitter } from 'events';

let taskPath = path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'index.js');

let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

let successResponse: TaskLibAnswerExecResult = {
    code: 0,
    stdout: TestConstants.Success
};

let response: string = process.env[TestConstants.MockResponse];
let mockResponse: TaskLibAnswerExecResult =  response ? JSON.parse(response) : successResponse; 
let responses: string = process.env[TestConstants.MockResponses];
let mockResponses: { [command: string]: TaskLibAnswerExecResult } = responses ? JSON.parse(responses) : {};

class ExecutorMock {
    private readonly response: TaskLibAnswerExecResult;

    constructor(toolName: string, argLine: string) {
        console.log(`Mock command: ${toolName} ${argLine}`);
        this.response = mockResponses[argLine.split(' ')[0]] || mockResponse;
    }

    public async execute() {
        return Promise.resolve({code: this.response.code, output: this.response.stdout});
    }

    public static removeCommandFromOutput(output: string) : string {
        return output;
    }
}

tmr.registerMock('./command-executor', {
    CommandExecutor: ExecutorMock
});

tmr.registerMock('https', {
    request: (_uri: string, _options: object, callback: (response: EventEmitter) => void) => {
        const response = Object.assign(new EventEmitter(), { statusCode: 200, statusMessage: 'OK' });
        return Object.assign(new EventEmitter(), {
            write: (data: string) => console.log('Mock HTTP request body: ' + data),
            end: () => {
                callback(response);
                response.emit('data', JSON.stringify({ oidcToken: 'mock-token' }));
                response.emit('end');
            }
        });
    }
});

tmr.run();
