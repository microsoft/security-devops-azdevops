# Visual Studio Code Debugging Guide for Microsoft Defender CLI V2 Task

## Overview
This guide shows you how to debug the Microsoft Defender CLI V2 task integration using Visual Studio Code's built-in Node.js debugger.

## Prerequisites
- Visual Studio Code
- Node.js debugging extension (usually built-in)
- Microsoft Defender CLI V2 task built and ready

## Debug Configuration

### 1. Create VS Code Launch Configuration

Create `.vscode/launch.json` in the project root:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug V2 Task - Filesystem Scan",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/lib/debug/MicrosoftSecurityDevOps/v2/index.js",
            "console": "integratedTerminal",
            "env": {
                "AGENT_ROOTDIRECTORY": "${workspaceFolder}",
                "BUILD_STAGINGDIRECTORY": "${workspaceFolder}/temp",
                "SYSTEM_DEBUG": "true",
                "INPUT_COMMAND": "run",
                "INPUT_SCANTYPE": "filesystem",
                "INPUT_FILESYSTEMPATH": "${workspaceFolder}/src",
                "INPUT_PUBLISH": "false",
                "INPUT_BREAK": "false"
            },
            "cwd": "${workspaceFolder}",
            "stopOnEntry": false,
            "sourceMaps": true
        },
        {
            "name": "Debug V2 Task - Container Image Scan",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/lib/debug/MicrosoftSecurityDevOps/v2/index.js",
            "console": "integratedTerminal",
            "env": {
                "AGENT_ROOTDIRECTORY": "${workspaceFolder}",
                "BUILD_STAGINGDIRECTORY": "${workspaceFolder}/temp",
                "SYSTEM_DEBUG": "true",
                "INPUT_COMMAND": "run",
                "INPUT_SCANTYPE": "image",
                "INPUT_IMAGENAME": "nginx:latest",
                "INPUT_PUBLISH": "false",
                "INPUT_BREAK": "false"
            },
            "cwd": "${workspaceFolder}",
            "stopOnEntry": false,
            "sourceMaps": true
        },
        {
            "name": "Debug V2 Task - Custom Configuration",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/lib/debug/MicrosoftSecurityDevOps/v2/index.js",
            "console": "integratedTerminal",
            "env": {
                "AGENT_ROOTDIRECTORY": "${workspaceFolder}",
                "BUILD_STAGINGDIRECTORY": "${workspaceFolder}/temp",
                "SYSTEM_DEBUG": "true",
                "INPUT_COMMAND": "run",
                "INPUT_SCANTYPE": "filesystem",
                "INPUT_FILESYSTEMPATH": "C:\\temp\\test-project",
                "INPUT_PUBLISH": "true",
                "INPUT_ARTIFACTNAME": "SecurityScans",
                "INPUT_BREAK": "false"
            },
            "cwd": "${workspaceFolder}",
            "stopOnEntry": false,
            "sourceMaps": true
        }
    ]
}
```

### 2. Create VS Code Tasks Configuration

Create `.vscode/tasks.json` for build automation:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Build Extension (Debug)",
            "type": "shell",
            "command": "dotnet",
            "args": [
                "build",
                "./build.proj",
                "/p:Sideload=true",
                "/p:Configuration=debug"
            ],
            "group": {
                "kind": "build",
                "isDefault": true
            },
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "shared"
            },
            "problemMatcher": []
        },
        {
            "label": "Build Task-Lib",
            "type": "shell",
            "command": "npm",
            "args": ["run", "build"],
            "group": "build",
            "options": {
                "cwd": "../security-devops-azdevops-task-lib"
            },
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "shared"
            }
        },
        {
            "label": "Create Temp Directory",
            "type": "shell",
            "command": "mkdir",
            "args": ["-p", "temp"],
            "windows": {
                "command": "powershell",
                "args": ["-Command", "New-Item -ItemType Directory -Force -Path temp"]
            },
            "group": "build"
        }
    ]
}
```

## Debugging Steps

### Step 1: Prepare Environment
1. **Build the extension first**:
   ```bash
   dotnet build ./build.proj /p:Sideload=true /p:Configuration=debug
   ```

2. **Create temp directory**:
   ```bash
   mkdir temp  # On Windows: md temp
   ```

### Step 2: Set Breakpoints
1. Open the V2 task files in VS Code:
   - `src/MicrosoftSecurityDevOps/v2/index.ts`
   - `src/MicrosoftSecurityDevOps/v2/defender-cli.ts`
   - `src/MicrosoftSecurityDevOps/v2/defender-client.ts`
   - `src/MicrosoftSecurityDevOps/v2/defender-helpers.ts`

2. Set breakpoints in key locations:
   - **Entry point**: `index.ts` - `run()` function
   - **Command processing**: `defender-cli.ts` - `runDefenderCLI()` method
   - **Argument generation**: `defender-helpers.ts` - `getDefenderArgs()` function
   - **CLI execution**: `defender-client.ts` - `DefenderClient.run()` method

