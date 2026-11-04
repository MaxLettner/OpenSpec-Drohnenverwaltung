# Domain Model (DDD) — Drone Lending System

Terms defined here are valid everywhere: requirements (`requirements.md`),
OpenSpec specs, code, database and conversation. The model is described in
domain terms, not in implementation terms.

---

## 1. Ubiquitous Language

| Term | Meaning | Fields | Do not say |
|---|---|---|---|
| **Drone** | Lendable aircraft | `Id`, `Name`, `Description` | device, inventory item |
| **StudentGroup** | Borrowing, responsible student group | `Id`, `Name` | class, team, user |
| **Loan** | Lending transaction — the central entity, connects drone, group, time and accessories | `Id`, `DroneId`, `StudentGroupId`, `LoanDate`, `ReturnDate`, `Status` | rental, issue, booking, reservation |
| **LoanItem** | Accessory line of a loan | `Id`, `LoanId`, `Type` (`Battery` \| `Propeller`), `Quantity` | accessory list, attachment |
| **Status** (`LoanStatus`) | State of a loan | `Active`, `Returned` | open/closed |
| **Availability** | State of a drone as seen from its loans | `Available`, `Loaned` | free, taken (as a field name) |

Synonyms are forbidden because they break the trace from code back to
requirement: a `Loan` is called `Loan` in the spec, in the code and in the
issue.

---

## 2. Model sketch

```
┌─────────────────────────── Aggregate: Loan ───────────────────────────┐
│  Loan (aggregate root)                                                │
│    Id, DroneId, StudentGroupId, LoanDate, ReturnDate?, Status          │
│    └── LoanItem (entity, exists only inside the loan)
│          Id, LoanId, Type, Quantity                                    │
└────────────────────────────────────────────────────────────────────────┘
        │ references by id                │ references by id
        ▼                                 ▼
┌──────────────────────┐        ┌──────────────────────────┐
│ Aggregate: Drone     │        │ Aggregate: StudentGroup  │
│ Id, Name, Description│        │ Id, Name                 │
└──────────────────────┘        └──────────────────────────┘
```

---

## 3. Entities, value objects, aggregates

**Entities** — `Drone`, `StudentGroup` and `Loan` have their own identity
(`Id`), a lifecycle and mutable state. A renamed `Drone` is still the same
`Drone`.

**Entity inside an aggregate** — `LoanItem` needs an `Id` but never exists
without its `Loan`.

**Value objects and enums** — `Type`, `Quantity`, `Status`, `LoanDate` and
`ReturnDate` have no identity of their own and are compared by value.

**Aggregate boundaries and their consequences** — `Loan` is the aggregate
root; writes go through `Loan`, never through a `LoanItem` alone. `Drone` and
`StudentGroup` live in their own aggregates and are referenced by `Id` only.
Domain Rule 1 therefore cannot be checked inside `Drone`: answering "does this
drone already have an active loan?" needs the `Loan` view and belongs in a
backend application service.

---

## 4. Domain rules

Numbering follows `drohnenverwaltung.md` §4. Each rule has exactly one
enforcement point in the backend; the frontend may validate in addition.

| # | Rule | Enforced by | Requirements |
|---|---|---|---|
| 1 | A drone has at most one active loan | loan application service on create, plus a database constraint (unique active loan per `DroneId`) | REQ-004, REQ-005, REQ-007 |
| 2 | Only available drones may be loaned | the same service, precondition `Available` | REQ-004 |
| 3 | Returning a loan makes the drone available again | service on return: `Status = Returned`, set `ReturnDate` | REQ-008, REQ-009 |
| 4 | Availability (`Available` \| `Loaned`) follows from the active loan | projection in the drone query, no maintained column (see §6) | REQ-001, REQ-002, REQ-007, REQ-008 |
| 5 | Battery and propeller quantities are integer and never negative | backend validation (`Quantity >= 0`, `Type` from an enum) | REQ-006 |
| 6 | Returned loans stay stored | no delete in the model; history query instead of deletion | REQ-010 |

Rules 1 and 2 are not the same rule. Rule 1 forbids a second record, Rule 2
forbids the action on an unavailable drone — both are tested separately.

---

## 5. Reference example as a test case

```
Student Group: Group 3
Drone:         TELLO-07
Loan Date:     19.08.2026
Status:        Active
Accessories:   4 Batteries, 8 Propellers
```

| Object | Instances |
|---|---|
| `StudentGroup` | 1 ("Group 3") |
| `Drone` | 1 ("TELLO-07") |
| `Loan` | 1 (`Active`, `LoanDate = 19.08.2026`, `ReturnDate = null`) |
| `LoanItem` | 2 (`Battery`, 4) and (`Propeller`, 8) |

After the return only `Loan.Status = Returned` and `Loan.ReturnDate` change;
the `LoanItem`s are untouched and the record survives (Rule 6). The drone
shows as `Available` in REQ-002, disappears from REQ-007 and appears in
REQ-010. Every spec and every test is checked against this example.

---

## 6. Decision D-001 — store status or derive it?

**Question:** does `Drone` get a `Status` column, or is `Available` / `Loaned`
computed from the active `Loan` on each query?

| Criterion | A: column `Drone.Status` | B: derived from the active `Loan` |
|---|---|---|
| Two sources of truth | yes — column and loan can drift apart | no, single source |
| Rules 1 and 4 in one place | no, scattered | yes |
| Write path | every loan and return must update the column | only `Loan` is written |
| Query cost | trivial | one join/aggregate per query (irrelevant at this data volume) |
| Failure mode | drone reads "Available" while a loan is active | none of that kind |

**Proposal:** **B** — derive the status. `Available` holds exactly when no
`Loan` with `Status = Active` exists for that `DroneId`. "Two sources of truth
are one source of errors" (`drohnenverwaltung.md` §4).

**Consequences:** no `Status` column on `Drone`; the `Status` in REQ-002 is a
projection of the API response, not stored data. Rule 1 additionally gets a
database constraint (unique active loan per `DroneId`) so parallel requests
cannot break it.

**State:** open — the team decides. If the decision flips to A, the wording of
REQ-002, REQ-007 and REQ-008 changes; the observable behavior does not.

---

## 7. Open model questions

| ID | Question | Note |
|---|---|---|
| Q-1 | Is `Quantity` a value object with its own rule (never negative) or an `int` validated in the backend? | affects where Rule 5 lives |
| Q-2 | Does `Loan` need a business id (e.g. `L-2026-001`) or is the technical `Id` enough? | affects the API contract only |
| Q-3 | Can `Drone.Name` change later? | if so, REQ-010 still renders correctly because loans reference by `Id` |
| Q-4 | Will single batteries become entities? | planned as change request 4, so no `Battery` entity now — only `LoanItem` with `Type` and `Quantity` |
