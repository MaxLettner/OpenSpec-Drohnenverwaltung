# Requirements — Drone Lending System

Source of truth for the OpenSpec change `initial-drone-lending-system`.
Derived from `drohnenverwaltung.md` §2 (scope), §4 (domain model) and §5
(requirements). Terms come from `domain-model.md`; the domain rules are
numbered there and referenced here.

Every requirement has one **SHALL** statement and at least one testable
**Given/When/Then** scenario. Requirement IDs are stable and travel unchanged
into specs, tasks and GitHub issues.

---

## 1. Scope

### In scope

| Capability | Requirements |
|---|---|
| Manage | REQ-001, REQ-002, REQ-003 |
| Lend | REQ-004, REQ-005, REQ-006 |
| Return | REQ-008, REQ-009 |
| Trace | REQ-007, REQ-010 |

### Out of scope

Deliberately excluded from this change, not to be implemented on the side:

- No login, no user accounts, no roles
- No item-level inventory of batteries (BAT-001 …)
- No advance reservations
- No damage management, no return discrepancies
- No reports, statistics or exports
- No edit or delete operations for drones, groups or loans
- No search, filtering or sorting

Further features arrive as separate change requests (`drohnenverwaltung.md` §7).

---

## 2. Manage

### REQ-001 — Create drone

The system SHALL create a drone with `Name` and `Description` (free text) and
assign it an `Id`. `Status` SHALL NOT be an input; it follows from the drone's
loans (Domain Rule 4).
Example: `TELLO-07`, "SSID: TELLO-9FA21B, right propeller guard damaged".

```gherkin
Scenario: Create a drone
  GIVEN no drone named "TELLO-07" exists
  WHEN a drone "TELLO-07" with a description is created
  THEN the drone "TELLO-07" exists with status "Available"

Scenario: Status is not an input
  GIVEN a drone creation request
  WHEN the request contains a status "Loaned"
  THEN the request is rejected with a validation error
  AND no drone is created

Scenario: Description is free text and optional
  GIVEN a drone is created without a description
  THEN the drone exists with an empty description
```

### REQ-002 — Show drones

The system SHALL list all drones with `Name`, `Status` (`Available` |
`Loaned`) and `Description`. The status SHALL be derived from the drone's
active loan (Domain Rules 1 and 4).

```gherkin
Scenario: List drones with and without a loan
  GIVEN "TELLO-02" has an active loan
  AND "TELLO-07" has no active loan
  WHEN the drone list is requested
  THEN "TELLO-02" is listed with status "Loaned"
  AND "TELLO-07" is listed with status "Available"

Scenario: Empty inventory
  GIVEN no drone exists
  WHEN the drone list is requested
  THEN an empty list is returned
```

### REQ-003 — Create student group

The system SHALL create a student group with `Name` and assign it an `Id`.
Example: "Group 3". Later extensions (`Class`, `Members`,
`ResponsibleStudent`) are possible but are not part of this change.

```gherkin
Scenario: Create a student group
  GIVEN no student group named "Group 3" exists
  WHEN the student group "Group 3" is created
  THEN the student group "Group 3" exists with a generated id

Scenario: Groups are listable for loan selection
  GIVEN the student groups "Group 1" and "Group 3" exist
  WHEN the student group list is requested
  THEN both groups are returned
```

---

## 3. Lend

### REQ-004 — Loan a drone

The system SHALL loan an available drone to an existing student group and
create an active `Loan` with `LoanDate` and `Status = Active`
(Domain Rule 2).

```gherkin
Scenario: Loan an available drone
  GIVEN the drone "TELLO-07" is available
  AND the student group "Group 3" exists
  WHEN "TELLO-07" is loaned to "Group 3"
  THEN an active loan is created
  AND the loan records "Group 3", "TELLO-07" and the loan date

Scenario: Loan to an unknown group
  GIVEN the drone "TELLO-07" is available
  AND no student group "Group 9" exists
  WHEN "TELLO-07" is loaned to "Group 9"
  THEN the loan is rejected
  AND no loan is created
```

### REQ-005 — No duplicate loan

The system SHALL ensure a drone has at most one active loan (Domain Rule 1).
A second attempt SHALL be rejected without changing the existing state.

```gherkin
Scenario: Reject a second loan
  GIVEN "TELLO-07" already has an active loan
  WHEN another group tries to loan it
  THEN the loan is rejected
  AND exactly one active loan for "TELLO-07" exists

Scenario: Reject an unavailable drone
  GIVEN "TELLO-07" has status "Loaned"
  WHEN "TELLO-07" is loaned again
  THEN the loan is rejected
```

### REQ-006 — Loan accessories

The system SHALL store `LoanItem`s of type `Battery` and `Propeller` with an
integer quantity when a drone is loaned. Quantities `>= 0` are valid; the
backend SHALL reject negative quantities and unknown types (Domain Rule 5).
Example: 4 batteries, 8 propellers.

