# OpenSpec-Drohnenverwaltung

Drone Lending System: drones and accessories are lent to student groups.
The project brief is in `drohnenverwaltung.md`.

## Prerequisites

- **.NET 10 SDK** (verified with 10.0.403)
- **Node.js** `^22.22.3 || ^24.15.0 || >=26.0.0`, the range required by Angular 22 (verified with v26.8.2). `frontend/drone-inventory-ui/package.json` does not declare an `engines` field.
- **npm 11.19.1**, as pinned by `packageManager` in `frontend/drone-inventory-ui/package.json` (verified with 11.19.1)
- **dotnet-ef** (optional, only needed to create new migrations with `dotnet ef migrations add`):

  ```bash
  dotnet tool install --global dotnet-ef
  ```

## Run the backend

From the repository root:

```bash
dotnet run --project backend/DroneInventory.Api
```

- The API listens on **http://localhost:5035** (profile `http` in `backend/DroneInventory.Api/Properties/launchSettings.json`). All endpoints are under `/api`.
- The launch profile sets `ASPNETCORE_ENVIRONMENT=Development`. In Development the app creates the SQLite database file on first start and applies the EF Core migrations at startup. The file is `backend/DroneInventory.Api/droneinventory.db` when started this way, and it is git-ignored.
- In Development the OpenAPI document is served at **http://localhost:5035/openapi/v1.json**.

| Endpoint | Purpose |
|---|---|
| `POST /api/drones`, `GET /api/drones` | create a drone, list drones with derived availability |
| `POST /api/student-groups`, `GET /api/student-groups` | create a student group, list student groups |
| `POST /api/loans`, `GET /api/loans/{id}` | loan a drone (with optional `items`), look up a loan |
| `POST /api/loans/{id}/return` | return a loan |
| `GET /api/loans/active`, `GET /api/loans/history` | active loans, returned loans |

Errors are returned as ProblemDetails (400, 404, 409). There is deliberately no delete endpoint. Details: `openspec/changes/initial-drone-lending-system/design.md` (D5).

## Run the frontend

The frontend needs the backend running on port 5035.

```bash
cd frontend/drone-inventory-ui
npm install
npm start
```

- The app is served at **http://localhost:4200** and opens on `/drones`.
- `proxy.conf.json` forwards every `/api` request of the dev server to `http://localhost:5035`, so the frontend calls the backend through relative URLs such as `/api/drones`.
- A production build is created with `npm run build` (output in `frontend/drone-inventory-ui/dist/`).

## Run the tests

```bash
# Backend (xUnit, from the repository root)
dotnet test backend

# Frontend (single run, no watch mode)
cd frontend/drone-inventory-ui
npm test -- --watch=false
```

## Project structure

- `backend/` - ASP.NET Core 10 Web API (`DroneInventory.Api`), its tests (`DroneInventory.Api.Tests`) and the solution `backend/DroneInventory.sln`
- `frontend/drone-inventory-ui/` - Angular app; it talks to the backend only through the REST API
- `openspec/` - OpenSpec specifications and changes; the source of truth for behavior
- `domain-model.md`, `requirements.md`, `drohnenverwaltung.md` - domain language, requirements and project brief

## Workflow

Behavior changes start in the OpenSpec specifications: change the spec in `openspec/` first, then the code. Each GitHub issue is implemented on its own branch and pull request. See `AGENTS.md` for the rules for contributors and agents.
