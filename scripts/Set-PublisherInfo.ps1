<#
.SYNOPSIS
Updates the extension manifest id, name, build task display info and task id guids.

.DESCRIPTION
Azure DevOps extension developers have a couple hurdles to overcome.

Every build task that is uploaded must have a unique guid id.
To upload a test extension, all of the guid's must be replaced, and they must
be replaced reliably with the same values.

When doing co-development with multiple developers, they need to be able to
upload, install, and run their extensions side by side. Adding identifying info
to the extension name and build tasks names makes this possible.

For YAML builds, it's important that the task names are unique, otherwise you have to
add the full namespace of the task, instead of easy names just like "UseDotNet".
#>
[CmdletBinding()]
param
(
    [Parameter(Mandatory=$true)]
    [ValidateScript({Test-Path -Path $_ -PathType Leaf})]
    [String] $ManifestPath,

    [Parameter(Mandatory=$true)]
    [ValidateScript({Test-Path -Path $_ -PathType Container})]
    [String] $StagingDirectory,

    [Parameter(Mandatory=$false)]
    [String] $PublishersDirectory,

    [Parameter(Mandatory=$false)]
    [String] $PublisherName
)

Write-Host 'Setting publisher info...'

Import-Module (Join-Path $PSScriptRoot 'ConvertTo-Hashtable.psm1')
Import-Module (Join-Path $PSScriptRoot 'Test-VersionString.psm1')

if ([String]::IsNullOrWhiteSpace($PublisherName))
{
    $PublisherName = $env:USERNAME
}

if ([String]::IsNullOrWhiteSpace($PublishersDirectory))
{
    $PublishersDirectory = Join-Path $PSScriptRoot '.publishers'
}

if (-not (Test-Path -Path $PublishersDirectory -PathType 'Container'))
{
    throw [System.IO.DirectoryNotFoundException] "Could not find publishers directory: $PublishersDirectory"
}

Write-Host "Inputs:"
Write-Host "  ManifestPath = $ManifestPath"
Write-Host "  StagingDirectory = $StagingDirectory"
Write-Host "  PublisherName = $PublisherName"
Write-Host "  PublishersDirectory = $PublishersDirectory"

$updateExtensionVersionFilePath = Join-Path $PSScriptRoot 'Update-ExtensionVersion.ps1'
$updateBuildTaskVersionFilePath = Join-Path $PSScriptRoot 'Update-BuildTaskVersion.ps1'

Write-Host "Reading the manifest file: $ManifestPath"
$manifest = Get-Content -Path $ManifestPath | ConvertFrom-Json

$publisherFilePath = Join-Path $PublishersDirectory "$($PublisherName.ToLower())-publishers.json"
Write-Host "Publisher file: $publisherFilePath"

if (Test-Path -Path $publisherFilePath -PathType 'Leaf')
{
    # Basically we have two invalid task.json files where we have a key name of "" (the empty string), so ConvertFrom-Json throws.
    # We can't change them, because that will break the build tasks that are already deployed using that value. This appears to
    # be an issue with ConvertFrom-Json and not the JSON itself.
    $publisherInfoRaw = Get-Content -Path $publisherFilePath | Foreach-Object -Process { $_ -replace '""\s*:', '" ":'} | ConvertFrom-Json
    $publisherInfo = ConvertTo-Hashtable $publisherInfoRaw
}

# Now that we have our PSCustomObject with our known publisher information, let's see if we have anything saved.
if ($publisherInfo)
{
    if ($publisherInfo.version -eq $null)
    {
        $publisherInfo.version = $manifest.Version
        $publisherInfo.count = 0
    }
    else
    {
        if ($publisherInfo.version -eq $manifest.Version)
        {
            $publisherInfo.count += 1
        }
        elseif (Test-VersionString -Version $publisherInfo.Version -LessThan $manifest.Version)
        {
            # Reset the version and count
            $publisherInfo.version = $manifest.Version
            $publisherInfo.count = 0
        }
        else
        {
            $publisherInfo.count += 1
            
            Write-Warning 'Manifest version is less than the publishers.json version'
            Write-Warning "Manifest Version = $($manifest.Version)"
            Write-Warning "Publishers Version = $($publisherInfo.version)"
        }
    }
}
else # Create a new publisher
{
    # We have 'publisher' as a separate field, in case the test Azure DevOps account name (the publisher) is
    # different than the username.

    $publisherInfo = @{
        publisher = 'ms-secdevops-test'
        publisherName = $PublisherName
        extensionId = "$($manifest.id)-$($PublisherName)"
        mapping = @{ }
        count = 0
        version = $manifest.Version
    }

    Write-Host "Saving new publisher file: $publisherFilePath"
    $publisherInfo | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 -NoNewline -Force -FilePath $publisherFilePath
}

