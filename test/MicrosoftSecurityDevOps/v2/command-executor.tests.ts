import * as assert from 'assert';
import { CommandExecutor, ICommandResult } from '../../../src/MicrosoftSecurityDevOps/v2/command-executor';
import * as os from 'os';

describe('CommandExecutor Tests', () => {
    
    describe('Constructor', () => {
        it('should create instance with default timeout', () => {
            const executor = new CommandExecutor('echo', 'test');
            assert.ok(executor);
        });

        it('should create instance with custom timeout', () => {
            const executor = new CommandExecutor('echo', 'test', 5000);
            assert.ok(executor);
        });
    });

    describe('execute', () => {
        it('should execute simple command successfully', async () => {
            const executor = new CommandExecutor('echo', 'hello');
            const result: ICommandResult = await executor.execute();
            
            assert.equal(result.code, 0);
            assert.ok(result.output.includes('hello'));
        });

        it('should return non-zero exit code for failed command', async function() {
            this.timeout(5000);
            
            // Use a command that will fail on both Windows and Unix
            const isWindows = os.platform() === 'win32';
            const cmd = isWindows ? 'cmd' : 'sh';
            const args = isWindows ? '/c exit 1' : '-c "exit 1"';
            
            const executor = new CommandExecutor(cmd, args);
            const result: ICommandResult = await executor.execute();
            
            assert.notEqual(result.code, 0);
        });

        it('should capture output from command', async () => {
            const isWindows = os.platform() === 'win32';
            const cmd = isWindows ? 'cmd' : 'echo';
            const args = isWindows ? '/c echo test output' : 'test output';
            
            const executor = new CommandExecutor(cmd, args);
            const result: ICommandResult = await executor.execute();
            
            assert.ok(result.output);
            assert.ok(result.output.length > 0);
        });

        it('should handle timeout for long-running command', async function() {
            this.timeout(3000);
            
            const isWindows = os.platform() === 'win32';
            const cmd = isWindows ? 'timeout' : 'sleep';
            const args = isWindows ? '/t 10 /nobreak' : '10';
            
            const executor = new CommandExecutor(cmd, args, 500); // 500ms timeout
            const result: ICommandResult = await executor.execute();
            
            // The command should be killed due to timeout
            assert.ok(result.output.includes('Timeout') || result.code !== 0);
        });
    });

    describe('removeCommandFromOutput', () => {
        it('should remove command prefix from output', () => {
            const output = '[command]C:\\Program Files\\Docker\\docker.exe --version';
            const result = CommandExecutor.removeCommandFromOutput(output);
            
            assert.equal(result, '');
        });

        it('should handle output without command prefix', () => {
            const output = 'Docker version 20.10.7';
            const result = CommandExecutor.removeCommandFromOutput(output);
            
            assert.equal(result, 'Docker version 20.10.7');
        });

        it('should handle multiline output with command prefix', () => {
            const output = '[command]docker --version  \nDocker version 20.10.7';
            const result = CommandExecutor.removeCommandFromOutput(output);
            
            assert.ok(result.includes('Docker version'));
            assert.ok(!result.includes('[command]'));
        });

        it('should handle empty output', () => {
            const output = '';
            const result = CommandExecutor.removeCommandFromOutput(output);
            
            assert.equal(result, '');
        });

        it('should trim whitespace from result', () => {
            const output = '  [command]test  ';
            const result = CommandExecutor.removeCommandFromOutput(output);
            
            assert.equal(result, '');
        });
    });

    describe('Output Cleaning', () => {
        it('should produce cleaned output without empty lines', async () => {
            const executor = new CommandExecutor('echo', 'test');
            const result: ICommandResult = await executor.execute();
            
            // Cleaned output should not have excessive empty lines
            const lines = result.output.split(os.EOL);
            const emptyLines = lines.filter(line => line.trim() === '');
            
            // Should have minimal empty lines in cleaned output
            assert.ok(emptyLines.length <= lines.length / 2);
        });
    });
});
