import { stagingDirectory } from '../../testCommon';
import * as path from 'path';
import * as assert from 'assert';
const helpers = require(path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'msdo-helpers'));

describe('Common module tests', function () {

    it('should encode a string to base64', () => {
        const str = 'hello world';
        const expected = 'aGVsbG8gd29ybGQ=';
        const result = helpers.encode(str);
        assert.equal(result, expected);
    });

    it('should return the task version', () => {
        var goodTaskPath = path.join(__dirname, 'payloads', 'GoodTask.json');
        assert.equal(helpers.getTaskVersion(goodTaskPath), "1.7.2", "version didn't match");
        assert.equal(helpers.getTaskVersion("randomWrongPath.json"), helpers.Constants.Unknown, "version should be undefined");
    });

    it('should get the correct encoded content', () => {
        const dockerVersion = "1.7.2";
        const taskVersion = "0.0.1";
        const events = "events:123";
        const images = "images:567";
        const expected = "MS43LjIKVmVyc2lvbjogMC4wLjEKOjo6RXZlbnRzOgpldmVudHM6MTIzCjo6OkltYWdlczoKaW1hZ2VzOjU2Nw==";
        const result = helpers.getEncodedContent(dockerVersion, events, images, taskVersion);
        assert.equal(result, expected, "encoded content didn't match");
    });
});