Write-Host 'Ensuring all tasks have entries in publishers.json'

$srcTaskNamesSearchPatern = Join-Path $PSScriptRoot '../' 'src' '*'
$taskNames = Get-ChildItem -Path $srcTaskNamesSearchPatern -Directory | Select -ExpandProperty Name
$newTaskIds = $false

foreach ($taskName in $taskNames)
{
    if ($taskName -ne 'node_modules' -and -not $publisherInfo.mapping.$taskName)
    {
        Write-Host "Missing task '$taskName' for publisher '$PublisherName'"
        $publisherInfo.mapping.$taskName = [Guid]::NewGuid().Guid
        Write-Host "  New task id = $($publisherInfo.mapping.$taskName)"
        $newTaskIds = $true;
    }
}

# Write the publisher map
Write-Host "Saving publisher file: $publisherFilePath"
$publisherInfo | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 -NoNewline -Force -FilePath $publisherFilePath

# Look for "id" : "<value>" with any amount of whitespace between the key ("id") and its value
# We're going to use a regex here, instead of loading the json and updating it, since we have the
# empty-string-name issue in some of our task.json files.
$idPattern = '"id"\s*:\s*"[^"]+"'
$namePattern = '"name"\s*:\s*"([^"]+)"'
$friendlyNamePattern = '"friendlyName"\s*:\s*"([^"]+)"'
$instanceNamePattern = '"instanceNameFormat"\s*:\s*"([^"]+)"'

Write-Host 'Processing staged task.json files'
$stagedTaskNamesSearchPattern = Join-Path $StagingDirectory '*'
$taskNames = Get-ChildItem -Path $stagedTaskNamesSearchPattern -Directory | Select -ExpandProperty Name
foreach ($taskName in $taskNames)
{
    # Handle up to 1 level deep for versioned tasks

    $taskFiles = Get-ChildItem -Path "$($StagingDirectory)\$($taskName)\" -Include @('task.json', 'task.loc.json') -Depth 1 | Select -ExpandProperty FullName
    
    foreach ($taskFile in $taskFiles)
    {
        & $updateBuildTaskVersionFilePath -FilePath $taskFile -Patch -Count $publisherInfo.count

        $contents = Get-Content -Path $taskFile

        if ($publisherInfo.mapping.$taskName)
        {
            $replacement = '"id": "' + $publisherInfo.mapping.$taskName + '"'
        }
        else
        {
            Write-Warning "Extra build task '$($taskName)' found in staging folder, cleanup your build results."
            $replacement = ($contents | Select-String $idPattern).Line.Trim()
        }

        $contents = $contents | Foreach-Object -Process { $_ -replace $idPattern, $replacement }

        for ($idx = 0; $idx -lt $contents.Length; $idx++)
        {
            if ($contents[$idx] -match $namePattern)
            {
                $contents[$idx] = $contents[$idx].replace($Matches[1], "$PublisherName$($Matches[1])")
                break
            }
        }

        # Change the names of the tasks to have '[PublisherName]' at the end.
        # There are multiple 'name' fields, we want to change the first one
        for ($idx = 0; $idx -lt $contents.Length; $idx++)
        {
            if ($contents[$idx] -match $friendlyNamePattern)
            {
                $contents[$idx] = $contents[$idx].replace($Matches[1], "$($Matches[1]) [$($PublisherName)]")
                break
            }
        }

        for ($idx = 0; $idx -lt $contents.Length; $idx++)
        {
            if ($contents[$idx] -match $instanceNamePattern)
            {
                $contents[$idx] = $contents[$idx].replace($Matches[1], "$($Matches[1]) [$($PublisherName)]")
                break
            }
        }

        $contents | Out-File -Force -FilePath $taskFile -Encoding utf8
    }
}

Write-Host 'All staged task.json files updated'

$manifest.id = $publisherInfo.extensionId
$manifest.name = "$PublisherName - $($manifest.name)"
$manifest.publisher = $publisherInfo.publisher

$manifest | ConvertTo-Json -Depth 99 | Out-File -Encoding utf8 -Force -FilePath $ManifestPath
Write-Host "Manifest file updated with info for publisher: $($publisherInfo.publisher)"

& $updateExtensionVersionFilePath -FilePath $ManifestPath -Rev -Count $publisherInfo.count