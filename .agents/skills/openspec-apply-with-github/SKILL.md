---
name: openspec-apply-with-github
description: Updates the Github Issue and execute opsx:apply
---

# OpenSpec Apply with GitHub

Use this skill to apply the current OpenSpec change to the local repository and synchronize with GitHub Issues and the configured GitHub Project.
Always use this Github project: `OpenSpec Student Website Project`

## Workflow

1. Update the corresponding GitHub Issues for the current OpenSpec change. Set status to "In Progress" and add a comment with the OpenSpec change reference.
2. Execute `opsx:apply` to apply the OpenSpec change to the local repository
3. Do not set the status to "Done" or archive the OpenSpec change.

## GitHub tools

Prefer the GitHub CLI `gh`.

Check existing issues:

```bash
gh issue list --limit 100
```