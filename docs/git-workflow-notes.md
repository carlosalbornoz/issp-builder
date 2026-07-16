# Git Workflow Notes

This is a plain-English reference for the current Git/GitHub workflow. It is intentionally beginner-friendly.

## Current Approach

- `main` is the stable branch.
- Feature or fix work should happen on a separate branch.
- When a branch is ready, open a Pull Request (PR) into `main`.
- After review/checking, merge the PR into `main`.
- After merging, delete the feature branch and prune old remote branch references.

## What Happened Recently

We created and merged a branch named `harden-local-store-import`.

That branch added:

- Safer browser storage handling.
- Better `.issp` import validation.
- Better save/import/clear error messages.
- Mobile sidebar file actions.
- Upper-right toast notifications.

The branch was merged into `main` through PR #2.

After merge cleanup:

```bash
git fetch --prune
git branch -d harden-local-store-import
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

## Local Files Still Needing a Decision

At the time this note was written, there were untracked local files that had not been committed:

- `references/ISSP Orientation DICT May 25.json`
- `references/ISSP Template Handout May 25.pdf`
- `references/ISSP_Orientation_Notes_May25.md`
- `tailwind.config.*`

These are not part of the merged work yet. Decide later whether to keep/commit them or delete them.
