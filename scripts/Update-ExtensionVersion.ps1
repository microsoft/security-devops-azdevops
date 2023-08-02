# Copyright (c) Microsoft Corporation. All rights reserved.

Param
(
    [String] $FilePath,

    [Switch] $Major,

    [Switch] $Minor,

    [Switch] $Patch,

    [Switch] $Rev,

    [Int] $Count = 1
)

if ($Count -eq 0)
{
    Write-Host "Count is 0. Skipping upticking extension: $($FilePath)"
    return
}

if (-not $Major -and -not $Minor -and -not $Patch -and -not $Rev)
{
    throw 'No version upticks requested.'
}

$fileName = Split-Path -Path $FilePath -Leaf
Write-Host "Upticking extension - $($FilePath)"

$lines = @()

$versionPatchRegex = '(?<=\"version"\:\s*)\"(?<Major>\d+)\.(?<Minor>\d+)\.(?<Patch>\d+)\"'
$versionRevRegex   = '(?<=\"version"\:\s*)\"(?<Major>\d+)\.(?<Minor>\d+)\.(?<Patch>\d+)\.(?<Rev>\d+)\"'

$findVersion = $true

Get-Content -Path $FilePath | ForEach-Object {
    $line = $_

    if ($findVersion)
    {
        $matchPatch = $line -match $versionPatchRegex
        $matchRev   = $line -match $versionRevRegex
    
        if ($matchPatch -or $matchRev)
        {
            $majorVersion = [Int]$matches['Major']
            $minorVersion = [Int]$matches['Minor']
            $patchVersion = [Int]$matches['Patch']
            $revVersion   = [Int]$matches['Rev']

            if ($Major)
            {
                $majorVersion += $Count
                $minorVersion = 0
                $patchVersion = 0
                $revVersion = 0
            }

            if ($Minor)
            {
                $minorVersion += $Count
                $patchVersion = 0
                $revVersion = 0
            }

            if ($Patch)
            {
                $patchVersion += $Count
                $revVersion = 0
            }

            if ($Rev -and $matchRev)
            {
                $revVersion += $Count
            }

            if ($matchRev)
            {
                $line = $line -replace $versionRevRegex, "`"$($majorVersion).$($minorVersion).$($patchVersion).$($revVersion)`""
                Write-Host "Updated version: $($majorVersion).$($minorVersion).$($patchVersion).$($revVersion)"
            }
            else
            {
                $line = $line -replace $versionPatchRegex, "`"$($majorVersion).$($minorVersion).$($patchVersion)`""
                Write-Host "Updated version: $($majorVersion).$($minorVersion).$($patchVersion)"
            }
            
            $findVersion = $false
        }
    }

    $lines += $line
}

$lines | Out-File -FilePath $FilePath -Encoding 'UTF8'
