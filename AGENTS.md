# AGENTS.md

Project: **Drone Lending System** (Drohnenverwaltung). Drones and accessories
are lent to student groups. See `drohnenverwaltung.md` for the project brief.

## Architecture

```
Angular Frontend (frontend/drone-inventory-ui)
      │  REST / JSON
      ▼
ASP.NET Core 10 Web API (backend/DroneInventory.Api)
      │
      ▼
Entity Framework Core → SQLite
```

Backend, frontend and specs live in this one repository.

## Rules

- OpenSpec specifications (`openspec/specs`, `openspec/changes`) are the source of truth.
- To change behavior, change the spec first, then the code.
- Business logic, validation and the loan rules belong in the backend.
- The frontend never accesses the database directly; it only calls the REST API.
- Use the ubiquitous language from `domain-model.md` exactly: `Drone`,
  `StudentGroup`, `Loan`, `LoanItem`, `LoanStatus`, `Availability`. No synonyms
  (no rental, booking, issue, device).
- Drone availability is derived from the active loan. Never store it as a field.
- Keep requirement IDs (`REQ-001` … `REQ-010`) in specs, tasks, issues and test names.
- Out of scope (do not implement): login/roles, item-level batteries,
  reservations, damage management, reports/exports, edit/delete, search/filter/sort.

## Working on a task

- One GitHub issue = one branch (`feature/<issue>-<slug>`) = one pull request.
- Implement only the issue or OpenSpec task you were asked for. Do not implement other tasks.
- Every Given/When/Then scenario of the task needs an automated test.
- Do not tick off tasks in `tasks.md` or move issues to "Done" unless the work is implemented and tested.
- Never delete issues. Never commit tokens or secrets.
- Do not archive an OpenSpec change before all its tasks are merged.
- Propose, don't decide: surface open design questions instead of silently choosing.

## Commands

```bash
# Backend
dotnet build backend/DroneInventory.Api
dotnet test backend

# Frontend
cd frontend/drone-inventory-ui
npm install
npm start          # ng serve
npm test           # ng test
```

## Project Management

- Use GitHub Issues and the GitHub Project **OpenSpec Drohnenverwaltung Project**
  (owner `MaxLettner`, project number `4`, repository `MaxLettner/OpenSpec-Drohnenverwaltung`) for all work.
- Board columns (`Status`): Backlog, Ready, In progress, In review, Done.
- Prefer the GitHub CLI `gh`.
- Skills: `openspec-to-github` (create issues from a change), `openspec-apply-with-github`
  (set In Progress and implement), `openspec-archive-with-github` (set Done and archive).
