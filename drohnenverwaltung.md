# Projekt: Drohnenverwaltung

**SYP – Systemplanung und Projektentwicklung · 4. INF · 2026/27**
DI (FH) Markus Falkensteiner · Einstiegsprojekt

Ein kleines, aber vollständig durchgezogenes Softwareprojekt nach dem Workflow aus dem Beispiel *Student Website*. Es bereitet auf das zweite Semester vor, in dem ihr mit Scrum und demselben Workflow eine echte Tello-Drohne programmiert. Das Werkzeug, das ihr jetzt baut, verwendet ihr dort selbst.

**Bewertet wird Nachvollziehbarkeit, nicht Codemenge.**

---

## 1. Lernziele

- Anforderungen selbst formulieren, statt sie vorgegeben zu bekommen
- Die Fachdomäne mit **DDD** modellieren und benennen
- Verhalten mit **OpenSpec** spezifizieren, *bevor* Code entsteht
- Arbeit über **GitHub Issues** und ein **GitHub Project** organisieren
- Einen **KI-Coding-Agenten** gezielt steuern – Task für Task
- Jede Codezeile auf eine Anforderung zurückführen können

---

## 2. Aufgabenstellung

Drohnen und Zubehör werden an Schülergruppen ausgeliehen. Die Anwendung ersetzt den Zettel an der Schranktür – nur nachvollziehbar und dauerhaft. Sie beantwortet:

- Welche Drohnen gibt es, welche sind gerade verfügbar?
- Welche Gruppe hat welche Drohne, mit wie vielen Akkus und Propellern?
- Wann wurde ausgeliehen, wann zurückgegeben?
- Welche Ausleihen gab es in der Vergangenheit?

| Funktion | Inhalt |
|---|---|
| **Verwalten** | Drohnen anlegen und anzeigen, Schülergruppen anlegen |
| **Ausleihen** | Drohne inkl. Akkus und Propellern an eine Gruppe ausgeben |
| **Zurücknehmen** | Ausleihe abschließen, Drohne wieder freigeben |
| **Nachvollziehen** | Aktive Ausleihen anzeigen, alte Ausleihen aufbewahren |

### Out of Scope

Gehört ausdrücklich in die Anforderungen und ins `proposal.md`:

- Kein Login, keine Benutzerkonten, keine Rollen
- Keine Einzelinventarisierung von Akkus (BAT-001 …)
- Keine Reservierungen im Voraus
- Keine Schadensverwaltung, keine Rückgabedifferenzen
- Keine Auswertungen, Statistiken oder Exporte

