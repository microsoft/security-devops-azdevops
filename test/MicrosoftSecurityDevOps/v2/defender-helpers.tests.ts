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
    validateModelPath,
    isUrl,
    validateModelUrl,
    setupDebugLogging,
    writeToOutStream,
    encode,
    getEncodedContent
} from '../../../src/MicrosoftSecurityDevOps/v2/defender-helpers';

describe('Defender Helpers Tests', () => {
    
    describe('validateScanType', () => {
        it('should return fs for valid filesystem input', () => {
            const result = validateScanType('fs');
            assert.equal(result, ScanType.FileSystem);
        });

        it('should return image for valid image input', () => {
            const result = validateScanType('image');
            assert.equal(result, ScanType.Image);
        });

        it('should return model for valid model input', () => {
            const result = validateScanType('model');
            assert.equal(result, ScanType.Model);
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

    describe('validateModelPath', () => {
        it('should return valid path that exists', () => {
            const validPath = process.cwd();
            const result = validateModelPath(validPath);
            assert.equal(result, validPath);
        });

        it('should throw error for empty path', () => {
            assert.throws(() => validateModelPath(''), /Model path cannot be empty/);
        });

        it('should throw error for whitespace only path', () => {
            assert.throws(() => validateModelPath('   '), /Model path cannot be empty/);
        });

        it('should throw error for non-existent path', () => {
            assert.throws(() => validateModelPath('/non/existent/model/path/xyz123'), /Model path does not exist/);
        });

        it('should trim whitespace from valid path', () => {
            const validPath = process.cwd();
            const result = validateModelPath(`  ${validPath}  `);
            assert.equal(result, validPath);
        });

        it('should return valid path that exists (directory)', () => {
            const validPath = process.cwd();
            const result = validateModelPath(validPath);
            assert.equal(result, validPath);
        });

        it('should return valid path that exists (file)', () => {
            // Use __dirname to navigate to project root since compiled tests run from test/lib/test/MicrosoftSecurityDevOps/v2/
            // Go up 5 levels: v2 -> MicrosoftSecurityDevOps -> test -> lib -> test -> project root
            const validPath = path.join(__dirname, '..', '..', '..', '..', '..', 'package.json');
            const result = validateModelPath(validPath);
            assert.equal(result, validPath);
        });

        // URL validation tests for model paths
        it('should accept valid HTTPS URL', () => {
            const url = 'https://huggingface.co/bert-base-uncased/resolve/main/pytorch_model.bin';
            const result = validateModelPath(url);
            assert.equal(result, url);
        });

        it('should accept valid HTTP URL', () => {
            const url = 'http://models.example.com/v1/models/model.safetensors';
            const result = validateModelPath(url);
            assert.equal(result, url);
        });

        it('should accept URL with port number', () => {
            const url = 'https://localhost:8080/models/test.onnx';
            const result = validateModelPath(url);
            assert.equal(result, url);
        });

        it('should accept URL with query parameters', () => {
            const url = 'https://storage.example.com/models/model.bin?token=abc123';
            const result = validateModelPath(url);
            assert.equal(result, url);
        });

        it('should trim whitespace from URL', () => {
            const url = '  https://example.com/model.bin  ';
            const result = validateModelPath(url);
            assert.equal(result, 'https://example.com/model.bin');
        });
    });

    describe('isUrl', () => {
        it('should return true for HTTPS URL', () => {
            assert.equal(isUrl('https://example.com/model'), true);
        });

        it('should return true for HTTP URL', () => {
            assert.equal(isUrl('http://example.com/model'), true);
        });

        it('should return true for HTTPS URL (case insensitive)', () => {
            assert.equal(isUrl('HTTPS://example.com/model'), true);
        });

        it('should return true for HTTP URL (case insensitive)', () => {
            assert.equal(isUrl('HTTP://example.com/model'), true);
        });

        it('should return false for local path', () => {
            assert.equal(isUrl('/path/to/model'), false);
        });

        it('should return false for Windows path', () => {
            assert.equal(isUrl('C:\\path\\to\\model'), false);
        });

        it('should return false for relative path', () => {
            assert.equal(isUrl('./models/model.bin'), false);
        });

        it('should return false for empty string', () => {
            assert.equal(isUrl(''), false);
        });

        it('should return false for null', () => {
            assert.equal(isUrl(null as any), false);
        });

        it('should return false for undefined', () => {
            assert.equal(isUrl(undefined as any), false);
        });

        it('should return false for ftp URL', () => {
            assert.equal(isUrl('ftp://example.com/model'), false);
        });

        it('should return false for file URL', () => {
            assert.equal(isUrl('file:///path/to/model'), false);
        });
    });

    describe('validateModelUrl', () => {
        it('should return valid HTTPS URL', () => {
            const url = 'https://example.com/model.bin';
            const result = validateModelUrl(url);
            assert.equal(result, url);
        });

        it('should return valid HTTP URL', () => {
            const url = 'http://example.com/model.bin';
            const result = validateModelUrl(url);
            assert.equal(result, url);
        });

        it('should accept URL with complex path', () => {
            const url = 'https://huggingface.co/org/repo/resolve/main/model.safetensors';
            const result = validateModelUrl(url);
            assert.equal(result, url);
        });

        it('should accept URL with query string', () => {
            const url = 'https://storage.example.com/model?sas=token123&version=1';
            const result = validateModelUrl(url);
            assert.equal(result, url);
        });

        it('should accept URL with port', () => {
            const url = 'https://localhost:3000/models/model.onnx';
            const result = validateModelUrl(url);
            assert.equal(result, url);
        });

        it('should throw error for invalid URL format', () => {
            assert.throws(() => validateModelUrl('not-a-valid-url'), /Invalid URL format/);
        });

        it('should throw error for ftp protocol', () => {
            assert.throws(() => validateModelUrl('ftp://example.com/model'), /Invalid URL protocol/);
        });

        it('should throw error for file protocol', () => {
            assert.throws(() => validateModelUrl('file:///path/to/model'), /Invalid URL protocol/);
        });

        it('should throw error for invalid URL', () => {
            assert.throws(() => validateModelUrl('not-a-valid-url'), /Invalid URL format/);
        });

        it('should throw error for malformed URL', () => {
            assert.throws(() => validateModelUrl('://missing-protocol.com/path'), /Invalid URL format/);
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

    describe('setupDebugLogging', () => {
        it('should not throw when enabled is true', () => {
            // Note: This test verifies no errors are thrown
            // The actual tl.setVariable call is mocked in the task-lib
            assert.doesNotThrow(() => setupDebugLogging(true));
        });

        it('should not throw when enabled is false', () => {
            assert.doesNotThrow(() => setupDebugLogging(false));
        });
    });
});