# Tasks

One task, one GitHub issue, one branch and one pull request. Every Given/When/Then scenario of the delta spec is covered by an automated test; the scenarios of "Fill an empty database" keep their existing tests.

## 1. Backend

- [x] 1.1 Test that sample data is on by default in Development: `FileDatabaseFactory` takes an optional environment; test for "On by default in Development" without a sample data setting of its own, and `dotnet test backend` still passes (REQ-001 to REQ-010) (#191)

## Workflow follow-up

- Archive the change with `openspec-archive-with-github` after the task is merged.
