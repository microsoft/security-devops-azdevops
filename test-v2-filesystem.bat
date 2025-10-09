@echo off
echo === Microsoft Defender CLI V2 Task - Filesystem Scan Test ===
echo.

REM Set environment variables
set AGENT_ROOTDIRECTORY=%cd%
set BUILD_STAGINGDIRECTORY=%cd%\temp
set INPUT_SCANTYPE=filesystem
set INPUT_FILESYSTEMPATH=%cd%
set INPUT_COMMAND=run
set INPUT_PUBLISH=false
set INPUT_BREAK=false

echo Environment Configuration:
echo   AGENT_ROOTDIRECTORY: %AGENT_ROOTDIRECTORY%
echo   BUILD_STAGINGDIRECTORY: %BUILD_STAGINGDIRECTORY%
echo   Scan Type: %INPUT_SCANTYPE%
echo   Target Path: %INPUT_FILESYSTEMPATH%
echo.

REM Create temp directory
echo Creating temp directory...
mkdir temp 2>nul

REM Check if the V2 task exists
set TASK_PATH=lib\debug\MicrosoftSecurityDevOps\v2\index.js
if not exist "%TASK_PATH%" (
    echo ERROR: V2 task not found at %TASK_PATH%
    echo Please run: dotnet build ./build.proj /p:Sideload=true /p:Configuration=debug
    pause
    exit /b 1
)

echo Running V2 task...
echo ----------------------------------------

REM Run the V2 task
node "%TASK_PATH%"

echo ----------------------------------------

REM Check for SARIF output
if exist "temp\defender.sarif" (
    echo [SUCCESS] SARIF file generated: temp\defender.sarif
) else (
    if exist "temp\*.sarif" (
        echo [SUCCESS] SARIF files found in temp directory
        dir temp\*.sarif /b
    ) else (
        echo [WARNING] No SARIF files found in temp directory
    )
)

echo.
echo Test completed. Check the output above for any issues.
echo.
pause
