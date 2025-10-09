# Microsoft Defender CLI V2 Task - Filesystem Scan Test
# Run this script to test the V2 task with a filesystem scan

param(
    [string]$DefenderDevPath = "D:\DfdRepo\dfd-defender-cli\src\Microsoft.Security.DevOps.Cli\bin\Debug\net8.0\Microsoft.Security.DevOps.Cli.exe"
)

Write-Host "=== Microsoft Defender CLI V2 Task - Filesystem Scan Test ===" -ForegroundColor Green

# Set environment variables
$env:AGENT_ROOTDIRECTORY = $PWD
$env:BUILD_STAGINGDIRECTORY = "$PWD\temp"
$env:INPUT_SCANTYPE = "filesystem"
$env:INPUT_FILESYSTEMPATH = $PWD
$env:INPUT_COMMAND = "run"
$env:INPUT_PUBLISH = "false"
$env:INPUT_BREAK = "false"
# Set DEFENDER_FILEPATH directly to the dev build for local testing
# The task-lib will use this path if it exists
if (Test-Path $DefenderDevPath) {
    $env:DEFENDER_FILEPATH = $DefenderDevPath
    Write-Host "Using local Defender CLI build: $DefenderDevPath" -ForegroundColor Green
} else {
    Write-Host "WARNING: Defender CLI not found at $DefenderDevPath" -ForegroundColor Yellow
    Write-Host "The task will attempt to download the latest version..." -ForegroundColor Yellow
    # Don't set DEFENDER_FILEPATH - let the installer handle it
}

Write-Host "Environment Configuration:" -ForegroundColor Yellow
Write-Host "  AGENT_ROOTDIRECTORY: $env:AGENT_ROOTDIRECTORY"
Write-Host "  BUILD_STAGINGDIRECTORY: $env:BUILD_STAGINGDIRECTORY"
Write-Host "  DEFENDER_DEV_PATH: $DefenderDevPath"
Write-Host "  Scan Type: $env:INPUT_SCANTYPE"
Write-Host "  Target Path: $env:INPUT_FILESYSTEMPATH"
Write-Host ""

# Create temp directory
Write-Host "Creating temp directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "temp" | Out-Null

# Check if the V2 task exists
$taskPath = "lib\debug\MicrosoftSecurityDevOps\v2\index.js"
if (-not (Test-Path $taskPath)) {
    Write-Host "ERROR: V2 task not found at $taskPath" -ForegroundColor Red
    Write-Host "Please run: dotnet build ./build.proj /p:Sideload=true /p:Configuration=debug" -ForegroundColor Yellow
    exit 1
}

Write-Host "Running V2 task..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

try {
    # Run the V2 task
    node $taskPath
    
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "✅ V2 Task completed successfully!" -ForegroundColor Green
    
    # Check for SARIF output
    if (Test-Path "temp\defender.sarif") {
        Write-Host "✅ SARIF file generated: temp\defender.sarif" -ForegroundColor Green
    } elseif (Get-ChildItem "temp\*.sarif" -ErrorAction SilentlyContinue) {
        $sarifFiles = Get-ChildItem "temp\*.sarif"
        Write-Host "✅ SARIF files generated: $($sarifFiles.Name -join ', ')" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No SARIF files found in temp directory" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "❌ V2 Task failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Test completed. Check the output above for any issues." -ForegroundColor Green
