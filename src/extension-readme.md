# Microsoft Security DevOps for Azure DevOps

An extension for Azure DevOps that contributes a build task to run the [Microsoft Security DevOps CLI](https://aka.ms/msdo-nuget).

* Installs the Microsoft Security DevOps CLI
* Installs the latest Microsoft security policy
* Installs the latest Microsoft and 3rd party security tools
* Automatic or user-provided configuration of security tools
* Execution of a full suite of security tools
* Normalized processing of results into the SARIF format
* Build breaks and more

## Dependencies

* The `MicrosoftSecurityDevOps` build task depends on [.NET 6](https://dotnet.microsoft.com/en-us/download/dotnet/6.0).
* The CredScan analyzer depends on [.NET 3.1](https://dotnet.microsoft.com/en-us/download/dotnet/3.1).

Microsoft-hosted build agents ship with an included list of software. To see if your agent image comes with these pre-installed, [see here](https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/hosted?view=azure-devops&tabs=yaml#software).

To install these dependencies at runtime, run the following tasks before the `MicrosoftSecurityDevOps` task.
```yaml
- task: UseDotNet@2
  displayName: 'Use dotnet 6.0'
  inputs:
    version: 6.0.x
```

## Basic

Add the `MicrosoftSecurityDevOps` build task to your pipeline's yaml:

```yaml
steps:
- task: MicrosoftSecurityDevOps@1
  displayName: 'Run Microsoft Security DevOps'
```

The `publish` input option is defaulted to true. If true, this will publish a [SARIF formatted](https://aka.ms/sarif) results file as a build artifact to `CodeAnalysisLogs/msdo.sarif`.

## View Results

To better view the results of the scan, outside of the console output and results file, the [SARIF SAST Scans Tab](https://marketplace.visualstudio.com/items?itemName=sariftools.scans&targetId=8e02e9e3-062e-46a7-8558-c30016c43306&utm_source=vstsproduct&utm_medium=ExtHubManageList) Azure DevOps extension can be installed in parallel. It will look for `*.sarif` files in the `CodeAnalysisLogs` build artifact directory and display them as source annotations.

## More Information

* [Microsoft Security DevOps Azure DevOps Extension](https://aka.ms/msdo-azdevops)
* [Microsoft Security DevOps GitHub Action](https://aka.ms/msdo-github)