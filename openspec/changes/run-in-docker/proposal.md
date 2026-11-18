# Proposal

## Why

The brief asks for a running application, and the tool is used again in the second semester. Today it only runs with the .NET 10 SDK and Node installed, as two dev servers, and only in Development: a Production start has no tables, because migrations run only in Development. A Docker container lets anyone start the whole app with one command and keeps the SQLite data across restarts, as the brief's "dauerhaft" asks.

## What Changes

- The system creates and migrates its database at every start, in every environment. Data that is already there stays (REQ-010).
- The API also serves the built Angular app, so app and API share one address and port. Angular addresses such as `/loans` open the app; unknown `/api` addresses still answer 404.
- A Docker image builds the frontend and the backend and runs both in one container. A `compose.yaml` at the repository root starts it with `docker compose up --build`, maps one port and keeps the SQLite file on a named volume.
- Sample data can be switched on outside Development. A fresh container starts empty; setting `SampleData__SeedWhenEmpty=true` fills an empty database, for example for the presentation.
- The README describes how to start, stop and reset the container.

## Out of scope

- Login, HTTPS certificates, a reverse proxy or any public hosting.
- A second database engine, several API instances or replicas.
- Backups or exports of the SQLite file.
- Publishing the image to a registry and CI pipelines.
- Changes to the dev workflow with `dotnet run` and `npm start`, which stays as it is.
- Any change to the loan rules or to REQ-001 to REQ-010.

## Capabilities

### New Capabilities

- `deployment`: how the system starts and is delivered: database ready on every start, data kept in one SQLite file across restarts, app and API served from one address, and the container with its volume.

### Modified Capabilities

- `sample-data`: "Fill an empty development database" becomes "Fill an empty database" and applies wherever sample data is switched on (on by default only in Development). "Existing data and other environments stay untouched" no longer forbids sample data outside Development when it is switched on explicitly.

## Impact

- Backend: `Program.cs` (migrations outside Development, static files and the fallback to `index.html`), new tests for startup on a file database and for serving the app.
- Frontend: no code change; its production build is copied into the image.
- New files: `Dockerfile`, `.dockerignore`, `compose.yaml`, a smoke test script for the container.
- README: a new section for running with Docker.
