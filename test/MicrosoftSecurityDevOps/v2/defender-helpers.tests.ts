import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Writable } from 'stream';
import { 
    ScanType, 
    validateScanType, 
    validateFileSystemPath, 
    validateImageName, 
    writeToOutStream,
    encode,
    getEncodedContent
} from '../../../src/MicrosoftSecurityDevOps/v2/defender-helpers';

describe('Defender Helpers Tests', () => {
    
    describe('validateScanType', () => {
        it('should return filesystem for valid filesystem input', () => {
            const result = validateScanType('filesystem');
            assert.equal(result, ScanType.FileSystem);
        });

        it('should return image for valid image input', () => {
            const result = validateScanType('image');
            assert.equal(result, ScanType.Image);
        });

        it('should throw error for invalid scan type', () => {
            assert.throws(() => validateScanType('invalid'), /Invalid scan type: invalid/);
        });

        it('should throw error for null scan type', () => {
            assert.throws(() => validateScanType(null as any), /Invalid scan type/);
        });

        it('should throw error for undefined scan type', () => {
            assert.throws(() => validateScanType(undefined as any), /Invalid scan type/);
        });
    });

    describe('validateFileSystemPath', () => {
        it('should return valid path that exists', () => {
            const validPath = process.cwd();
            const result = validateFileSystemPath(validPath);
            assert.equal(result, validPath);
        });

        it('should throw error for empty path', () => {
            assert.throws(() => validateFileSystemPath(''), /Filesystem path cannot be empty/);
        });

        it('should throw error for whitespace only path', () => {
            assert.throws(() => validateFileSystemPath('   '), /Filesystem path cannot be empty/);
        });

        it('should throw error for non-existent path', () => {
            assert.throws(() => validateFileSystemPath('/non/existent/path/xyz123'), /Filesystem path does not exist/);
        });

        it('should trim whitespace from valid path', () => {
            const validPath = process.cwd();
            const result = validateFileSystemPath(`  ${validPath}  `);
            assert.equal(result, validPath);
        });
    });

    describe('validateImageName', () => {
        it('should return valid image name', () => {
            const result = validateImageName('nginx:latest');
            assert.equal(result, 'nginx:latest');
        });

        it('should return valid image name with registry', () => {
            const result = validateImageName('myregistry.com/myapp:v1.0');
            assert.equal(result, 'myregistry.com/myapp:v1.0');
        });

        it('should return valid image name without tag', () => {
            const result = validateImageName('nginx');
            assert.equal(result, 'nginx');
        });

        it('should return valid image name with underscores and hyphens', () => {
            const result = validateImageName('my_registry-test/my-app_v1:test-1.0');
            assert.equal(result, 'my_registry-test/my-app_v1:test-1.0');
        });

        it('should throw error for empty image name', () => {
            assert.throws(() => validateImageName(''), /Image name cannot be empty for image scan/);
        });

        it('should throw error for whitespace only image name', () => {
            assert.throws(() => validateImageName('   '), /Image name cannot be empty for image scan/);
        });

        it('should throw error for invalid image name format with @', () => {
            assert.throws(() => validateImageName('invalid@name'), /Invalid image name format/);
        });

        it('should throw error for invalid image name with special characters', () => {
            assert.throws(() => validateImageName('image$name'), /Invalid image name format/);
        });

        it('should trim whitespace from valid image name', () => {
            const result = validateImageName('  nginx:latest  ');
            assert.equal(result, 'nginx:latest');
        });
    });

    describe('writeToOutStream', () => {
        it('should write to default stdout', () => {
            // This test just ensures no errors are thrown
            writeToOutStream('test message');
        });

        it('should write to custom stream with EOL', () => {
            let output = '';
            const customStream = new Writable({
                write(chunk, encoding, callback) {
                    output += chunk.toString();
                    callback();
                }
            });

            writeToOutStream('test message', customStream);
            assert.equal(output, 'test message' + os.EOL);
        });

        it('should trim whitespace before writing', () => {
            let output = '';
            const customStream = new Writable({
                write(chunk, encoding, callback) {
                    output += chunk.toString();
                    callback();
                }
            });

            writeToOutStream('  test message  ', customStream);
            assert.equal(output, 'test message' + os.EOL);
        });
    });

    describe('encode', () => {
        it('should encode string to base64', () => {
            const result = encode('hello world');
            const expected = Buffer.from('hello world', 'binary').toString('base64');
            assert.equal(result, expected);
        });

        it('should encode empty string', () => {
            const result = encode('');
            const expected = Buffer.from('', 'binary').toString('base64');
            assert.equal(result, expected);
        });

        it('should encode special characters', () => {
            const result = encode('test@#$%^&*()');
            const expected = Buffer.from('test@#$%^&*()', 'binary').toString('base64');
            assert.equal(result, expected);
        });
    });

    describe('getEncodedContent', () => {
        it('should return properly formatted encoded content', () => {
            const dockerVersion = 'Docker version 20.10.7';
            const dockerEvents = 'event1\nevent2';
            const dockerImages = 'image1\nimage2';

            const result = getEncodedContent(dockerVersion, dockerEvents, dockerImages);
            
            // Decode to verify content
            const decoded = Buffer.from(result, 'base64').toString('binary');
            assert.ok(decoded.includes('DockerVersion: Docker version 20.10.7'));
            assert.ok(decoded.includes('DockerEvents:'));
            assert.ok(decoded.includes('event1'));
            assert.ok(decoded.includes('DockerImages:'));
            assert.ok(decoded.includes('image1'));
        });

        it('should handle empty docker data', () => {
            const result = getEncodedContent('', '', '');
            const decoded = Buffer.from(result, 'base64').toString('binary');
            assert.ok(decoded.includes('DockerVersion:'));
            assert.ok(decoded.includes('DockerEvents:'));
            assert.ok(decoded.includes('DockerImages:'));
        });
    });
});
