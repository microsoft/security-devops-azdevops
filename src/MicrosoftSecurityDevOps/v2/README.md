# Microsoft Defender CLI Extension (v2)

This is version 2 of the Microsoft Security DevOps extension, which adds support for the new Microsoft Defender CLI alongside the existing MSDO functionality.

## Overview

The Microsoft Defender CLI extension (v2) provides security scanning capabilities for filesystem, container image, and AI model targets using the Microsoft Defender CLI tool.

## Features

- **Filesystem Scanning**: Scan directories and files for security vulnerabilities
- **Container Image Scanning**: Scan container images for security issues
- **AI Model Scanning**: Scan AI/ML models for security vulnerabilities and malicious content
- **Debug Mode**: Enable verbose logging for troubleshooting scan issues
- **Pipeline Summary**: Publish scan results summary to the Pipeline Extensions tab
- **SARIF Output**: Results are provided in SARIF format for integration with security tools
- **Azure DevOps Integration**: Full integration with Azure DevOps pipelines
- **Artifact Publishing**: Automatic publishing of scan results as pipeline artifacts

## Task Configuration

### Scan Type Selection

| Scan Type | Value | Description |
|-----------|-------|-------------|
| Filesystem | `filesystem` | Scan directories and files for vulnerabilities |
| Container Image | `image` | Scan container images (default) |
| AI Model | `model` | Scan AI/ML models for security issues |

### Required Parameters

- **Scan Type** (`scanType`): Choose between `filesystem`, `image`, or `model` scanning (default: `image`)
- **Target**: 
  - For filesystem scans: `fileSystemPath` - Path to scan (default: `$(Build.SourcesDirectory)`)
  - For image scans: `imageName` - Container image name (required)
  - For model scans: `modelPath` - Path to AI model file or directory (required)

### Advanced Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `break` | boolean | `false` | Fail the build if critical issues are found |
| `debug` | boolean | `false` | Enable verbose debug logging for troubleshooting |
| `publishSummary` | boolean | `true` | Publish scan results summary to the Pipeline Extensions tab |
| `additionalArgs` | string | - | Additional CLI arguments to pass to the Defender CLI |

## Usage Examples

### Filesystem Scanning

```yaml
- task: MicrosoftDefenderCLI@2
  displayName: 'Scan Filesystem'
  inputs:
    scanType: 'filesystem'
    fileSystemPath: '$(System.DefaultWorkingDirectory)'
    break: false
```

### Container Image Scanning

```yaml
- task: MicrosoftDefenderCLI@2
  displayName: 'Scan Container Image'
  inputs:
    scanType: 'image'
    imageName: 'nginx:latest'
    break: true
```

### AI Model Scanning

```yaml
- task: MicrosoftDefenderCLI@2
  displayName: 'Scan AI Model'
  inputs:
    scanType: 'model'
    modelPath: '$(System.DefaultWorkingDirectory)/models/mymodel'
    publishSummary: true
```

### Debug Mode

Enable verbose logging to troubleshoot scan issues:

```yaml
- task: MicrosoftDefenderCLI@2
  displayName: 'Scan with Debug Output'
  inputs:
    scanType: 'filesystem'
    fileSystemPath: '$(Build.SourcesDirectory)'
    debug: true
```

### Disable Pipeline Summary

Disable the pipeline summary if you don't want results in the Extensions tab:

```yaml
- task: MicrosoftDefenderCLI@2
  displayName: 'Scan without Summary'
  inputs:
    scanType: 'image'
    imageName: 'myregistry.azurecr.io/myapp:v1.0'
    publishSummary: false
```

### Advanced Configuration

```yaml
- task: MicrosoftDefenderCLI@2
  displayName: 'Full Configuration Example'
  inputs:
    scanType: 'filesystem'
    fileSystemPath: '$(Build.SourcesDirectory)/src'
    break: true
    debug: true
    publishSummary: true
    additionalArgs: '--scanner mdvm'
```

## File Structure

```
v2/
├── index.ts                    # Main entry point
├── task.json                   # Task definition
├── defender-cli.ts             # Core Defender CLI implementation
├── defender-helpers.ts         # Utility functions and validation
├── defender-interface.ts       # TypeScript interfaces
├── pipeline-summary.ts         # Pipeline summary integration
└── README.md                   # This documentation
```

