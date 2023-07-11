import { stagingDirectory, TestConstants } from '../../testCommon';
import { TaskLibAnswerExecResult } from 'azure-pipelines-task-lib/mock-answer';
import * as tmrm from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

let taskPath = path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'index.js');

let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

let successResponse: TaskLibAnswerExecResult = {
    code: 0,
    stdout: TestConstants.Success
};

let response: string = process.env[TestConstants.MockResponse];
let mockResponse: TaskLibAnswerExecResult =  response ? JSON.parse(response) : successResponse; 

var finalResponse = <TaskLibAnswerExecResult>{
    code: mockResponse.code,
    stdout: mockResponse.stdout,
};

tmr.registerMockExport('execSync', () => finalResponse);
tmr.run();
