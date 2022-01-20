# Copyright (c) Microsoft Corporation. All rights reserved.

Param
(
    [String] $ExtensionFilePath,

    [String] $Configuration
)

Write-Host 'Upticking extension version for rollback...'

# Uptick the extension and build task minor versions twice

$updateExtensionVersionFilePath = Join-Path $PSScriptRoot 'Update-ExtensionVersion.ps1'
& $updateExtensionVersionFilePath -FilePath $ExtensionFilePath -Minor -Count 3
& $updateExtensionVersionFilePath -FilePath $ExtensionFilePath -Patch -Count 1

$updateBuildTaskVersionsFilePath = (Join-Path $PSScriptRoot 'Update-BuildTaskVersions.ps1')
& $updateBuildTaskVersionsFilePath -Minor -Count 5 -Directory 'lib' -Configuration $Configuration
& $updateBuildTaskVersionsFilePath -Patch -Count 1 -Directory 'lib' -Configuration $Configuration
