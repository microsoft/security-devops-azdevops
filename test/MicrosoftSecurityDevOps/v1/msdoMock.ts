import { stagingDirectory, TestConstants } from '../../testCommon';
import { TaskLibAnswerExecResult } from 'azure-pipelines-task-lib/mock-answer';
import * as tmrm from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

let taskPath = path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'index.js');

let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

let rc = process.env[TestConstants.MockReturnCode] || '0';
var response = <TaskLibAnswerExecResult>{
    code: +rc,
    stdout: +rc != 0 ? TestConstants.Error : TestConstants.Success
};

tmr.registerMockExport('execSync', () => response);
tmr.run();
