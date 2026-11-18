# Proposal

## Why

`openspec validate --specs --strict` fails for `sample-data`: the requirement "Fill an empty database" is longer than 500 characters since `run-in-docker` added the default per environment to it. The requirement now states two behaviors, filling an empty database and when sample data is on by default.

## What Changes

- "Fill an empty database" keeps its header and all its scenarios; its description loses the sentence about the default per environment. Its meaning does not change.
- That sentence becomes its own requirement, "Sample data default per environment", with the new scenario "On by default in Development".
- One backend test for the new scenario. No behavior changes.

## Out of scope

- The length warning of `ui-theme`, which existed before.
- Any other change to the sample data, its content or its setting.

## Capabilities

### Modified Capabilities

- `sample-data`: "Fill an empty database" is shortened, "Sample data default per environment" is added (REQ-001 to REQ-010).

## Impact

- Spec only, plus one test in `SampleDataTests` and an optional environment for `FileDatabaseFactory`. No production code changes.
