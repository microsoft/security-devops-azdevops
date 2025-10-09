# Microsoft Defender CLI V2 Task - Container Image Scan Test
# Run this script to test the V2 task with a container image scan

param(
    [string]$DefenderDevPath = "D:\DfdRepo\dfd-defender-cli\src\Microsoft.Security.DevOps.Cli\bin\Debug\net8.0\Microsoft.Security.DevOps.Cli.exe"
)

Write-Host "=== Microsoft Defender CLI V2 Task - Container Image Scan Test ===" -ForegroundColor Green

# Set environment variables for image scan
$env:AGENT_ROOTDIRECTORY = $PWD
$env:BUILD_STAGINGDIRECTORY = "$PWD\temp"
$env:INPUT_SCANTYPE = "image"
$env:INPUT_IMAGENAME = "nginx:latest"  # Use a common, small image for testing
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
Write-Host "  Target Image: $env:INPUT_IMAGENAME"
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

# Check if Docker is available (needed for container image scanning)
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "Docker detected: $dockerVersion" -ForegroundColor Green
        
        # Try to pull the image if it doesn't exist locally
        Write-Host "Checking for nginx:latest image..." -ForegroundColor Yellow
        $imageExists = docker images nginx:latest --format "{{.Repository}}:{{.Tag}}" 2>$null
        if (-not $imageExists) {
            Write-Host "Pulling nginx:latest image (this may take a moment)..." -ForegroundColor Yellow
            docker pull nginx:latest
        } else {
            Write-Host "nginx:latest image already available locally" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "Warning: Docker not available or not responding. The Defender CLI may still work depending on its container scanning capabilities." -ForegroundColor Yellow
}

Write-Host "Running V2 task for container image scan..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

try {
    # Run the V2 task
    node $taskPath
    
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "✅ V2 Image Scan Task completed successfully!" -ForegroundColor Green
    
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
    Write-Host "❌ V2 Image Scan Task failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Container image scan test completed. Check the output above for any issues." -ForegroundColor Green
