# Spec Delta

## Purpose

Describes how the Drone Lending System starts and is delivered: its database is ready on every start, its data survives restarts, and the app and the API are reachable from one address, also when it runs as a container.

## ADDED Requirements

### Requirement: Database ready on every start
Per REQ-001 to REQ-010 the system SHALL, at every start and in every environment, create its database when none exists and bring an existing database to the current schema, before it answers requests. Drones, student groups and loans already stored SHALL stay unchanged.

#### Scenario: First start in Production
- **GIVEN** no database file exists
- **WHEN** the system starts in Production
- **THEN** the drone list is empty
- **AND** creating the drone "TELLO-07" succeeds

#### Scenario: Start on an older database
- **GIVEN** a database created before the latest schema change holds the drone "TELLO-07" and a returned loan
- **WHEN** the system starts in Production on it
- **THEN** the drone list contains "TELLO-07"
- **AND** the history still shows the returned loan

### Requirement: Data survives a restart
Per REQ-010 the system SHALL keep drones, student groups and loans, active and returned, in the database file its configuration names, so that they are still there after the system stops and starts again on the same file.

#### Scenario: Restart keeps the loans
- **GIVEN** the system runs on a database file
- **AND** "TELLO-07" is loaned to "Group 3" with 4 batteries and 8 propellers
- **AND** a second loan has been returned
- **WHEN** the system stops and starts again on the same file
- **THEN** the active loans list shows "Group 3", "TELLO-07", 4 batteries and 8 propellers
- **AND** the history shows the returned loan

### Requirement: App and API from one address
The system SHALL serve the web app and the REST API from the same address. Every address under `/api` SHALL be answered by the API, with 404 for an unknown one. Every other address that names no file SHALL open the web app, so that its pages can be opened directly.

#### Scenario: Open the root address
- **GIVEN** the system runs with the built web app
- **WHEN** the root address is opened
- **THEN** the web app is returned

#### Scenario: Open a page directly
- **GIVEN** the system runs with the built web app
- **WHEN** the address `/loans` is opened
- **THEN** the web app is returned

#### Scenario: API next to the app
- **GIVEN** the system runs with the built web app
- **WHEN** `/api/drones` is requested
- **THEN** the drone list is returned as JSON

#### Scenario: Unknown API address
- **GIVEN** the system runs with the built web app
- **WHEN** `/api/unknown` is requested
- **THEN** the answer is 404 and not the web app

### Requirement: Run as a container
The system SHALL be startable from the repository with one command as a single container that serves the app and the API on one port and keeps its database on a volume. Removing and recreating the container SHALL keep the data; removing the volume SHALL start over with an empty database.

#### Scenario: Start the container
- **GIVEN** a clone of the repository and Docker
- **WHEN** the container is started with the documented command
- **THEN** the web app and `/api/drones` answer on the documented port
- **AND** the drone list is empty

#### Scenario: Recreate the container
- **GIVEN** the container runs and the drone "TELLO-07" was created
- **WHEN** the container is removed and started again with the documented command
- **THEN** the drone list contains "TELLO-07"

#### Scenario: Remove the volume
- **GIVEN** the container runs and the drone "TELLO-07" was created
- **WHEN** the container and its volume are removed and the container is started again
- **THEN** the drone list is empty
