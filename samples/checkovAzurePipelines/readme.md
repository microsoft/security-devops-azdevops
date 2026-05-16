## Introduction

This folder provides a verification fixture for the Checkov `CKV_AZUREPIPELINES_*`
severity promotion tracked in [issue #164](https://github.com/microsoft/security-devops-azdevops/issues/164)
(split out from [#163](https://github.com/microsoft/security-devops-azdevops/issues/163)).

The [azure-pipelines.yml](azure-pipelines.yml) in this folder declares a job whose
`container` field references `ubuntu:latest`. When Checkov (run via the
`MicrosoftSecurityDevOps@1` task) scans the pipeline file, the `azure_pipelines`
framework inspects job-level `container` declarations and emits two findings:

* **`CKV_AZUREPIPELINES_1`** — *Ensure container job uses a non latest version tag.*
  Fires because the tag is `:latest`.
* **`CKV_AZUREPIPELINES_2`** — *Ensure container job uses a version digest.* Fires
  because the reference lacks an `@sha256:...` digest.

> **Pending in Guardian:** the actual severity-mapping change that promotes
> `CKV_AZUREPIPELINES_*` from `note` to `warning` lives in Microsoft's internal
> Guardian severity-policy and is owned by that team. This fixture exists so the
> end-to-end behavior can be verified against the public MSDO task output once the
> internal change ships.

## Contents

* [azure-pipelines.yml](azure-pipelines.yml) — minimal pipeline that triggers
  `CKV_AZUREPIPELINES_1` and `CKV_AZUREPIPELINES_2` and runs
  `MicrosoftSecurityDevOps@1` with `tools: 'checkov'`.

## How to run

1. Copy `azure-pipelines.yml` to the root of an Azure DevOps repository (or point an
   existing pipeline at this file).
2. Create a pipeline in Azure DevOps that uses this YAML.
3. Run the pipeline. The MSDO task publishes `msdo.sarif` to the build artifacts
   under `CodeAnalysisLogs` (on a hosted Linux agent the staged file is at
   `$(Build.ArtifactStagingDirectory)/.gdn/msdo.sarif`, typically
   `/home/vsts/work/1/a/.gdn/msdo.sarif`).
4. Open the **Scans** tab on the build run to see Checkov findings.

## Expected Scans Tab output

Under the `checkov` tool collapse, with the SARIF Scans Tab extension at its default
severity filter:

* Once the Guardian policy change in issue #164 is deployed, both
  `CKV_AZUREPIPELINES_1` and `CKV_AZUREPIPELINES_2` appear as **Warning**
  without the user enabling "Notes".
* Until then, the same findings are emitted as `note` and are hidden by the default
  filter — you can verify they are present by enabling "Notes" in the Scans Tab
  filter, or by inspecting `msdo.sarif` directly with the `jq` commands below.

## Verification commands

Download `msdo.sarif` from the build artifacts (under `CodeAnalysisLogs`) and run the
following against it. These are the paste-ready snippets from the acceptance criteria
in [issue #164](https://github.com/microsoft/security-devops-azdevops/issues/164).

**AC1 — Severity in published SARIF.** Every `CKV_AZUREPIPELINES_*` result must be
`warning`:

```bash
jq '[.runs[]
     | select(.tool.driver.name == "checkov")
     | .results[]
     | select(.ruleId | startswith("CKV_AZUREPIPELINES_"))
     | .level] | unique' /home/vsts/work/1/a/.gdn/msdo.sarif
# Expected: ["warning"]
```

**AC3 — No regression for other Checkov rules.** Capture the per-rule severity
histogram and diff against a pre-change baseline. Only `CKV_AZUREPIPELINES_*` rows
should change from `note` → `warning`:

```bash
jq '[.runs[]
     | select(.tool.driver.name == "checkov")
     | .results[]
     | {ruleId, level}]
    | group_by(.ruleId)
    | map({ruleId: .[0].ruleId, level: .[0].level})' /home/vsts/work/1/a/.gdn/msdo.sarif
```

**AC4 — Build break unchanged.** Run the pipeline twice — once with `break: true` on
the `MicrosoftSecurityDevOps@1` task, once with `break: false`. With the default
`--min-severity Error`, AZUREPIPELINES warnings must not break the build; both runs
must complete with `succeeded` status.
