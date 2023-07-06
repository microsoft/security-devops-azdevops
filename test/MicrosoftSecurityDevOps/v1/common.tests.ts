import { stagingDirectory } from '../../testCommon';
import * as path from 'path';
import * as assert from 'assert';
const common = require(path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'msdo-helpers'));
let Inputs = common.Inputs;
let CommandType = common.CommandType;

describe('Common module tests', function () {

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

    it('should get the correct encoded content', () => {
        const dockerVersion = "1.7.2";
        const taskVersion = "0.0.1";
        const events = "events:123";
        const images = "images:567";
        const expected = "MS43LjIKVmVyc2lvbjogMC4wLjEKOjo6RXZlbnRzOgpldmVudHM6MTIzCjo6OkltYWdlczoKaW1hZ2VzOjU2Nw==";
        const result = common.getEncodedContent(dockerVersion, events, images, taskVersion);
        assert.equal(result, expected, "encoded content didn't match");
    });
});