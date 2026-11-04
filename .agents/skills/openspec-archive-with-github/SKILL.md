---
name: openspec-archive-with-github
description: Archives the current OpenSpec change and updates the corresponding GitHub Issue.
---

# OpenSpec Archive with GitHub

Use this skill to archive the current OpenSpec change and update the corresponding GitHub Issue.
Always use this Github project: `OpenSpec Drohnenverwaltung Project` (owner `MaxLettner`, number `4`, repository `MaxLettner/OpenSpec-Drohnenverwaltung`).

## Workflow

1. Update the corresponding GitHub Issues for the current OpenSpec change. Set status to "Done" and add a comment with the OpenSpec change reference (if not done before).
2. Archive the current OpenSpec change. `opsx:archive`

## GitHub tools

Prefer the GitHub CLI `gh`.

Check existing issues:

```bash
gh issue list --limit 100
```