### Step 3: Start Debugging
1. **Open VS Code Debug Panel**: `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac)

2. **Select Debug Configuration**:
   - Choose "Debug V2 Task - Filesystem Scan" for filesystem scanning
   - Choose "Debug V2 Task - Container Image Scan" for image scanning
   - Choose "Debug V2 Task - Custom Configuration" for custom scenarios

3. **Start Debugging**: Press `F5` or click the green play button

### Step 4: Debug Features Available
- **Step Through Code**: `F10` (Step Over), `F11` (Step Into), `Shift+F11` (Step Out)
- **Variable Inspection**: Hover over variables or check the Variables panel
- **Watch Expressions**: Add expressions to monitor in the Watch panel
- **Call Stack**: View the execution path in the Call Stack panel
- **Debug Console**: Execute code and inspect objects during debugging

## Common Debug Scenarios

### 1. Debug Argument Generation
**Breakpoint Location**: `defender-helpers.ts` - `getDefenderArgs()` function

**What to Inspect**:
- `scanType` parameter value
- `target` parameter value
- Generated `args` array
- Function return value

### 2. Debug CLI Execution
**Breakpoint Location**: `defender-client.ts` - `DefenderClient.run()` method

**What to Inspect**:
- `args` parameter (command line arguments)
- `scanType` determination logic
- `target` extraction logic
- Task-lib function calls

### 3. Debug Input Processing
**Breakpoint Location**: `defender-cli.ts` - `runDefenderCLI()` method

**What to Inspect**:
- Task input values (`scanTypeInput`, `fileSystemPath`, `imageName`)
- Validation results
- Generated arguments before CLI call

### 4. Debug Task Entry Point
**Breakpoint Location**: `index.ts` - `run()` function

**What to Inspect**:
- Command type determination
- Defender runner instantiation
- Error handling flow

## Environment Variables for Testing

### Filesystem Scan Debug Environment:
```bash
AGENT_ROOTDIRECTORY=D:\DfdRepo\Security-devops-azdevops
BUILD_STAGINGDIRECTORY=D:\DfdRepo\Security-devops-azdevops\temp
SYSTEM_DEBUG=true
INPUT_COMMAND=run
INPUT_SCANTYPE=filesystem
INPUT_FILESYSTEMPATH=D:\DfdRepo\Security-devops-azdevops\src
INPUT_PUBLISH=false
INPUT_BREAK=false
```

### Container Image Scan Debug Environment:
```bash
AGENT_ROOTDIRECTORY=D:\DfdRepo\Security-devops-azdevops
BUILD_STAGINGDIRECTORY=D:\DfdRepo\Security-devops-azdevops\temp
SYSTEM_DEBUG=true
INPUT_COMMAND=run
INPUT_SCANTYPE=image
INPUT_IMAGENAME=nginx:latest
INPUT_PUBLISH=false
INPUT_BREAK=false
```

## Debugging Tips

### 1. Source Maps
- Ensure TypeScript source maps are enabled for proper debugging experience
- The debug configuration includes `"sourceMaps": true`

### 2. Console Output
- Use `console.log()` or `tl.debug()` for additional logging
- The integrated terminal will show all output

### 3. Environment Simulation
- The debug configuration simulates Azure DevOps environment variables
- Modify environment variables in launch.json for different test scenarios

### 4. Live Debugging
- You can modify environment variables during debugging
- Use the Debug Console to inspect and modify variables

### 5. Conditional Breakpoints
- Right-click on breakpoints to add conditions
- Useful for debugging specific scenarios (e.g., only when `scanType === 'image'`)

## Troubleshooting Debug Issues

### Issue: Breakpoints Not Hit
**Solutions**:
1. Ensure the extension is built with debug configuration
2. Verify source maps are generated and accessible
3. Check that the correct entry point is specified in launch.json

### Issue: Environment Variables Not Working
**Solutions**:
1. Verify environment variable names match Azure DevOps task input names
2. Check that the task is reading inputs correctly
3. Use the Debug Console to inspect `process.env`

### Issue: Module Not Found Errors
**Solutions**:
1. Ensure all dependencies are installed (`npm install`)
2. Verify the task-lib is built and accessible
3. Check import paths in TypeScript files

## Advanced Debugging

### 1. Debug with Real CLI
- Set `DEFENDER_FILEPATH` environment variable to point to actual CLI executable
- Debug the full integration end-to-end

### 2. Debug Task-Lib Integration
- Create separate debug configuration for task-lib functions
- Debug the interaction between V2 task and task-lib

### 3. Multi-Process Debugging
- Debug both the task and any child processes (CLI execution)
- Use VS Code's multi-target debugging capabilities

## Quick Start Debug Session

1. **Open project in VS Code**
2. **Build extension**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Build Extension (Debug)"
3. **Set breakpoint** in `src/MicrosoftSecurityDevOps/v2/defender-cli.ts` at line with `getDefenderArgs()`
4. **Start debugging**: `F5` → Select "Debug V2 Task - Container Image Scan"
5. **Step through code** and inspect variables

This setup provides a complete debugging environment for developing and troubleshooting the Microsoft Defender CLI V2 task integration.
