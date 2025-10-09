# Microsoft Defender CLI Extension (v2)

This is version 2 of the Microsoft Security DevOps extension, which adds support for the new Microsoft Defender CLI alongside the existing MSDO functionality.

## Overview

The Microsoft Defender CLI extension (v2) provides security scanning capabilities for both filesystem and container image targets using the Microsoft Defender CLI tool.

## Features

- **Filesystem Scanning**: Scan directories and files for security vulnerabilities
- **Container Image Scanning**: Scan container images for security issues
- **SARIF Output**: Results are provided in SARIF format for integration with security tools
- **Azure DevOps Integration**: Full integration with Azure DevOps pipelines
- **Artifact Publishing**: Automatic publishing of scan results as pipeline artifacts

## Task Configuration

### Required Parameters

- **Scan Type**: Choose between `filesystem` or `image` scanning
- **Target**: 
  - For filesystem scans: Provide the path to scan
  - For image scans: Provide the container image name

### Advanced Options

- **Break**: Fail the build if critical issues are found (default: false)
- **Publish**: Publish SARIF results as pipeline artifact (default: true)
- **Artifact Name**: Name of the artifact to publish (default: "CodeAnalysisLogs")

## Usage Examples

### Filesystem Scanning

```yaml
- task: MicrosoftDefenderCLI@2
  displayName: 'Scan Filesystem'
  inputs:
    scanType: 'filesystem'
    fileSystemPath: '$(System.DefaultWorkingDirectory)'
    publish: true
    break: false
```

### Container Image Scanning

```yaml
- task: MicrosoftDefenderCLI@2
  displayName: 'Scan Container Image'
  inputs:
    scanType: 'image'
    imageName: 'nginx:latest'
    publish: true
    break: true
```

## File Structure

```
v2/
├── index.ts                    # Main entry point
├── task.json                   # Task definition
├── defender-cli.ts             # Core Defender CLI implementation
├── defender-client.ts          # Mock client for Defender CLI
├── defender-helpers.ts         # Utility functions and validation
├── defender-interface.ts       # TypeScript interfaces
└── README.md                   # This documentation
```

## Implementation Details

### Architecture

The v2 extension follows the same architectural pattern as v1 but is specifically designed for the Defender CLI:

1. **Entry Point** (`index.ts`): Main task entry point that handles command routing
2. **Core Logic** (`defender-cli.ts`): Implements the main scanning logic
3. **Client** (`defender-client.ts`): Mock implementation of the Defender CLI client
4. **Helpers** (`defender-helpers.ts`): Validation and utility functions
5. **Interfaces** (`defender-interface.ts`): TypeScript type definitions

### Scan Types

#### Filesystem Scan
- **Parameter**: `--filesystem-path <path>`
- **Validation**: Ensures the path exists and is accessible
- **Use Case**: Scanning source code, configuration files, and project directories

#### Image Scan
- **Parameter**: `--image <imageName>`
- **Validation**: Validates image name format
- **Use Case**: Scanning container images for vulnerabilities

### Mock Implementation

The current implementation uses a mock Defender CLI client (`DefenderClient`) that:
- Simulates the CLI execution process
- Generates mock SARIF output for testing
- Provides the same interface as the real Defender CLI package
- Can be easily replaced with the actual Defender CLI package when available

### Integration with Azure DevOps

- **Task Library**: Uses `azure-pipelines-task-lib` for Azure DevOps integration
- **Artifact Publishing**: Automatically publishes SARIF results as pipeline artifacts
- **Error Handling**: Proper error handling and build break functionality
- **Logging**: Detailed logging and debug output

## Differences from v1 (MSDO)

| Feature | v1 (MSDO) | v2 (Defender CLI) |
|---------|-----------|-------------------|
| Tool | Microsoft Security DevOps | Microsoft Defender CLI |
| Scan Types | Categories-based (secrets, code, IaC, etc.) | Target-based (filesystem, image) |
| Parameters | Multiple categories, languages, tools | Simple scan type selection |
| CLI Executable | MSDO CLI | Defender CLI |
| Package Dependency | `@microsoft/security-devops-azdevops-task-lib` | Mock client (placeholder) |

## Future Enhancements

When the actual Defender CLI package becomes available:

1. Replace `DefenderClient` mock with real package
2. Add more advanced scanning options
3. Implement pre-job and post-job commands if needed
4. Add support for additional CLI parameters
5. Enhance error handling and reporting

## Testing

Unit tests are provided in the `test/MicrosoftSecurityDevOps/v2/` directory:
- `defender-helpers.tests.ts`: Tests for validation and utility functions

## Migration from v1

To migrate from v1 (MSDO) to v2 (Defender CLI):

1. Change task reference from `MicrosoftSecurityDevOps@1` to `MicrosoftDefenderCLI@2`
2. Update input parameters:
   - Replace `categories`, `languages`, `tools` with `scanType`
   - Add `fileSystemPath` or `imageName` based on scan type
3. Keep existing `publish`, `break`, and `artifactName` settings

Both v1 and v2 can coexist in the same extension, allowing gradual migration.
