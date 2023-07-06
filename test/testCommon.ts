import * as path from 'path';

export const configuration = process.env.configuration || 'debug';

export const stagingDirectory = path.join(__dirname, '..', '..', 'lib', configuration);

export enum TestConstants {
    Success = 'Success',
    TaskTestTrace = 'TASK_TEST_TRACE',
    MockReturnCode = 'MOCK_RETURN_CODE',
    InputPrefix = 'INPUT_'
};