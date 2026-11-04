---
name: openspec-to-github
description: Create and synchronize GitHub Issues from OpenSpec requirements and tasks, and add them to the GitHub Project.
---

# OpenSpec to GitHub

Use this skill to turn the tasks of an OpenSpec change into GitHub Issues and put them on the project board. It must be **idempotent**: running it twice never creates duplicate issues.

Always use this Github project: `OpenSpec Drohnenverwaltung Project` (owner `MaxLettner`, number `4`, repository `MaxLettner/OpenSpec-Drohnenverwaltung`).

Input: an optional change name (e.g. `initial-drone-lending-system`). If omitted, use the only active change in `openspec/changes/` (excluding `archive/`); if there are several, ask which one.

## Workflow

1. Determine the current OpenSpec change.
2. Read `proposal.md`, `specs/**/*.md` and `tasks.md` of the change.
3. Check for duplicates: `gh issue list --repo MaxLettner/OpenSpec-Drohnenverwaltung --state all --limit 200 --json number,title,body`. A task already has an issue if `tasks.md` carries its issue number, or an existing issue has the same title and the same change name in the body.
4. For each task without an issue, create one issue:
   - Title: the task text (short, imperative, e.g. `Implement Loan API`), without the checkbox.
   - Body: `OpenSpec change: <change-name>`, the task description, the covered `REQ-xxx` IDs, the relevant spec files, and the Given/When/Then scenarios to be tested.
   - Do not close, delete or edit unrelated issues.
5. Add each new issue to the GitHub Project with status `Backlog`.
6. Write the issue number back into `tasks.md` next to the task (e.g. `- [ ] 3.2 Implement Loan API (#16)`). Do not tick any checkbox.
7. Report which issues were created and which were skipped as existing.

## GitHub tools

Prefer the GitHub CLI `gh`.

```bash
gh issue create --repo MaxLettner/OpenSpec-Drohnenverwaltung \
  --title "Implement Loan API" \
  --body "OpenSpec change: initial-drone-lending-system"

gh project item-add 4 --owner MaxLettner \
  --url https://github.com/MaxLettner/OpenSpec-Drohnenverwaltung/issues/16
```

Set the `Status` field of an item (options: Backlog, Ready, In progress, In review, Done):

```bash
gh project field-list 4 --owner MaxLettner --format json     # field and option ids
gh project item-list 4 --owner MaxLettner --format json      # item ids
gh project item-edit --id <ITEM_ID> --project-id <PROJECT_ID> \
  --field-id <STATUS_FIELD_ID> --single-select-option-id <OPTION_ID>
```

Project id: `gh project view 4 --owner MaxLettner --format json`.
