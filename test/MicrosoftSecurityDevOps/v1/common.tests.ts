import { stagingDirectory } from '../../testCommon';
import * as path from 'path';
import * as assert from 'assert';
let common;

describe('Common module tests', function () {
    before(async () => {
        common = await import(path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'common'));
    });

    it('should encode a string to base64', () => {
        const str = 'hello world';
        const expected = 'aGVsbG8gd29ybGQ=';
        const result = common.encode(str);
        assert.equal(result, expected);
    });

    it('should return the task version', () => {
        var goodTaskPath = path.join(__dirname, 'payloads', 'GoodTask.json');
        assert.equal(common.getTaskVersion(goodTaskPath), "1.7.2", "version didn't match");
        assert.equal(common.getTaskVersion("randomWrongPath.json"), common.Constants.Unknown, "version should be undefined");
    });
});