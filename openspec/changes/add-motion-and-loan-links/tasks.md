# Tasks

Each task becomes one GitHub issue, one branch and one pull request. Every Given/When/Then scenario of the delta specs is covered by an automated test in the task that implements it.

## 1. Features

- [x] 1.1 Open the group and drone dialogs from the Loans page: `studentGroupId` and `droneId` in active loan rows (design D1); tests for "Open details from the Loans page", "Active loan list matches the reference example" — REQ-007 (#158)
- [x] 1.2 Remove the "Home" navigation entry and mark the app name on Home (design D2); tests for "Open the app", "Go home from the header" — REQ-002 (#159)

## 2. Motion

- [x] 2.1 Dialog fade and scale, blurred backdrop and button press feedback (design D3); tests for the dialog and press part of "Reduced motion" (#160)
- [x] 2.2 Count up the Home figures and grow the ring chart and weekly bars (design D3); tests for "Home figures count up" and the Home part of "Reduced motion" — REQ-002 (#161)
- [ ] 2.3 Fade in table rows one after another and show loading placeholders (design D3); tests for "Loading the drone list" and the list part of "Reduced motion" (#162)

## 3. Styling (no spec change)

- [x] 3.1 Make the card border highlight softer in the dark theme (design D4); check both themes in the browser (#163)
