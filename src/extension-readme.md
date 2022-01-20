# Microsoft Defender for DevOps Azure DevOps Extension

An extension for Azure DevOps that contributes a build task to run the [Microsoft Defender for DevOps CLI](https://aka.ms/dfd-nuget).

* Installs the Microsoft Defender for DevOps CLI
* Installs the latest Microsoft security policy
* Installs the latest Microsoft and 3rd party security tools
* Automatic or user-provided configuration of security tools
* Execution of a full suite of security tools
* Normalized processing of results into the SARIF format
* Build breaks and more

## Basic

Add the `SecurityDevOps` build task to your pipeline's yaml:

```yaml
steps:
# Ensure dotnet is installed
- task: UseDotNet@2
  displayName: 'Install .NET Core SDK'
  inputs:
    version: 3.1.201

# Run Microsoft Defender for DevOps
- task: SecurityDevOps@1
  displayName: 'Run Microsoft Defender for DevOps'
```

## More Information

* [Microsoft Defender for DevOps Azure DevOps Extension](https://aka.ms/dfd-azdevops)
* [Microsoft Defender for DevOps GitHub Action](https://aka.ms/dfd-github)