Grund: Ein Change muss abschließbar sein. Alles Weitere kommt später als eigener Change Request (→ [Abschnitt 7](#7-change-requests)).

---

## 3. Technik und Architektur

| Bereich | Technologie |
|---|---|
| Frontend | Angular, TypeScript |
| Backend | C#, ASP.NET Core 10 Web API |
| Persistenz | Entity Framework Core, SQLite |
| Werkzeuge | VS Code, Git/GitHub, GitHub CLI (`gh`), OpenSpec, KI-Coding-Agent |

```
Angular Frontend        (frontend/drone-inventory-ui)
      │  REST / JSON
      ▼
ASP.NET Core Web API    (backend/DroneInventory.Api)
      │
      ▼
Entity Framework Core → SQLite
```

**Verbindliche Vorgaben** (stehen auch in `config.yaml` und `AGENTS.md`):

- Backend, Frontend und Specs liegen in **einem** Repository, sonst driften sie auseinander.
- Das Frontend spricht ausschließlich über die REST-API mit dem Backend, nie direkt mit der Datenbank.
- Geschäftslogik, Validierung und die Ausleihregeln liegen im **Backend** – nicht in einem Angular-Formular.

---

## 4. Domäne (DDD)

### Ubiquitous Language

Diese Begriffe gelten überall: Anforderungen, Spec, Code, Datenbank, Gespräch. Keine Synonyme wie „Verleih“, „Ausgabe“ oder „Buchung“ – wer sauber benennt, wird auch vom Agenten verstanden.

| Begriff | Bedeutung | Felder |
|---|---|---|
| **Drone** | Ausleihbares Fluggerät | Id, Name, Description |
| **StudentGroup** | Ausleihende, verantwortliche Schülergruppe | Id, Name |
| **Loan** | Ausleihvorgang – zentrale Entity, verbindet Drohne, Gruppe, Zeit und Zubehör | Id, DroneId, StudentGroupId, LoanDate, ReturnDate, Status |
| **LoanItem** | Zubehörposition einer Ausleihe | Id, LoanId, Type (`Battery` \| `Propeller`), Quantity |

`LoanItem` existiert nur innerhalb eines `Loan` – ein guter Anlass, über Entity, Value Object und Aggregate zu diskutieren.

### Domain Rules

1. Eine Drohne hat höchstens eine aktive Ausleihe.
2. Nur verfügbare Drohnen dürfen ausgeliehen werden.
3. Eine Rückgabe macht die Drohne wieder verfügbar.
4. Die Verfügbarkeit (`Available` | `Loaned`) ergibt sich aus der aktiven Ausleihe.
5. Akkus und Propeller werden nur als ganzzahlige Menge geführt, nie negativ.
6. Zurückgegebene Ausleihen bleiben gespeichert.

> **Diskussionsfrage:** Den Drohnen-Status als eigenes Datenbankfeld speichern oder aus der aktiven Ausleihe berechnen? Zwei Wahrheiten sind eine Fehlerquelle.

### Referenzbeispiel

```
Student Group: Group 3
Drone:         TELLO-07
Loan Date:     19.08.2026
Status:        Active
Accessories:   4 Batteries, 8 Propellers
```

Daraus lassen sich Drone, StudentGroup, Loan und zwei LoanItems ablesen. Nach der Rückgabe ändern sich nur `Status` und `ReturnDate` – der Datensatz bleibt bestehen. Prüft eure Specs immer gegen ein konkretes Beispiel wie dieses.

---

## 5. Anforderungen

**Format:** Jede Anforderung mit **SHALL** und mindestens einem **Given/When/Then**-Szenario. Sie liegen als Dokument im Repository und sind der Input für OpenSpec. Zehn Anforderungen sind bewusst wenig – dafür vollständig durchgezogen. Daraus entstehen rund 20 Tasks und ebenso viele Issues.

| ID | Anforderung | Details |
|---|---|---|
| REQ-001 | Drohne anlegen | Felder Id, Name, Description (Freitext). Status wird **nicht** eingegeben. Bsp.: `TELLO-07`, „SSID: TELLO-9FA21B, rechter Propellerschutz beschädigt“ |
| REQ-002 | Drohnen anzeigen | Liste mit Name, Status (`Available` \| `Loaned`), Beschreibung |
| REQ-003 | Schülergruppe anlegen | Felder Id, Name. Bsp.: „Group 3“. Spätere Erweiterungen denkbar: Class, Members, ResponsibleStudent |
| REQ-004 | Drohne ausleihen | Eine verfügbare Drohne SHALL an eine Gruppe ausgeliehen werden können |
| REQ-005 | Keine doppelte Ausleihe | Eine Drohne SHALL höchstens eine aktive Ausleihe haben |
| REQ-006 | Zubehör ausleihen | Typen `Battery`, `Propeller`; Mengen ganzzahlig ≥ 0, negative lehnt das Backend ab. Bsp.: 4 Batteries, 8 Propellers |
| REQ-007 | Aktive Ausleihen anzeigen | Spalten siehe unten |
| REQ-008 | Ausleihe zurückgeben | Loan `Active → Returned`, Drone `Loaned → Available` |
| REQ-009 | Rückgabedatum speichern | `ReturnDate` wird bei der Rückgabe gesetzt |
| REQ-010 | Ausleihhistorie anzeigen | Zurückgegebene Ausleihen werden nie gelöscht – sonst ist die Historie weg |

**REQ-007 – erwartete Anzeige:**

| Group | Drone | Batteries | Propellers | Loan Date |
|---|---|---|---|---|
| Group 1 | TELLO-02 | 3 | 4 | 19.08.2026 |
| Group 3 | TELLO-07 | 4 | 8 | 19.08.2026 |

**Beispielszenarien:**

```gherkin
# REQ-004
Scenario: Loan an available drone
  GIVEN the drone "TELLO-07" is available
  AND the student group "Group 3" exists
  WHEN "TELLO-07" is loaned to "Group 3"
  THEN an active loan is created

# REQ-005
Scenario: Reject a second loan
  GIVEN "TELLO-07" already has an active loan
  WHEN another group tries to loan it
  THEN the loan is rejected

# REQ-008
Scenario: Return a loan
  GIVEN "TELLO-07" is loaned to "Group 3"
  WHEN the loan is returned
  THEN the loan is marked as returned
  AND "TELLO-07" becomes available again
```

---

## 6. Workflow

```
Problem → Requirements → DDD → OpenSpec → Tasks → GitHub Issues
→ Implementierung → Tests → Pull Request → Review → Merge → Archive → (nächster Change)
```

Nicht *Prompt → KI → Code*, sondern **verstehen → präzisieren → bauen → prüfen**. Jeder Schritt erzeugt ein lesbares, prüfbares Ergebnis.

### 6.0 Vorarbeit

Anforderungen erstellen (Abschnitt 5), Begriffe klären und das DDD-Modell skizzieren (Abschnitt 4).

### 6.1 Einmaliges Setup

**1. Repository und GitHub Project**

```bash
gh repo create drone-inventory --public --clone
cd drone-inventory
```

Gleichzeitig ein GitHub Project fürs Team anlegen, Spalten: `Backlog`, `Ready`, `In Progress`, `Review`, `Done`. Projektnamen merken (wird in den Skills gebraucht). Alle Teammitglieder brauchen Schreibrechte auf Repository und Project.

**2. Backend und Frontend anlegen**

```bash
cd backend   && dotnet new webapi -n DroneInventory.Api -f net10.0
cd ../frontend && ng new drone-inventory-ui
```

```
drone-inventory/
├── backend/DroneInventory.Api/
├── frontend/drone-inventory-ui/
├── openspec/
└── README.md
```

Beide Projekte einmal starten und committen. Erst wenn das Grundgerüst läuft, beginnt die Spezifikation.

**3. OpenSpec initialisieren**

```bash
npm install -g @fission-ai/openspec@latest
openspec init
```

```
openspec/
├── specs/       Sollzustand – was kann das System heute?
├── changes/     geplante Änderungen, jeweils als abgeschlossene Einheit
└── config.yaml
```

Diese Trennung ist der Kern von OpenSpec.

**4. `config.yaml` füllen** – ein Agent ohne Projektkontext erfindet Annahmen, und zwar überzeugend.

```yaml
schema: spec-driven
context: |
  Project: Drone Lending System
  Backend: C#, ASP.NET Core 10 Web API, EF Core, SQLite
  Frontend: Angular, TypeScript
  Domain concepts: Drone, StudentGroup, Loan, LoanItem
  Domain rules:
  - A drone can only have one active loan.
  - Only available drones can be loaned.
  - Returning a loan makes the drone available again.
  - Accessory quantities must not be negative.
rules:
  specs:
    - Use Given/When/Then scenarios for acceptance criteria.
    - Describe behavior, not implementation details.
```

**5. Arbeitsregeln für den Agenten** (`AGENTS.md` bzw. `.github/copilot-instructions.md`, eingecheckt – der Kontext gehört ins Projekt, nicht in einen Chatverlauf)

```markdown
## Architecture
Angular Frontend → REST/JSON → ASP.NET Core Web API → EF Core → SQLite

## Rules
- Business logic belongs in the backend.
- The frontend must never access the database directly.
- OpenSpec specifications are the source of truth.

## Project Management
- Use GitHub Issues and the GitHub Project for all work.
```

**6. GitHub CLI einrichten** – OpenSpec verwaltet keine Issues; der Agent verbindet beides über `gh`.

```bash
gh auth login                              # mit Personal Access Token
gh auth refresh -h github.com -s project   # Rechte für Projects
gh project list --owner <OWNER>            # Projektnummer finden
```

Der Token (in den GitHub-Einstellungen erzeugen) braucht Rechte für Repository, Issues und Projects und wird **niemals** committet.

**7. Skills anlegen**

`.github/skills/openspec-to-github/SKILL.md`:

```markdown
---
name: openspec-to-github
description: Create and synchronize GitHub Issues from OpenSpec requirements and tasks.
---
1. Aktuellen OpenSpec-Change bestimmen.
2. proposal.md, specs/**/*.md und tasks.md lesen.
3. Mit `gh issue list --limit 100` auf Duplikate prüfen.
4. Pro Task ein Issue anlegen, Change-Name in den Body.
5. Issue ins GitHub Project aufnehmen.
6. Issue-Nummer zurück in tasks.md eintragen.
```

Aufrufbar mit `/openspec-to-github`; der Agent nutzt ihn bei passender Aufgabe auch selbst. Analog `openspec-apply-with-github` und `openspec-archive-with-github` anlegen.

### 6.2 Change-Zyklus (wiederholt sich pro Change)

**8. Change vorschlagen**

```
/opsx:propose initial-drone-lending-system
Create the initial Drone Lending System. The system shall manage drones,
student groups, drone loans, batteries and propellers as quantities,
returns and loan history. Use the requirements and domain rules from the context.
```

```
openspec/changes/initial-drone-lending-system/
├── proposal.md   Warum? Was ist im Scope?
├── design.md     Technischer Ansatz
├── tasks.md      Arbeitsschritte
└── specs/        drone/, student-group/, loan/
```

Ergebnis sind Dateien, kein Code. Jetzt beginnt die eigentliche Arbeit: lesen.

**9. Specs gemeinsam reviewen** – noch kein Code. Eine falsche Spec ergibt einen sauber implementierten Fehler, also Änderungen immer zuerst in der Spec.

- Sind alle zehn Anforderungen abgedeckt?
- Werden die Domänenbegriffe verwendet?
- Kann eine Drohne gleichzeitig zweimal ausgeliehen werden?
- Was genau passiert bei einer Rückgabe?
- Darf Zubehör eine negative Menge haben?
- Bleiben zurückgegebene Ausleihen erhalten?
- Sind alle Szenarien testbar formuliert?
- Steht Technik in der Spec, die dort nicht hingehört?

**10. `tasks.md` prüfen** – der Bauplan für die nächsten Wochen. Gute Tasks sind klein, unabhängig und einzeln testbar. Ein Requirement ist kein Task: REQ-004 wird z. B. zu fünf Arbeitsschritten.

| Backend | Frontend |
|---|---|
| Drone domain model | Drone list |
| StudentGroup model | Drone form |
| Loan domain model | Student group management |
| Drone API | Loan form |
| Loan API | Active loan list |
| Return operation | Return action |
| Loan validation | Loan history |
| Backend tests | |

**11. Issues erzeugen und Board füllen**

```bash
/openspec-to-github initial-drone-lending-system

# führt intern u. a. aus:
gh issue create --title "Implement Loan API" \
  --body "OpenSpec change: initial-drone-lending-system"
gh project item-add 3 --owner <OWNER> \
  --url https://github.com/<OWNER>/drone-inventory/issues/16
```

Zweimaliges Ausführen darf keine doppelten Issues erzeugen. Gearbeitet wird nur an Issues in `In Progress`.

**12. Ein Issue umsetzen** – ein Issue = ein Branch = ein Pull Request.

```bash
git switch -c feature/16-loan-api
/openspec-apply-with-github
Implement GitHub issue #16 according to the corresponding OpenSpec specification.
Only implement this task. Do not implement other OpenSpec tasks.
```

Der Agent bekommt Spec und Task, nicht „mach das Projekt“ – das ist der häufigste Fehler. Danach `git diff` lesen und jede Änderung verstehen.

**13. Tests, Pull Request, Review, Merge**

```bash
dotnet test
ng test
git diff
git add . && git commit -m "Implement loan API"
git push
```

Jedes Given/When/Then-Szenario braucht einen Test. Das Review prüft Spec-Konformität, nicht nur Syntax – „sieht gut aus“ ist keine Prüfung.

**14. Archivieren** – erst wenn alle Tasks implementiert, getestet und gemergt sind.

```
/opsx:archive

vorher:  changes/initial-drone-lending-system/specs/loan/spec.md
         specs/loan/spec.md                      (ohne die neue Regel)
nachher: specs/loan/spec.md                      (Delta eingearbeitet)
         changes/archive/2026-…-initial-drone-lending-system/
```

Danach beschreibt `specs/` wieder genau, was das System kann. Nicht archivierte Changes bedeuten: Die Specs stimmen nicht mehr.

Danach geht es mit dem nächsten Change Request zurück zu Schritt 8 – genau das ist der Unterschied zum Wasserfall.

---

## 7. Change Requests

Die Änderungen kommen absichtlich erst im Laufe des Semesters, wie in echten Projekten:

1. Beschädigte Drohnen
2. Verantwortlicher Schüler
3. Gruppenmitglieder
4. Einzelne Akkus (BAT-001 …)
5. Fehlendes Zubehör bei Rückgabe
6. Schadensmeldung bei Rückgabe
7. SSID als eigenes Feld

**Ablauf:** erst analysieren, dann proposen, dann implementieren. Bei unklaren Änderungen zuerst `/opsx:explore`. Beispiel CR 4, der das Domänenmodell deutlich verändert (aus einer Menge wird eine Entity mit eigener Identität): Ist Battery jetzt eine Entity? Braucht jeder Akku eine ID? Kann ein Akku defekt sein? Gehört ein Akku zu einer Drohne?

**Beispiel – CR 1:** *Beschädigte Drohnen dürfen nicht ausgeliehen werden.*

```markdown
/opsx:propose support-damaged-drones

## MODIFIED Requirements
### Requirement: Loan Drone
Only available and undamaged drones SHALL be loaned.

#### Scenario: Damaged drone cannot be loaned
- GIVEN the drone "TELLO-07" is damaged
- WHEN a group tries to loan the drone
- THEN the loan is rejected
```

Die bestehende Spec wird nicht überschrieben; der Change beschreibt nur das Delta. Daraus entstehen neue Tasks, Issues und Tests.

---

## 8. Spielregeln für die Arbeit mit der KI

> „Code, den du nicht erklären kannst, gehört nicht in dein Projekt.“

- Verhalten ändern heißt: zuerst die Spec ändern.
- Nur einen Task pro Agentenlauf.
- `git diff` vor jedem Commit lesen und verstehen.
- Manuelle Nacharbeit ist erlaubt, muss aber sichtbar sein.
- Keine Issues löschen, keine Tasks ungeprüft abhaken.
- Der Agent schlägt vor – die Entscheidung trefft ihr.

Der Prozess ersetzt kein Nachdenken, er macht es überprüfbar.

---

## 9. Abgabe und Bewertung

### Traceability

Bei der Abgabe muss jede Codezeile auf eine Anforderung zurückführbar sein:

```
REQ-004 Drohne ausleihen
  → openspec/specs/loan/spec.md
  → Task „Implement Loan API“
  → GitHub Issue #16
  → Branch feature/16-loan-api
  → Pull Request #25
  → Code + Tests
```

### Abzugeben

- Repository mit Backend und Frontend
- `openspec/specs` und archivierte Changes
- GitHub Issues und gefülltes Project
- Pull Requests mit Reviews
- Lauffähige Anwendung mit Tests
- Präsentation

### Typische Prüfungsfragen

- Warum ist Drone eine Entity?
- Warum nur eine aktive Ausleihe?
- Wo ist diese Regel abgesichert?
- Welche Spec fordert das Verhalten, welcher Test prüft es?

Bewertet werden Verständnis, Nachvollziehbarkeit und Tests – nicht „die KI hat es geschafft“. Vollständigkeit der Spur zählt mehr als die Anzahl der Features. **Jedes Teammitglied muss den gesamten Workflow erklären können**, nicht nur den eigenen Teil.

---

## 10. Quellen

- **Beispielprojekt Student Website:** [github.com/falkm1980/openSpecStudentWebsite](https://github.com/falkm1980/openSpecStudentWebsite) – derselbe Workflow mit Python, FastAPI und SQLite
- **OpenSpec:** [github.com/Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) (`docs/concepts.md`, `docs/getting-started.md`), [openspec.dev](https://openspec.dev)
- **GitHub CLI:** [cli.github.com](https://cli.github.com) · GitHub Projects
- **DDD:** Eric Evans, *Domain-Driven Design* (2003)
- Projektauftrag im Detail: SYP-Leitfaden „Drohnenverwaltung“
