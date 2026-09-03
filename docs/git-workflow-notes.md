# Git Workflow Notes

This is a plain-English reference for the current Git/GitHub workflow. It is intentionally beginner-friendly.

## Current Approach

- `main` is the stable branch.
- Feature or fix work should happen on a separate branch.
- When a branch is ready, open a Pull Request (PR) into `main`.
- After review/checking, merge the PR into `main`.
- After merging, delete the feature branch and prune old remote branch references.

## What Happened Recently

Recent merges, newest first:

- `feat/scoped-issp-distribution` (merged as `dda843e`, 2026-09-03; local merge, branch deleted) — scoped `.issp` distribution: Distribute per-office copies, offices edit offline, Consolidate merges returns with conflict review.
- PR #3 `feat/annex1` (2026-06-21) — standalone Annex 1 form.
- PR #2 `harden-local-store-import` (2026-06-19) — safer browser storage, better `.issp` import validation, better save/import/clear error messages, mobile sidebar file actions, toast notifications.

Note: not every merge goes through a PR — some are plain local merges (`git merge` on `main`). Both paths are fine; a PR is preferred when you want the record on GitHub.

After merge cleanup:

```bash
git fetch --prune
git branch -d <merged-branch>
```

`git fetch --prune` removes stale remote branch references from the local machine.

`git branch -d <branch>` deletes a local branch after it has already been merged.

## What GitHub Is Warning About

GitHub warned that `main` is not protected from:

- Force pushes.
- Branch deletion.
- Merging changes without required checks.

Plain-English meaning: GitHub is saying `main` can still be accidentally damaged.

## Branch Protection, Later

We do not need to deal with this immediately before continuing feature work.

When ready, protect `main` in GitHub settings:

- Block force pushes.
- Block branch deletion.
- Require a Pull Request before merging.
- Eventually require status checks before merging.

Recommended order:

1. Protect `main` from force pushes and deletion.
2. Add GitHub Actions CI.
3. Require the CI checks before merging PRs.

Do not enable required status checks before CI exists, because GitHub can become confusing if there are no checks to select or run.

## Simple Day-to-Day Commands

Check current status:

```bash
git status --short
```

Create a new branch:

```bash
git switch -c my-feature-branch
```

Commit work:

```bash
git add path/to/file
git commit -m "short description of change"
```

Push a branch:

```bash
git push -u origin my-feature-branch
```

After a PR is merged:

```bash
git switch main
git pull
git fetch --prune
git branch -d my-feature-branch
```

## Local Files (resolved)

The previously-untracked May 25 reference files (`references/ISSP Orientation DICT May 25.json`, `references/ISSP Template Handout May 25.pdf`, `references/ISSP_Orientation_Notes_May25.md`) were committed in `0f6ff3d` (2026-06-20). `tailwind.config.*` never existed — the project uses Tailwind 4 CSS-first configuration. Nothing is pending here.
