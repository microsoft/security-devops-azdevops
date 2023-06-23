import * as path from 'path';
import * as assert from 'assert';
import * as common from '../common';

describe('Common module tests', function () {

    it('should encode a string to base64', () => {
        const str = 'hello world';
        const expected = 'aGVsbG8gd29ybGQ=';
        const result = common.encode(str);
        assert.equal(result, expected);
    });

    it('should return the task version', () => {
        var goodTaskPath = path.join(__dirname, '..', '..', 'tests', 'payloads', 'GoodTask.json');
        assert.equal(common.getTaskVersion(goodTaskPath), "0.1.1", "version didn't match");
        assert.equal(common.getTaskVersion("randomWrongPath.json"), common.Constants.Unknown, "version should be undefined");
    });
});