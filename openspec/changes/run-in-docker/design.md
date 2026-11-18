# Design

## Context

See proposal.md for the motivation. Current state:

- `Program.cs` calls `db.Database.Migrate()` and the sample data seeding only inside `if (app.Environment.IsDevelopment())`. A Production start therefore has no tables.
- `appsettings.json` sets `ConnectionStrings:Default` to `Data Source=droneinventory.db`, a path relative to the working directory. Environment variables such as `ConnectionStrings__Default` already override it.
- `SampleData:SeedWhenEmpty` is `true` only in `appsettings.Development.json`.
- The backend serves no files. The frontend calls relative `/api/...` URLs and runs through `ng serve` with `proxy.conf.json`. `npm run build` writes to `frontend/drone-inventory-ui/dist/drone-inventory-ui/browser`.
- Tests run the API through `ApiFactory` on an in-memory SQLite connection in Development. `Production_writes_no_sample_data` builds a Production host from a factory that sets `SampleData:SeedWhenEmpty=true`.

## Goals / Non-Goals

**Goals:**
- One image, one container, one port, one named volume.
- The `dotnet run` and `npm start` workflow keeps working unchanged.

**Non-Goals:**
- HTTPS inside the container, a reverse proxy, image publishing, CI.
- Making the OpenAPI document available outside Development.

## Decisions

### D1 Migrate at every start

`Migrate()` moves out of the Development block and runs before `app.Run()` in every environment. The seeding check stays next to it and depends only on `SampleData:SeedWhenEmpty`, no longer on the environment. `appsettings.json` gets `"SampleData": { "SeedWhenEmpty": false }` so the default is visible; `appsettings.Development.json` keeps `true`. `MapOpenApi()` stays Development only.

Alternative considered: a separate `Database:MigrateOnStartup` setting. Rejected by the team: one SQLite file and one instance give no reason to migrate out of band, and a second switch is one more way to start without tables.

### D2 Serve the Angular build from the API

`app.UseDefaultFiles()` and `app.UseStaticFiles()` serve `wwwroot`, and `app.MapFallbackToFile("index.html")` answers every other address that names no file. To keep unknown `/api` addresses out of the fallback, a more specific `app.MapFallback("/api/{**path}", ...)` answers 404 as ProblemDetails, like the other API errors. Route precedence picks the `/api` fallback over the catch-all one.

In the dev workflow there is no `wwwroot`, so nothing changes there: `ng serve` keeps serving the app on port 4200.

Alternative considered: nginx in a second container forwarding `/api`. Rejected by the team: two images and a proxy configuration for an app with one user group.

### D3 Image

Multi-stage `Dockerfile` at the repository root:

1. `node:24-alpine`: `npm ci` and `npm run build` in `frontend/drone-inventory-ui` (npm pinned to the `packageManager` version 11.19.1).
2. `mcr.microsoft.com/dotnet/sdk:10.0`: `dotnet publish backend/DroneInventory.Api -c Release -o /out`.
3. `mcr.microsoft.com/dotnet/aspnet:10.0`: copies `/out` and the Angular `browser` folder into `/app/wwwroot`, creates `/data` owned by the image's non-root `app` user, sets `ConnectionStrings__Default=Data Source=/data/droneinventory.db`, and listens on 8080 (the image default `ASPNETCORE_HTTP_PORTS`).

`.dockerignore` keeps `node_modules`, `dist`, `bin`, `obj`, `*.db*`, `.git` and `.claude` out of the build context.

### D4 compose.yaml

One service `app`: `build: .`, `ports: "8080:8080"`, volume `drone-data:/data`, and `SampleData__SeedWhenEmpty: ${SAMPLE_DATA:-false}`. Commands for the README:

- start: `docker compose up --build` (app at http://localhost:8080)
- start with sample data on an empty volume: `SAMPLE_DATA=true docker compose up --build`
- stop and keep the data: `docker compose down`
- start over: `docker compose down -v`

### D5 Tests

- Backend scenarios run in `dotnet test`. Startup and restart tests need a real file, so they use a second factory that sets `ConnectionStrings:Default` to a file in a temp folder and keeps the default DbContext registration. Two factories one after the other on the same file give the restart. `SqliteConnection.ClearAllPools()` runs before the temp folder is deleted.
- "Start on an older database" migrates a file only up to `20261104075411_CreateLoans` with `IMigrator`, inserts a drone and a returned loan with SQL, then starts the API in Production on that file.
- `Production_writes_no_sample_data` changes so that the Production host does not inherit `SampleData:SeedWhenEmpty=true` from the base factory. Its scenario now says "no sample data setting".
- App serving tests set the web root (`WebHostDefaults.WebRootKey`) to a temp folder with a small `index.html`.
- The container scenarios run in `scripts/docker-smoke.sh`: it starts the compose project under its own project name, waits for `/api/drones`, checks `/` and `/loans` return the app, creates "TELLO-07", runs `down` and `up` and checks the drone is still there, then `down -v` and `up` and checks the list is empty, and finally removes everything. It exits non-zero on the first failed check.

## Risks / Trade-offs

- [The named volume is created as root and the API runs as `app`, so SQLite cannot write] → `/data` is created and handed to `app` in the image; Docker copies that ownership into a new named volume.
- [Port 8080 is taken on a team member's machine] → change the left side of the port mapping; the README says so.
- [Migrating at every start also runs on an old file from a team member's `dotnet run`] → that is the intended behavior; migrations only add, and the tests cover an older database.
- [The smoke script needs Docker and is not part of `dotnet test`] → it is run before the PR of its task and its output goes into the PR body.

## Migration Plan

No data migration. Existing development databases keep working, because the migration step already ran on them in Development. Rollback is reverting the PRs; the volume can be deleted with `docker compose down -v`.
