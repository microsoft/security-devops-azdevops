import { stagingDirectory } from '../../testCommon';
import { TaskLibAnswerExecResult } from 'azure-pipelines-task-lib/mock-answer';
import * as tmrm from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';


let taskPath = path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'index.js');
let msdoHelpersPath = path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'msdo-helpers.js');

console.log("Mocking task path: " + taskPath);
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
let origHelper = require(msdoHelpersPath);
var helperMocks = Object.assign({}, origHelper);
helperMocks.getTaskVersion = function(_taskPath? : string) {
    console.log("Getting mock task version: 0.0.1");
    return "0.0.1";
};
// var commonMock = {
//     Inputs: origHelper.Inputs,
//     CommandType: origHelper.CommandType,
//     Constants: origHelper.Constants,
//     execTaskCmdSync: function (_command: string, _args: string[], _options: any) {
//         console.log("Mock execTaskCmdSync");
//         return "Success";
//     },
//     encode: function (_str: string) {
//         return origHelper.encode(_str);
//     },
//     preJobStartTime: origHelper.preJobStartTime,
//     getTaskVersion: function (_taskPath?: string) {
//         console.log("Getting mock task version: 0.0.1");
//         return "0.0.1";
//     }
// };

// tmr.registerMock('./msdo-helpers', helperMocks);
// tmr.registerMock('../msdo-helpers', helperMocks);

tmr.registerMockExport('execSync', () => <TaskLibAnswerExecResult>{
    code: 0,
    stdout: 'Success'
});
tmr.run();