## Implementation Details

### Architecture

The v2 extension follows the same architectural pattern as v1 but is specifically designed for the Defender CLI:

1. **Entry Point** (`index.ts`): Main task entry point that handles command routing
2. **Core Logic** (`defender-cli.ts`): Implements the main scanning logic
3. **Helpers** (`defender-helpers.ts`): Validation and utility functions
4. **Interfaces** (`defender-interface.ts`): TypeScript type definitions
5. **Pipeline Summary** (`pipeline-summary.ts`): Integration with ADO pipeline summary

### Scan Types

#### Filesystem Scan
- **Parameter**: `fileSystemPath`
- **CLI Flag**: `--filesystem-path <path>`
- **Validation**: Ensures the path exists and is accessible
- **Use Case**: Scanning source code, configuration files, and project directories

#### Container Image Scan
- **Parameter**: `imageName`
- **CLI Flag**: `--image <imageName>`
- **Validation**: Validates image name format
- **Use Case**: Scanning container images for vulnerabilities

#### AI Model Scan
- **Parameter**: `modelPath`
- **CLI Flag**: Uses `scanDirectory` with model path
- **Validation**: Ensures the model path exists
- **Use Case**: Scanning AI/ML models for security vulnerabilities, malicious content, or unsafe model configurations

### Debug Mode

When `debug: true` is set, the task:
- Adds `--defender-debug` flag to the Defender CLI command
- Outputs detailed information about the scan process
- Useful for troubleshooting scan failures or unexpected results

### Pipeline Summary

When `publishSummary: true` (default), the task:
- Parses the SARIF output after scanning
- Posts a summary to the Pipeline Extensions tab in Azure DevOps
- Includes vulnerability counts and severity information
- Provides quick visibility into scan results without downloading artifacts

### Integration with Azure DevOps

- **Task Library**: Uses `azure-pipelines-task-lib` for Azure DevOps integration
- **Artifact Publishing**: Automatically publishes SARIF results as pipeline artifacts
- **Pipeline Summary**: Posts results to the Pipeline Extensions tab
- **Error Handling**: Proper error handling and build break functionality
- **Logging**: Detailed logging with debug output support

## Differences from v1 (MSDO)

| Feature | v1 (MSDO) | v2 (Defender CLI) |
|---------|-----------|-------------------|
| Tool | Microsoft Security DevOps | Microsoft Defender CLI |
| Scan Types | Categories-based (secrets, code, IaC, etc.) | Target-based (filesystem, image, model) |
| AI Model Scanning | Not supported | Supported |
| Debug Mode | Not available | `--defender-debug` flag support |
| Pipeline Summary | Not available | Built-in summary integration |
| Parameters | Multiple categories, languages, tools | Simple scan type selection |
| CLI Executable | MSDO CLI | Defender CLI |
| Package Dependency | `@microsoft/security-devops-azdevops-task-lib` | `@microsoft/security-devops-azdevops-task-lib/defender-client` |

## Future Enhancements

When additional Defender CLI features become available:

1. Add more advanced scanning options
2. Implement pre-job and post-job commands if needed
3. Add support for additional CLI parameters
4. Enhance error handling and reporting
5. Extended model scanning options (specific model formats, custom policies)

## Testing

Unit tests are provided in the `test/MicrosoftSecurityDevOps/v2/` directory:
- `defender-helpers.tests.ts`: Tests for validation and utility functions
- `defender-cli.tests.ts`: Tests for core CLI implementation
- `pipeline-summary.tests.ts`: Tests for pipeline summary integration

## Migration from v1

To migrate from v1 (MSDO) to v2 (Defender CLI):

1. Change task reference from `MicrosoftSecurityDevOps@1` to `MicrosoftDefenderCLI@2`
2. Update input parameters:
   - Replace `categories`, `languages`, `tools` with `scanType`
   - Add `fileSystemPath`, `imageName`, or `modelPath` based on scan type
3. Optionally configure new features:
   - Add `debug: true` for verbose logging
   - Set `publishSummary: false` to disable pipeline summary
4. Keep existing `break` settings

Both v1 and v2 can coexist in the same extension, allowing gradual migration.
