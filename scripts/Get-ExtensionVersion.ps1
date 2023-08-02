# Copyright (c) Microsoft Corporation. All rights reserved.

Param
(
    [String] $FilePath
)

$extensionJson = Get-Content -Path $FilePath -Raw | ConvertFrom-Json
Write-Output $extensionJson.version
