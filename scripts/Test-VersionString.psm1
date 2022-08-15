# Copyright (c) Microsoft Corporation. All rights reserved.

<#
.SYNOPSIS
Checks that a given Semantic Version is equal to, greater than, or less than an other version string

.NOTES
This function makes assumptions about the handling of "latest" versions.
Latest versions are defined as null, empty, or "Latest".
If a <Latest> string is provided as Version and EqualTo is used,
EqualTo must be a valid <Latest> value as well.
If a <Latest string is provided as Version and a Comparirson is used (GreaterThan or LessThan),
we make assumptions about what latest and comparisons mean.
We assume that <Latest> is always greater than any value (always return true),
unless the value provided for GreaterThan is a <Latest> value, in which they are equal and will return false.
We assume that <Latest> cannot be less than any value, including <Latest>, so it will always return false.
#>
Function Test-VersionString
{
    [CmdletBinding()]
    Param
    (
        [Parameter(Mandatory=$true, ParameterSetName="EqualTo")]
        [Parameter(Mandatory=$true, ParameterSetName="Comparisons")]
        [AllowNull()]
        [AllowEmptyString()]
        [String] $Version,
        
        [Parameter(ParameterSetName="EqualTo")]
        [AllowNull()]
        [AllowEmptyString()]
        [String] $EqualTo,
        
        [Parameter(ParameterSetName="Comparisons")]
        [AllowNull()]
        [AllowEmptyString()]
        [String] $GreaterThan,
        
        [Parameter(ParameterSetName="Comparisons")]
        [AllowNull()]
        [AllowEmptyString()]
        [String] $LessThan
    )

    $valid = $true

    # If it's a latest version string
    if (Test-LatestVersionString -Version $Version)
    {
        switch ($PSCmdlet.ParameterSetName)
        {
            'EqualTo'
            {
                # EqualTo must be a latest version string too
                $valid = (Test-LatestVersionString -Version $EqualTo)
                break
            }
            'Comparisons'
            {
                # Time to make some assumptions

                # If GreaterThan is a latest version string
                if (Test-LatestVersionString -Version $GreaterThan)
                {
                    # Latest cannot be greater than Latest. They are equal to eachother.
                    $valid = $false
                }
                # else: Assume the "Latest" version is greater than any version
                
                if ($LessThan)
                {
                    # Assume the "Latest" version can't be less than any version
                    $valid = $false
                }
                
                break
            }
        }

        Write-Output $valid
        return
    }

    $parsedVersion, $parsedVersionPreRelease = Get-VersionFromString -Version $Version
    $parsedEqualTo, $parsedEqualToPreRelease = Get-VersionFromString -Version $EqualTo
    $parsedGreaterThan, $parsedGreaterThanPreRelease = Get-VersionFromString -Version $GreaterThan
    $parsedLessThan, $parsedLessThanPreRelease = Get-VersionFromString -Version $LessThan

    if ($EqualTo)
    {
        # We're checking the exact version
        $valid = $parsedVersion -eq $parsedEqualTo -and $parsedVersionPreRelease -eq $parsedEqualToPreRelease
    }
    else
    {
        if ($GreaterThan)
        {
            # $parsedVersion is greater than the $parsedGreaterThan version
            # Or $parsedVersion is equal to the $parsedGreaterThan version, but $Version is not a prerelease and the $GreaterThan version is a prerelease
            $valid = ($parsedVersion -gt $parsedGreaterThan) -or (-not $parsedVersionPreRelease -and $parsedGreaterThanPreRelease -and ($parsedVersion -eq $parsedGreaterThan))
        }
        
        if ($valid -and $LessThan)
        {
            # $parsedVersion is less than the $parsedLessThan version
            # Or $parsedVersion is equal to the $parsedLessThan version, but $Version is a prerelease and the $LessThan version is not a prerelease
            $valid = ($parsedVersion -lt $parsedLessThan) -or ($parsedVersionPreRelease -and -not $parsedLessThanPreRelease -and ($parsedVersion -eq $parsedLessThan))
        }
    }

    Write-Output $valid
}

Function Get-VersionFromString
{
    Param
    (
        [String] $Version
    )

    if (Test-LatestVersionString -Version $Version)
    {
        Write-Output $null
        Write-Output $null
        return
    }

    $parsedVersion = $Version

    if ($Version -match '\-')
    {
        $prereleaseParts = $Version -split '-'

        if ($preReleaseParts.Length -ne 2)
        {
            throw [System.FormatException] 'Unrecognized pre-release version format detected.'
        }

        $parsedVersion = $preReleaseParts[0]
        $preRelease = $preReleaseParts[1]
    }

    $versionObject = [System.Version] $parsedVersion

    Write-Output $versionObject
    Write-Output $preRelease
}

<#
.SYNOPSIS
Tests to see if a string represents a "Latest" version and returns true or false.

.DESCRIPTION
The DevToolsEngine assumes the following values as the "Latest" version:
* Null
* Empty
* White space
* "Latest" (case-invariant)
* "LatestPreRelease" (case-invariant)
#>
Function Test-LatestVersionString
{
    Param
    (
        [Parameter(Position=0)]
        [AllowNull()]
        [String] $Version
    )

    Write-Output ([String]::IsNullOrWhiteSpace($Version) -or $Version -ieq 'Latest' -or $Version -ieq 'LatestPreRelease')
}

Export-ModuleMember -Function @(
    'Test-VersionString',
    'Get-VersionFromString',
    'Test-LatestVersionString'
)