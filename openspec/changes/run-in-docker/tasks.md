# Tasks

One task, one GitHub issue, one branch and one pull request. Every Given/When/Then scenario of the delta specs is covered by an automated test. Tasks 1.1 and 1.2 both change `Program.cs` and run one after the other.

## 1. Backend

- [x] 1.1 Create and migrate the database at every start, in every environment (design D1, D5); tests for "First start in Production", "Start on an older database" and "Restart keeps the loans" on a file database in a temp folder, and every existing test still passes with `dotnet test backend` (REQ-001 to REQ-010) (#181)
- [x] 1.2 Make sample data depend only on `SampleData:SeedWhenEmpty`, with `false` in `appsettings.json` (design D1, D5); tests for "Sample data switched on in Production" and the adjusted "Production", the other sample-data tests still pass, README sample data paragraph updated (REQ-001 to REQ-010) (#182)
- [x] 1.3 Serve the built web app from `wwwroot` with a fallback to `index.html` and a 404 ProblemDetails fallback for `/api` (design D2, D5); tests for "Open the root address", "Open a page directly", "API next to the app" and "Unknown API address" with a temp web root (REQ-002, REQ-007, REQ-010) (#183)

## 2. Container

- [ ] 2.1 Add `Dockerfile`, `.dockerignore`, `compose.yaml` and `scripts/docker-smoke.sh` (design D3, D4, D5); the script passes for "Start the container", "Recreate the container" and "Remove the volume", its output is in the PR body, and the README has a "Run with Docker" section whose commands work as written (REQ-010) (#184)

## Workflow follow-up

- Create the GitHub issues with `openspec-to-github` and add them to the project board.
- Archive the change with `openspec-archive-with-github` after all tasks are merged.
