# Copyright (c) Microsoft Corporation. All rights reserved.

<#
.SYNOPSIS
Recursively converts PSCustomObjects inside of an array to Hashtables.
#>
Function Convert-HashtablesInArrays
{
    [OutputType([Array])]
    Param
    (        # Parameter help description
        [Parameter(Position=0)]
        [Array] $Array,
        
        [Parameter(Position=1)]
        [System.Int32] $Depth = 5
    )
    
    if ($Array -eq $null)
    {
        Write-Output $null
        return
    }
    
    $convertedArray = @()
    $nextDepth = $Depth - 1
    
    foreach ($object in $Array)
    {
        $convertedObject = $object
        
        if ($nextDepth -gt 0)
        {
            # Continue converting PSCustomObjects recursively
            switch -regex ($object.GetType())
            {
                '.*Object$'
                {
                    $convertedObject = ConvertTo-Hashtable -Object $object -Depth $nextDepth
                    break
                }
                '.*Array|.*\[\]'
                {
                    $convertedObject = [object[]] (Convert-HashtablesInArrays -Array $object -Depth $nextDepth)
                    break
                }
            }
        }

        $convertedArray += ,$convertedObject
    }
    
    Write-Output $convertedArray
}

<#
.SYNOPSIS
Recursively converts a PSCustomObject and it's properties to Hashtables.

.NOTES
Unlike Hashtables, PSCustomObjects are difficult to add to once they are created.
When using ConvertFrom-Json to read json config files, PSCustomObjects are returned.
These objects, although not immutable, are hard to work with.
By converting them to Hashtables, they will be easier to diff, merge, and work with.
#>
Function ConvertTo-Hashtable
{
    [OutputType([Hashtable])]
    Param
    (
        [Parameter(Position=0)]
        [AllowNull()]
        [PSObject] $Object,
        
        [Parameter(Position=1)]
        [ValidateRange(0, [System.Int32]::MaxValue)]
        [System.Int32] $Depth = 5
    )
    
    if ($Object -eq $null)
    {
        Write-Output $null
        return
    }
        
    $hashtable = @{}
    $nextDepth = $Depth - 1

    foreach ($baseProperty in $Object.PSObject.Properties)
    {
        $convertedProperty = $baseProperty.Value
        
        if ($nextDepth -gt 0) # -gt 0)
        {
            # Continue converting PSCustomObjects recursively
            switch -regex ($baseProperty.Value.GetType())
            {
                '.*Object$'
                {
                    $convertedProperty = ConvertTo-Hashtable -Object $baseProperty.Value -Depth $nextDepth
                    break
                }
                '.*Array|.*\[\]'
                {
                    $convertedProperty = [object[]] (Convert-HashtablesInArrays -Array $baseProperty.Value -Depth $nextDepth)
                    break
                }
            }
        }
        
        $hashtable[$baseProperty.Name] = $convertedProperty
    }
    
    Write-Output $hashtable
}

Export-ModuleMember -Function @(
    'ConvertTo-Hashtable',
    'Convert-HashtablesInArrays'
)