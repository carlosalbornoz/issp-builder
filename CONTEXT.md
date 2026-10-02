# ISSP Builder

A local-first web tool that lets Philippine government agencies fill, validate, and export their three-year Information Systems Strategic Plan (ISSP) as a PDF, per the DICT 2026 template. There are no accounts and no server-side storage; each user's data lives in their browser and is shared as a `.issp` file.

## Language

### The document

**ISSP**:
A Philippine government agency's three-year Information Systems Strategic Plan, mandated by and submitted to DICT.
_Avoid_: "the plan", "the form"

**DICT**:
The Department of Information and Communications Technology — the body that mandates the ISSP and receives the submission.
_Avoid_: "the regulator"

**MITHI**:
The Medium-Term ICT Harmonization Initiative — the inter-agency framework that the ISSP's strategic-alignment and harmonization fields map onto.

**Part I / II / III / IV**:
The four mandatory sections of the ISSP. Part I = mandate & organization; Part II = current ICT state & concerns; Part III = proposed systems & projects; Part IV = three-year budget.

**Visible value**:
What the editor shows for a field whose display depends on another answer (a ticked box, a Yes/No answer, a status). A hidden value stays in the file, so it comes back when the answer changes back, but the PDF and every report use only visible values.
_Avoid_: "stale value", "leftover data"

**Counted budget**:
The Part IV line items that totals include: Office Productivity, Continuing Costs, and the budget of projects that are still in Part III-E, in the years their duration covers. Year totals, Summary B.1–B.4, Total Project Cost and the PDF all use the counted budget; other stored lines are named in a warning on the year page.

**Annex 1**:
The Existing ICT Asset Inventory — equipment and software counts per office. Two surfaces: the standalone `/annex1` form (an office fills and returns a `.issp` file) and inline management at `/editor/annex1` (secretariat adds/edits offices directly or attaches returned files).
_Avoid_: "the inventory", "asset table"

**Annex 2**:
The Disaster Recovery & Business Continuity Plan for ICT resources. Referenced in the guidelines; not yet implemented.

### Actors

**CIO**:
The agency's Chief Information Officer — accountable for the ISSP.

**Focal Person**:
The ISSP contact point. May be the same person as the CIO.

**Secretariat**:
The CIO's office — assembles the agency-wide master ISSP from office contributions.

**Office** (Central / Regional / Field):
An org unit described in, or contributing to, the ISSP. Central = head office; Regional = a regional office (selects a Philippine region); Field = a satellite office under a regional office.

### Sharing model

**`.issp` file**:
The JSON transport format for one ISSP artefact. A kind marker distinguishes a full document (`issp-main`) from a single office's inventory (`annex1`).
_Avoid_: "the JSON", "the export"

**Master document**:
The complete, consolidated ISSP held by the secretariat — the only file that produces the official PDF.

**Scoped file**:
A `.issp` sliced from the master, limited to one office's owned fields, sections, or areas. The office edits offline and returns it for consolidation.
_Avoid_: "slice", "partial file"

**Distribute**:
The master-side action that generates scoped files — one per office, granularity from a whole Part down to a single field. Lives in the editor's file-actions (⋯) menu; masters only.

**Consolidation**:
Merging one or more returned scoped files back into the master. The secretariat sees every change in a **merge review** before anything is applied.

**`officeId`**:
The merge key stamped on shared-table rows and Annex 1 payloads. Consolidation replaces rows by `officeId` (not display label), which makes re-importing an office's file idempotent. Absent ⇒ legacy/secretariat-owned row.

Per-project distribution: `editScope.projectIds` (absent = all projects)
filters the project-bearing fields at slice time — `part3/e1/e2` project
lists, `part3/f.performanceFramework`, `part3/d.proposedSystems`, and the
`part4/yearN` project budget records (registry `PROJECT_BEARING_FIELDS`, 7
members). Consolidate merges these by id (replace / union-new /
keep-on-delete) whenever any file in the batch declares the filter; Part IV
year fields decompose so `officeProductivity`/`continuingCosts` keep scalar
conflict semantics under the nested fieldKey `yearN.officeProductivity` —
but only between offices holding unfiltered files: a project-filtered file
carries neither category (the office sees only its projects' budget lines)
and contributes nothing to them on merge (no overlay, sub-conflict, or
flag). Its Proposed IS list likewise holds only the carried projects'
linked systems; systems merge by their own id — replace / union-new + flag,
absence kept unflagged (a project filter selects projects, not systems).

### Consolidation review

**Merge review**:
The step of consolidation where the secretariat compares the master with the result of merging a batch of returned files, and decides on each destructive change and conflict before applying.
_Avoid_: "preview", "diff screen"

**Merge base**:
The master's value at the time of consolidation. Each office's version of a field or row is judged against it, so only what an office actually changed counts as a change.

**Change**:
One difference between the master and the merge result — at field level or row level — attributed to the office(s) that caused it. Its kind is one of:
- **New** — the master field was empty; the file fills it.
- **Overwritten** — the master field had a value; the file replaces it with a different one.
- **Cleared** — the master field had a value; the file empties it.
- **Added row** — a row the master does not have. **Appended** when two or more offices add rows to the same list.
- **Replaced row** — a master row whose content an office changed.
- **Removed row** — a master row an office deleted, where no other office changed it.
- **Kept (office deleted)** — a project an office removed from a project file; the master keeps it and flags it.
- **Office rows replaced** — an office's own stakeholder or Annex 1 rows, swapped for the rows in its returned file.
- **No change** — the file's value equals the merge base.
_Avoid_: "edit", "delta", "update"

**Conflict**:
Two or more offices changed the same field or row differently from the merge base (or one edited a row another deleted). The secretariat picks one office's version or keeps the master; the section stays flagged either way. A **row conflict** is a conflict on a whole row.
_Avoid_: "clash", "collision"

**Keep master**:
The secretariat's rejection of an Overwritten, Cleared, Replaced-row, or Removed-row change, so the master's value or row stays. Acts on a whole field or a whole row, never a single cell.
_Avoid_: "revert", "undo", "reject"

**Skip row**:
The secretariat's rejection of an added row in a flagged section, so the row is not added (typically a duplicate).
_Avoid_: "delete row"

**Review flag**:
A marker consolidation puts on a section that needs a human check for duplicates or contested values. It is cleared by "Mark reviewed", or dropped at review time when every change that raised it was rejected.
_Avoid_: "warning", "badge"

**Broken link**:
A cross-part reference that points at nothing after the merge — a concern to an outcome or program, a project to a proposed system, or a KPI set or budget record to a project.
_Avoid_: "orphan", "dangling id"

**Provenance warning**:
A notice that a returned file's agency name, title, or plan years differ from the master's — the file may belong to another ISSP. It warns; it never blocks.

**Upgraded file**:
A returned scoped file made with an older schema, brought to the current schema before review. Data the older schema could not hold keeps the master's value.
