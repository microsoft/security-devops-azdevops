# Microsoft Defender CLI Extension (v2) - Testing Guide

## Environment Setup Issues Encountered

During our testing session, we encountered Node.js PATH issues. Here's how to resolve them:

### Fix Node.js/npm PATH Issues

1. **Add Node.js to System PATH**:
   - Open System Properties → Environment Variables
   - Add `C:\Program Files\nodejs` to the System PATH variable
   - Restart your command prompt/PowerShell

2. **Verify Installation**:
   ```bash
   node --version
   npm --version
   ```

3. **Fix npm Registry Authentication**:
   ```bash
   # Backup corporate .npmrc
   copy .npmrc .npmrc.corporate
   
   # Create clean .npmrc for testing
   echo registry=https://registry.npmjs.org/ > .npmrc
   
   # Clear cache and install
   npm cache clean --force
   npm install
   ```

## Manual Code Validation (Available Now)

### 1. File Structure Validation ✅
- ✅ `src/MicrosoftSecurityDevOps/v2/task.json` - Task definition
- ✅ `src/MicrosoftSecurityDevOps/v2/index.ts` - Entry point
- ✅ `src/MicrosoftSecurityDevOps/v2/defender-cli.ts` - Core logic
- ✅ `src/MicrosoftSecurityDevOps/v2/defender-client.ts` - Mock client
- ✅ `src/MicrosoftSecurityDevOps/v2/defender-helpers.ts` - Utilities
- ✅ `src/MicrosoftSecurityDevOps/v2/defender-interface.ts` - Interfaces
- ✅ `src/extension-manifest.json` - Updated with v2 task
- ✅ `test/MicrosoftSecurityDevOps/v2/defender-helpers.tests.ts` - Unit tests

### 2. Task Definition Validation ✅
The task.json is properly configured with:
- ✅ Unique task ID for v2
- ✅ Proper input parameters (scanType, fileSystemPath, imageName)
- ✅ Conditional visibility rules (visibleRule)
- ✅ Maintained advanced options (break, publish, artifactName)
- ✅ Multiple Node.js execution targets

### 3. Code Architecture Validation ✅
- ✅ Follows same pattern as v1 (MSDO)
- ✅ Proper TypeScript interfaces
- ✅ Input validation functions
- ✅ Error handling
- ✅ Mock client for testing
- ✅ SARIF output generation

## Testing Steps (Once Environment is Fixed)

### Phase 1: Unit Testing
```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Or run specific tests
npx mocha test/MicrosoftSecurityDevOps/v2/defender-helpers.tests.js
```

### Phase 2: Compilation Testing
```bash
# Compile TypeScript
npm run compile

# Or use dotnet build
dotnet build ./build.proj /t:Compile
```

### Phase 3: Extension Packaging
```bash
# Install TFX CLI
npm install -g tfx-cli

# Package extension
tfx extension create --manifest-globs src/extension-manifest.json

# Validate package
tfx extension show --vsix microsoft-security-devops-azdevops-*.vsix
```

### Phase 4: Azure DevOps Integration Testing

#### Test Scenarios:

**Scenario 1: Filesystem Scan**
```yaml
- task: MicrosoftDefenderCLI@2
  displayName: 'Test Filesystem Scan'
  inputs:
    scanType: 'filesystem'
    fileSystemPath: '$(System.DefaultWorkingDirectory)'
    publish: true
    break: false
```

**Scenario 2: Container Image Scan**
```yaml
- task: MicrosoftDefenderCLI@2
  displayName: 'Test Image Scan'
  inputs:
    scanType: 'image'
    imageName: 'nginx:latest'
    publish: true
    break: true
```

**Scenario 3: Error Handling**
```yaml
- task: MicrosoftDefenderCLI@2
  displayName: 'Test Invalid Input'
  inputs:
    scanType: 'filesystem'
    fileSystemPath: '/nonexistent/path'
    publish: true
    break: false
```

### Phase 5: Validation Checklist

#### Task Execution:
- [ ] Task appears in Azure DevOps task catalog
- [ ] Task displays correct name: "Microsoft Defender CLI"
- [ ] Input UI shows scan type dropdown
- [ ] File system path input appears when scanType = filesystem
- [ ] Image name input appears when scanType = image
- [ ] Advanced options are properly grouped

#### Mock Functionality:
- [ ] Filesystem scan executes without errors
- [ ] Image scan executes without errors
- [ ] Mock SARIF output is generated
- [ ] SARIF artifact is published
- [ ] Task logs show scan progress
- [ ] Task respects break setting

#### Error Handling:
- [ ] Invalid scan type shows error
- [ ] Invalid file path shows error
- [ ] Invalid image name shows error
- [ ] Missing required inputs show errors

#### Integration:
- [ ] v1 and v2 tasks coexist
- [ ] Both tasks can be used in same pipeline
- [ ] Artifact names don't conflict
- [ ] SARIF viewer integration works

## Expected Behavior

### Successful Execution Log:
```
Starting Microsoft Defender CLI scan...
Arguments: --filesystem-path /path/to/scan
Performing filesystem scan on: /path/to/scan
Analyzing security vulnerabilities...
Scan completed - no critical issues found.
SARIF results written to: /tmp/defender-scan-1234567890.sarif
Publishing SARIF results to artifact: CodeAnalysisLogs
Successfully published artifact: CodeAnalysisLogs
Microsoft Defender CLI scan completed successfully.
```

### Mock SARIF Output Structure:
```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "Microsoft Defender CLI",
          "version": "2.0.0"
        }
      },
      "results": [...]
    }
  ]
}
```

## Troubleshooting

### Common Issues:

1. **Node.js not found**: Add to PATH and restart terminal
2. **npm authentication**: Use public registry for testing
3. **TypeScript errors**: Install dependencies first
4. **Task not visible**: Check extension manifest contribution
5. **Input validation fails**: Check helper functions

### Debug Commands:
```bash
# Check npm configuration
npm config list

# Check Node.js version
node --version

# Compile with verbose output
tsc --build --verbose

# Test specific functions
node -e "console.log('Test')"
```

## Migration from v1 to v2

When ready to migrate from MSDO (v1) to Defender CLI (v2):

1. **Update pipeline YAML**:
   - Change `MicrosoftSecurityDevOps@1` to `MicrosoftDefenderCLI@2`
   - Replace complex parameters with simple scanType selection
   - Keep publish/break/artifactName settings

2. **Parameter Mapping**:
   - `categories: 'code'` → `scanType: 'filesystem'`
   - `categories: 'containers'` → `scanType: 'image'`
   - Remove: `languages`, `tools`, `policy`, `config`
   - Add: `fileSystemPath` or `imageName`

## Next Steps

1. **Fix environment setup** (Node.js PATH)
2. **Run unit tests** to validate helper functions
3. **Compile extension** to catch TypeScript errors
4. **Package extension** for deployment
5. **Test in dev Azure DevOps** organization
6. **Replace mock client** when real Defender CLI is available

The extension is architecturally complete and ready for testing once the environment issues are resolved.
