# Copyright (c) Microsoft Corporation. All rights reserved.

Param
(
    [Parameter(ParameterSetName="Major")]
    [Parameter(ParameterSetName="Minor")]
    [Parameter(ParameterSetName="Patch")]
    [String] $FilePath,

    [Parameter(ParameterSetName="Major")]
    [Switch] $Major,

    [Parameter(ParameterSetName="Minor")]
    [Switch] $Minor,

    [Parameter(ParameterSetName="Patch")]
    [Switch] $Patch,

    [Parameter(ParameterSetName="Major")]
    [Parameter(ParameterSetName="Minor")]
    [Parameter(ParameterSetName="Patch")]
    [Int] $Count = 1
)

Write-Host "Upticking build task - $($FilePath)"

if ($Count -eq 0)
{
    Write-Host "Count is 0. Skipping upticking task version: $($FilePath)"
    return
}

if (-not $Major -and -not $Minor -and -not $Patch)
{
    throw 'No version upticks requested.'
}

$lines = @()

$majorRegex = '(?<=\"Major\"\:\s*)(?<Version>\d+)'
$minorRegex = '(?<=\"Minor\"\:\s*)(?<Version>\d+)'
$patchRegex = '(?<=\"Patch\"\:\s*)(?<Version>\d+)'

$findMajor = $Major.IsPresent
$findMinor = $Major.IsPresent -or $Minor.IsPresent
$findPatch = $Major.IsPresent -or -$Minor.IsPresent -or $Patch.IsPresent

Get-Content -Path $FilePath | ForEach-Object {
    $line = $_

    if ($Major.IsPresent -and $line -imatch $majorRegex)
    {
        $version = [Int]$matches['Version'] += $Count
        $line = $line -replace $majorRegex, $version
        $findMajor = $false
    }
    elseif ($findMinor -and $line -imatch $minorRegex)
    {
        $version = 0
        if ($Minor.IsPresent)
        {
            $version = [Int]$matches['Version'] += $Count
        }

        $line = $line -replace $minorRegex, $version
        $findMinor = $false
    }
    elseif ($findPatch -and $line -imatch $patchRegex)
    {
        $version = 0
        if ($Patch.IsPresent)
        {
            $version = [Int]$matches['Version'] += $Count
        }

        $line = $line -replace $patchRegex, $version
        $findPatch = $false
    }

    $lines += $line
}

[System.IO.File]::WriteAllLines($FilePath, $lines)