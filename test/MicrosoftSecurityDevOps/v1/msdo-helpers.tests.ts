import { stagingDirectory } from '../../testCommon';
import * as path from 'path';
import * as assert from 'assert';
import { Writable } from 'node:stream';
const helpers = require(path.join(stagingDirectory, 'MicrosoftSecurityDevOps', 'v1', 'msdo-helpers'));
import os from 'os';

describe('MSDO Helper tests', function () {

    it('should encode a string to base64', () => {
        const str = 'hello world';
        const expected = 'aGVsbG8gd29ybGQ=';
        const result = helpers.encode(str);
        assert.equal(result, expected);
    });

    it('should get the correct encoded content', () => {
        const dockerVersion = "1.7.2";
        const taskVersion = "0.0.1";
        const events = "events:123";
        const images = "images:567";
        const expected = "RG9ja2VyVmVyc2lvbjogMS43LjINCkRvY2tlckV2ZW50czoNCmV2ZW50czoxMjMNCkRvY2tlckltYWdlczoNCmltYWdlczo1Njc=";
        const result = helpers.getEncodedContent(dockerVersion, events, images, taskVersion);
        assert.equal(result, expected, "encoded content didn't match");
    });

    it('should write data to the output stream', () => {
        const writable = new Writable({
            write(chunk, encoding, callback) {
                assert.equal(chunk.toString(), 'test' + os.EOL);
                callback();
            }
        });

        helpers.writeToOutStream('test', writable);
    });

    it('should write data to the standard output stream if no output stream is specified', () => {
        const writable = new Writable({
            write(chunk, encoding, callback) {
                assert.equal(chunk.toString(), 'test' + os.EOL);
                callback();
            }
        });

        const stdoutWrite = process.stdout.write;
        process.stdout.write = writable.write.bind(writable);

        helpers.writeToOutStream('test');
        process.stdout.write = stdoutWrite;
    });
});