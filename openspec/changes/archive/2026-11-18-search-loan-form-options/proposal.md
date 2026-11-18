# Proposal

## Why

The loan form shows a list of clickable options while a list has at most 6 entries and a search box above that. The form therefore changes its height and look with the number of available drones and student groups, for example after a return or a new group. A search box for every list with 2 or more entries keeps the form the same size and works the same way every time.

## What Changes

- The loan form shows a search box for the drone and for the student group whenever the list has 2 or more options. Opening the box without text offers all options.
- A list with exactly one option still shows that option as a visible, already chosen option with its description, without a search box.
- An empty list keeps its text ("No drones available.", "No student groups yet.").

## Capabilities

### Modified Capabilities

- `loan`: "Choose from a short list of options" and "Search a long list of options" are replaced by "Show a single option" and "Search the options", which applies from 2 options (REQ-004, REQ-005).

## Impact

- Frontend: `OptionPicker` list limit from 6 to 1, its test helpers drive the search box, and the loan form, Loans page and Drones page specs that choose options.
- No backend change.
