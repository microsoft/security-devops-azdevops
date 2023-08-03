# Copyright (c) Microsoft Corporation. All rights reserved.

Param
(
    [Parameter(ParameterSetName="Major")]
    [Switch] $Major,

    [Parameter(ParameterSetName="Minor")]
    [Switch] $Minor,

    [Parameter(ParameterSetName="Patch")]
    [Switch] $Patch,

    [Parameter(ParameterSetName="Major")]
    [Parameter(ParameterSetName="Minor")]
    [Parameter(ParameterSetName="Patch")]
    [Int] $Count = 1,

    [Parameter(ParameterSetName="Major")]
    [Parameter(ParameterSetName="Minor")]
    [Parameter(ParameterSetName="Patch")]
    [ValidateSet('src', 'lib')]
    [String] $Directory = 'src',

    [String] $Configuration = 'Debug'
)

if ($Count -eq 0)
{
    Write-Host 'Count is 0. Skipping upticking task versions...'
    return
}

$rootDirectory = Split-Path -Path $PSScriptRoot -Parent
$targetDirectory = Join-Path $rootDirectory $Directory

switch ($Directory)
{
    'lib'
    {
        $targetDirectory = Join-Path $targetDirectory $Configuration
        break
    }
    default
    {
        throw "Unknown folder to uptick build task versions for: $($Directory)"
    }
}

if (-not (Test-Path -Path $targetDirectory -PathType 'Container'))
{
    throw "Unable to find the build tasks folder to uptick: $($targetDirectory). If upticking the staging directory, ensure you have built the extension to uptick."
}

$updateBuildTaskVersion = Join-Path $PSScriptRoot 'Update-BuildTaskVersion.ps1'

Get-ChildItem -Path $targetDirectory -Include @('task.json', 'task.loc.json', 'task-external.json', 'task-external.loc.json') -Recurse | ForEach-Object {
    $filePath = $_.FullName
    switch ($PSCmdlet.ParameterSetName)
    {
        'Major'
        {
            & $updateBuildTaskVersion -FilePath $filePath -Major -Count $Count
            break
        }
        'Minor'
        {
            & $updateBuildTaskVersion -FilePath $filePath -Minor -Count $Count
            break
        }
        'Patch'
        {
            & $updateBuildTaskVersion -FilePath $filePath -Patch -Count $Count
            break
        }
    }
}