```gherkin
Scenario: Record accessories with the loan
  GIVEN the drone "TELLO-07" is available
  AND the student group "Group 3" exists
  WHEN "TELLO-07" is loaned to "Group 3" with 4 batteries and 8 propellers
  THEN the loan has a battery item with quantity 4
  AND the loan has a propeller item with quantity 8

Scenario: Negative quantity is rejected
  GIVEN the drone "TELLO-07" is available
  WHEN "TELLO-07" is loaned with -1 batteries
  THEN the request is rejected with a validation error
  AND no loan is created

Scenario: Zero quantity is allowed
  GIVEN the drone "TELLO-07" is available
  WHEN "TELLO-07" is loaned with 0 batteries
  THEN the loan is created with a battery quantity of 0

Scenario: Unknown accessory type is rejected
  GIVEN the drone "TELLO-07" is available
  WHEN "TELLO-07" is loaned with 2 chargers
  THEN the request is rejected with a validation error
```

---

## 4. Return

### REQ-008 — Return a loan

The system SHALL set an active loan to `Returned`, which makes the drone
available again (Domain Rules 3 and 4). A loan that is already returned SHALL
NOT be returned again.

```gherkin
Scenario: Return a loan
  GIVEN "TELLO-07" is loaned to "Group 3"
  WHEN the loan is returned
  THEN the loan is marked as returned
  AND "TELLO-07" becomes available again

Scenario: Return twice is rejected
  GIVEN a loan for "TELLO-07" is already returned
  WHEN the same loan is returned again
  THEN the request is rejected
  AND the loan stays returned
```

### REQ-009 — Store the return date

The system SHALL set `ReturnDate` when a loan is returned. An active loan
SHALL have no `ReturnDate`; a set `ReturnDate` SHALL be retained.

```gherkin
Scenario: ReturnDate is set on return
  GIVEN "TELLO-07" is loaned to "Group 3"
  WHEN the loan is returned
  THEN the loan has a return date
  AND the return date is not before the loan date

Scenario: Active loan has no return date
  GIVEN "TELLO-07" has an active loan
  THEN that loan has no return date
```

---

## 5. Trace

### REQ-007 — Show active loans

The system SHALL list all active loans with the columns `Group`, `Drone`,
`Batteries`, `Propellers` and `Loan Date`. The accessory columns SHALL show
the sum of quantities per type, and `0` when there is no such item.
`Loan Date` SHALL be displayed as `dd.MM.yyyy`.

```gherkin
Scenario: Active loan list matches the reference example
  GIVEN "TELLO-02" is loaned to "Group 1" with 3 batteries and 4 propellers on 19.08.2026
  AND "TELLO-07" is loaned to "Group 3" with 4 batteries and 8 propellers on 19.08.2026
  WHEN the active loan list is requested
  THEN it contains the row "Group 1 | TELLO-02 | 3 | 4 | 19.08.2026"
  AND it contains the row "Group 3 | TELLO-07 | 4 | 8 | 19.08.2026"

Scenario: Returned loans are not active
  GIVEN a loan for "TELLO-07" was returned
  WHEN the active loan list is requested
  THEN that loan is not listed

Scenario: Loan without accessories
  GIVEN "TELLO-07" is loaned to "Group 3" without accessories
  WHEN the active loan list is requested
  THEN the row shows 0 batteries and 0 propellers
```

### REQ-010 — Show loan history

The system SHALL retain returned loans permanently and show them in a history
with group, drone, accessories, `LoanDate` and `ReturnDate` (Domain Rule 6).
Returned loans SHALL never be deleted.

```gherkin
Scenario: Returned loan stays in history
  GIVEN "TELLO-07" was loaned to "Group 3" and returned
  WHEN the loan history is requested
  THEN the loan is listed with its loan date and return date

Scenario: Return does not delete the loan
  GIVEN a loan for "TELLO-07" is active
  WHEN the loan is returned
  THEN the same loan still exists with status "Returned"
  AND its accessory quantities are unchanged
```

---

## 6. Traceability

| Requirement | Planned spec | Domain rules | Depends on |
|---|---|---|---|
| REQ-001 | `specs/drone/spec.md` | 4 | D-001 |
| REQ-002 | `specs/drone/spec.md` | 1, 4 | D-001 |
| REQ-003 | `specs/student-group/spec.md` | — | — |
| REQ-004 | `specs/loan/spec.md` | 2 | REQ-003 |
| REQ-005 | `specs/loan/spec.md` | 1 | D-001 |
| REQ-006 | `specs/loan/spec.md` | 5 | REQ-004 |
| REQ-007 | `specs/loan/spec.md` | 1, 3, 4, 5 | REQ-004 |
| REQ-008 | `specs/loan/spec.md` | 3, 4 | REQ-004 |
| REQ-009 | `specs/loan/spec.md` | 3, 6 | REQ-008 |
| REQ-010 | `specs/loan/spec.md` | 6 | REQ-008 |

---

## 7. Decisions to settle before the change is proposed

The agent proposes, the team decides (`drohnenverwaltung.md` §8).

| ID | Question | Current draft |
|---|---|---|
| D-001 | Is drone status stored or derived from the active loan? | derived, see `domain-model.md` §6 |
| O-002 | Status field in the create request: reject or ignore? | reject (REQ-001) |
| O-003 | Must group names be unique? | open — the assignment is silent |
| O-004 | Is `LoanDate` a date or a timestamp? | display is `dd.MM.yyyy`, precision open |
| O-005 | Several `LoanItem`s of the same type per loan (summed in REQ-007) or exactly one per type? | open |
| O-006 | Date format in the API: ISO-8601 or local? | affects REQ-007 and REQ-010 |
