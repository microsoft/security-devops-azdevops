import { TaskLibAnswerExecResult } from 'azure-pipelines-task-lib/mock-answer';
import * as tmrm from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';


let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

var response = <TaskLibAnswerExecResult>{
    code: 0,
    stdout: 'Success'
};
tmr.registerMockExport('execSync', () => response);

tmr.run();