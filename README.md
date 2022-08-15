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
# Run Microsoft Security DevOps
- task: MicrosoftSecurityDevOps@1
  displayName: 'Run Microsoft Security DevOps'
```

# Open Source Tools

| Name | Language | License |
| --- | --- | --- |
| [Bandit](https://github.com/PyCQA/bandit) | python | [Apache License 2.0](https://github.com/PyCQA/bandit/blob/master/LICENSE) |
| [BinSkim](https://github.com/Microsoft/binskim) | binary - Windows, ELF | [MIT License](https://github.com/microsoft/binskim/blob/main/LICENSE) |
| CredScan | code, artifacts | - |
| [ESlint](https://github.com/eslint/eslint) | JavaScript | [MIT License](https://github.com/eslint/eslint/blob/main/LICENSE) |
| [Template Analyzer](https://github.com/Azure/template-analyzer) | Infrastructure-as-code (IaC), ARM templates | [MIT License](https://github.com/Azure/template-analyzer/blob/main/LICENSE.txt) |
| [Terrascan](https://github.com/accurics/terrascan) | Infrastructure-as-code (IaC), Terraform (HCL2), Kubernetes (JSON/YAML), Helm v3, Kustomize, Dockerfiles | [Apache License 2.0](https://github.com/accurics/terrascan/blob/master/LICENSE) |
| [Trivy](https://github.com/aquasecurity/trivy) | container images, file systems, and git repositories | [Apache License 2.0](https://github.com/aquasecurity/trivy/blob/main/LICENSE) |

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
