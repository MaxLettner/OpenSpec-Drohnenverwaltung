# Design

## D1 Search from two options

`OPTION_LIST_LIMIT` in `shared/option-picker/option-picker.ts` drops from 6 to 1, so the radio list only shows a single option and the combobox shows everything else. The combobox already offers all options when it is opened without text ("Show all options" trigger or focus), so no new UI is needed. The single-option case keeps the radio card because "Choose a single option automatically" chooses it and the user sees the description.

## D2 Test helpers

`option-picker.testing.ts` gets helpers that work in both modes: `offeredOptions` opens the combobox and reads the visible items when there is no radio list, `chosenOption` reads the search input when there is no radio list, and `chooseOption` types the name and clicks the matching item. Because the combobox needs change detection and stabilisation, the helpers become `async` and take the fixture. Tests keep their scenario names and REQ IDs.
