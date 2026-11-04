# Design

## Context

Greenfield: `backend/DroneInventory.Api` is an empty ASP.NET Core 10 Web API (the template sample is removed) and `frontend/drone-inventory-ui` is a fresh Angular app. `openspec/specs/` is empty. The domain terms and rule numbering come from `domain-model.md`; requirement IDs from `requirements.md`. See `proposal.md` for motivation and scope.

Fixed by the project: Angular → REST/JSON → ASP.NET Core → EF Core → SQLite. All business rules live in the backend; the frontend never reaches the database and only mirrors validation for convenience.

## Goals / Non-Goals

**Goals:**
- Each domain rule has exactly one enforcement point in the backend, and each Given/When/Then scenario has an automated test.
- A small, readable structure that students can explain: every class traces back to a REQ.
- The "one active loan per drone" rule holds even under concurrent requests.

**Non-Goals:**
- No authentication, paging, filtering or sorting controls, versioned API, Docker or deployment setup.
- No generic repository/CQRS/MediatR layers; the size of the system does not justify them.
- No separate backend projects per layer; one API project plus one test project.

## Decisions

### D1. Aggregates and layout
`Loan` is the aggregate root and owns its `LoanItem`s (`domain-model.md` §3). `Drone` and `StudentGroup` are separate aggregates referenced by `Id` only. The API project is organised by folders `Domain/`, `Application/` (services), `Infrastructure/` (EF Core context, migrations) and `Api/` (endpoints, request/response records). Domain classes have no EF or HTTP dependencies beyond plain properties.
*Alternative:* one project per layer. Rejected: more ceremony than value at this size.

### D2. Availability is derived, not stored (decision D-001)
`Drone` has no status column. The drone query computes `Loaned` when an `Active` loan with that `DroneId` exists, otherwise `Available`. This leaves a single source of truth for Rules 1 and 4.
*Alternative:* a stored `Drone.Status`. Rejected: two sources of truth that can drift (`domain-model.md` §6).

### D3. The loan rules sit in one application service
A `LoanService` creates and returns loans and checks Rules 1, 2, 3 and 5 in one place; endpoints only translate HTTP to service calls. Rule 1 is additionally protected by a database constraint (D4), because a check-then-insert in code alone is racy.

### D4. Database constraints back the rules
- Unique index on `Drone.Name` and on `StudentGroup.Name`.
- Partial unique index on `Loan(DroneId)` where `Status = Active`. SQLite supports partial indexes and EF Core maps them with `HasFilter`.
- Unique index on `LoanItem(LoanId, Type)` (at most one item per type).
- No cascade delete from `Drone`/`StudentGroup` to `Loan` (`Restrict`), so history cannot disappear through a side effect.
A violation raised by a concurrent request is caught and translated to the same `409 Conflict` as the service-level check. The race is tested deterministically: the test inserts a conflicting active loan behind the service's back, so the constraint (not timing) is what is verified.
Name uniqueness is case-insensitive (SQLite `COLLATE NOCASE` on the index).
*Alternative:* only code-level checks. Rejected: the simultaneous-loan scenario could not be guaranteed.

### D5. API contract
JSON over REST under `/api`. Error bodies use ProblemDetails.

| Method and path | Purpose | Success | Errors |
|---|---|---|---|
| `POST /api/drones` | create drone (`name`, `description?`) | 201 | 400 validation (blank name, unknown member such as `status`), 409 duplicate name |
| `GET /api/drones` | list with `availability` | 200 | |
| `POST /api/student-groups` | create (`name`) | 201 | 400, 409 duplicate name |
| `GET /api/student-groups` | list | 200 | |
| `POST /api/loans` | `droneId`, `studentGroupId`, `items?: [{type, quantity}]` | 201 | 400 validation, 404 unknown drone or group, 409 drone not available |
| `GET /api/loans/{id}` | one loan | 200 | 404 |
| `POST /api/loans/{id}/return` | return a loan | 200 | 404, 409 already returned |
| `GET /api/loans/active` | active loan rows | 200 | |
| `GET /api/loans/history` | returned loan rows | 200 | |

There is deliberately no `DELETE` route for loans, drones or groups. A `DELETE /api/loans/{id}` therefore answers `405 Method Not Allowed`, because the `GET` route on the same path exists.

Validation details: the create-drone body rejects unknown members (`JsonUnmappedMemberHandling.Disallow`), which rejects a supplied `status`. Enums are serialised as strings and an unknown `type` is a 400. `quantity` is a JSON integer; a fractional or negative value is a 400.

### D6. Dates
`LoanDate` and `ReturnDate` are calendar dates (`DateOnly`), set by the server from an injected `TimeProvider` so tests can fix the day. The API carries ISO-8601 (`yyyy-MM-dd`); only the UI renders `dd.MM.yyyy`. A same-day return gives `ReturnDate == LoanDate`, which satisfies "not before".
*Alternative:* timestamps. Rejected: nothing in the requirements needs a time of day.

### D7. Quantity
`Quantity` is an `int` validated in the backend (`>= 0`) rather than a value object (open question Q-1 in `domain-model.md`); the type system plus one validation function is enough at this size.

### D8. Persistence setup
EF Core migrations are committed. The database file is created by applying migrations at startup in Development; the SQLite file is git-ignored. Tests use an in-memory SQLite connection (a real SQLite, so partial indexes and constraints are exercised) through `WebApplicationFactory`.

### D9. Frontend
Angular standalone components with one `HttpClient`-based service per resource, feature folders `drones/`, `student-groups/`, `loans/`, and a dev proxy from `/api` to the backend, so no CORS setup is needed in development. Pages: drone list and form, student groups, loan form, active loans with a return action, history. Error responses from the backend (400/404/409) are shown to the user as they are; the frontend does not re-implement the rules.

### D10. Default list order
Lists have a fixed order, without user controls (sorting is out of scope): drones and groups by name, active loans by loan date then id, history by return date (latest first).

## Risks / Trade-offs

- [Derived availability costs a join per list query] → irrelevant at school-cabinet volumes; revisit only if the data grows.
- [Partial unique index is SQLite/provider specific] → covered by a test against real SQLite; a provider change must reproduce it.
- [Unique names are an assumption, not stated in the assignment] → flagged in Open Questions; relaxing it later is a spec change plus removing two indexes.
- [A drone's `Name` is not copied into the loan] → history shows the current drone/group name. Acceptable because rename is out of scope; it needs a new decision if rename is ever added.
- [`ReturnDate` is date-only, so two loans of the same drone on one day cannot be ordered by date] → order by `Id` as tiebreaker.

## Open Questions

Assumptions made while writing the specs; the team should confirm them in the spec review (they were open in `requirements.md` §7):

- **O-003** Names of drones and student groups are unique (assumed yes, 409 on duplicate). Matching is case-insensitive.
- **O-004** `LoanDate` is a date, chosen by the server, not entered by users.
- **O-005** At most one `LoanItem` per type per loan; accessories are optional.
- **O-006** ISO-8601 in the API, `dd.MM.yyyy` in the UI.
- **Q-2** The technical `Id` is the loan identifier; no business number such as `L-2026-001`.
