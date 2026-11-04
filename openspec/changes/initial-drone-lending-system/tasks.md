# Tasks

Each task becomes one GitHub issue, one branch and one pull request. Every Given/When/Then scenario of the listed requirement is covered by an automated test written in the same task. Specs: `specs/drone`, `specs/student-group`, `specs/loan`.

## 1. Backend foundation

- [x] 1.1 Add EF Core with SQLite, an `AppDbContext`, the `Domain/Application/Infrastructure/Api` folders, a `DroneInventory.Api.Tests` project (xUnit, `WebApplicationFactory`, in-memory SQLite) and `backend/DroneInventory.sln` containing both projects; verify `dotnet test backend` runs a passing smoke test against the real API pipeline (#1)
- [x] 1.2 Add central error handling and JSON options (ProblemDetails for 400/404/409, string enums, unknown members rejected); verify tests that a malformed body gives 400 and an unknown route gives 404 in ProblemDetails form (#2)

## 2. Student groups (backend) — REQ-003

- [x] 2.1 Implement the `StudentGroup` model, migration (unique name, ignoring case) and `POST /api/student-groups`; verify tests for the create, blank-name and duplicate-name scenarios of `specs/student-group` (#3)
- [x] 2.2 Implement `GET /api/student-groups`; verify tests for the listing and empty-list scenarios (#4)

## 3. Drones (backend) — REQ-001

- [x] 3.1 Implement the `Drone` model (no status column), migration (unique name, ignoring case) and `POST /api/drones`; verify tests for the create, optional-description, status-rejected, blank-name and duplicate-name scenarios of `specs/drone` (#5)

## 4. Loan model — REQ-005, REQ-006, REQ-010

- [x] 4.1 Implement `Loan`, `LoanItem`, `LoanStatus` and `LoanItemType`, the migration with the partial unique index on active loans per drone, the unique `(LoanId, Type)` index and restrict-delete relations; verify persistence tests that a second active loan for one drone is rejected by the database and that two returned loans for one drone are allowed (#6)

## 5. Drone list (backend) — REQ-002

- [x] 5.1 Implement `GET /api/drones` with availability derived from the active loan; verify tests for the loaned/available, empty-inventory and available-after-return scenarios (seed loans directly in the test database) (#7)

## 6. Loaning (backend) — REQ-004, REQ-005, REQ-006

- [x] 6.1 Implement `LoanService` and `POST /api/loans` for an available drone and an existing group, with the current date as `LoanDate` via `TimeProvider`; verify tests for the loan-available-drone, unknown-group and unknown-drone scenarios (#8)
- [x] 6.2 Reject loans for a drone that already has an active loan, including simultaneous requests (database constraint violation mapped to 409); verify tests for the second-loan and unavailable-drone scenarios, and for the simultaneous-attempts scenario by inserting an active loan directly behind the service's back and checking that the constraint violation is returned as 409 with exactly one active loan left (#9)
- [x] 6.3 Accept and validate `items` (`Battery`, `Propeller`, integer quantity >= 0, one item per type, items optional); verify tests for the accessories, negative, zero, fractional, unknown-type, repeated-type and no-accessories scenarios (#10)

## 7. Returning (backend) — REQ-008, REQ-009

- [x] 7.1 Implement `POST /api/loans/{id}/return` (status `Returned`, `ReturnDate` set to the current date, not before `LoanDate`) and `GET /api/loans/{id}`; verify tests for the return, return-twice, unknown-loan, drone-loanable-again, ReturnDate-set and active-has-no-ReturnDate scenarios (#11)
- [x] 7.2 Make the return atomic: change the status with a conditional update (`Status = Active`) so that simultaneous returns of one loan give exactly one success and one 409, and the first `ReturnDate` stays; verify the simultaneous-returns scenario with a deterministic test (return the loan directly behind the service's back after its check) (#47)

## 8. Loan queries (backend) — REQ-007, REQ-010

- [ ] 8.1 Implement `GET /api/loans/active` returning group, drone, batteries, propellers (0 when absent) and loan date; verify tests for the reference-example, returned-not-listed, no-accessories and empty-list scenarios (#12)
- [ ] 8.2 Implement `GET /api/loans/history` returning returned loans with both dates; verify tests for the returned-stays-in-history and active-not-in-history scenarios (#13)
- [ ] 8.3 Verify retention: no delete route exists for loans, and return keeps the loan and its items; verify tests for the return-does-not-delete and no-way-to-delete scenarios (`DELETE /api/loans/{id}` answers 405) (#14)

## 9. Frontend foundation

- [x] 9.1 Replace the Angular placeholder with an app shell and routes for drones, student groups, loans and history; add the dev proxy for `/api` and a `dd.MM.yyyy` date pipe; verify `ng build` and `ng test` pass, including a test for the date pipe (#15)
- [x] 9.2 Add typed API services for drones, student groups and loans, plus a shared way to show backend errors (400/404/409) to the user; verify service tests with `HttpTestingController` for each endpoint and error status (#16)

## 10. Frontend features

- [x] 10.1 Drone list showing name, availability and description — REQ-002; verify a component test with a loaned and an available drone and the empty state (#17)
- [x] 10.2 Drone form — REQ-001; verify component tests that a created drone appears in the list and that a duplicate name error is shown (#18)
- [x] 10.3 Student group page with form and list — REQ-003; verify component tests for create, list and the duplicate error (#19)
- [ ] 10.4 Loan form (drone from available drones, group, battery and propeller quantities) — REQ-004, REQ-005, REQ-006; verify component tests for a successful loan and for the backend rejections being displayed (#20)
- [x] 10.5 Active loan list with Group, Drone, Batteries, Propellers, Loan Date and a return action — REQ-007, REQ-008; verify component tests that the reference-example rows render and that returning removes the row (#21)
- [x] 10.6 Loan history list with both dates — REQ-010; verify a component test that returned loans render with loan date and return date (#22)


## 11. Integration

- [x] 11.1 Document in `README.md` how to run backend, frontend and all tests; verify the documented commands start both apps and pass the tests from a clean checkout (#23)
- [ ] 11.2 Walk through the reference example (Group 3, TELLO-07, 4 batteries, 8 propellers: loan, list, return, history) against the running app; verify the result in the PR description with the observed outcome and fix or file anything that deviates (#24)

## Workflow follow-up

- Archive the change (`/openspec-archive-with-github`) after all tasks are implemented, tested, reviewed and merged.
- Verify that `openspec/specs/drone`, `student-group` and `loan` exist after the archive.
