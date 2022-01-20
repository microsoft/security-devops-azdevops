# Microsoft Security DevOps for Azure DevOps

An extension for Azure DevOps that contributes a build task to run the [Microsoft Security DevOps CLI](https://aka.ms/msdo-nuget).

* Installs the Microsoft Security DevOps CLI
* Installs the latest Microsoft security policy
* Installs the latest Microsoft and 3rd party security tools
* Automatic or user-provided configuration of security tools
* Execution of a full suite of security tools
* Normalized processing of results into the SARIF format
* Build breaks and more

## Basic

Add the `MicrosoftSecurityDevOps` build task to your pipeline's yaml:

```yaml
steps:
# Ensure dotnet is installed
- task: UseDotNet@2
  displayName: 'Install .NET Core SDK'
  inputs:
    version: 3.1.201

# Run Microsoft Security DevOps
- task: MicrosoftSecurityDevOps@1
  displayName: 'Run Microsoft Security DevOps'
```

## More Information

* [Microsoft Security DevOps Azure DevOps Extension](https://aka.ms/msdo-azdevops)
* [Microsoft Security DevOps GitHub Action](https://aka.ms/msdo-github)