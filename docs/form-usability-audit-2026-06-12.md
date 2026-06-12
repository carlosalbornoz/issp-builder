# Form Usability Audit — 2026-06-12

**Reviewer:** Claude Code
**Scope:** Input-control fitness across all 19 editor sections — does each control match the data the DICT 2026 template actually asks for? Cross-referenced against `references/ISSP_Guidelines_2026.md` and the PDF renderer (`src/lib/pdf/render-issp-html.ts`).
**Out of scope:** Touch/scroll/number-input mechanics (covered and fixed in `docs/ux-audit-2026-06-11.md`).

Severity: 🔴 compliance / output correctness · 🟡 should fix · ⚪ polish

> **Update 2026-06-12 (later):** Phase 2 (findings #11, #13, #14) fixed and verified — live
> project-title resolution at export, CIO→focal mirror sync (form + export), two-tap
> `ConfirmDeleteButton` on all container deletes (row-level deletes stay instant). Also folded
> in from the sweep list: III-D "Has project" badge now derives from projects'
> `linkedSystemIds` (dead `linkedProjectId` removed) and the III-E project-type option is
> relabeled "IS-Driven — links to Part III-D systems" with an unset-state hint.
>
> **Update 2026-06-12:** Phase 1 (findings #1–#5) fixed and verified — template classification
> taxonomy with v4 migration (incl. legacy demo freeform strings), shared `src/lib/issp-labels.ts`
> label maps in the export route, users-as-text, "Others (specify)" input, II-A callout rewrite +
> dead `currentStrategy` removed. Verified: classification boxes print checked, zero enum codes in
> PDF, Others prints custom text, old v3 docs migrate cleanly.

---

## 🔴 Compliance & output-correctness findings

### 1. IS Classification taxonomy doesn't match the template — checkboxes never print

**Files:** `part2-c-form.tsx:89-95`, `part3-d-form.tsx:76-82` (options) · `render-issp-html.ts:767-774` (renderer)

The form offers **G2C / G2B / G2G / G2E / Internal**, but the official template (and the PDF
renderer) classify systems as **Support to Operations / General Administrative Systems /
Operations (Frontline or Non-Frontline)**. The renderer does
`chk(sys.classification === "Support to Operations")` etc., so with form-stored values
**no classification checkbox is ever checked in the exported PDF** — for any system, in
Part II-C and III-D both. This is silent data loss in the submitted document.

**Fix:** Replace the Select options with the template taxonomy (keep the existing
`frontline` checkbox, shown only when "Operations" is selected — that mirrors the template
exactly). Migrate stored values where unambiguous (`INTERNAL` → "General Administrative
Systems" is debatable; safest is to clear unmappable values and let status dots flag the
section as incomplete). Update demo file.

### 2. Raw enum codes leak into the PDF (Development Strategy, Data Storage)

**Files:** `render-issp-html.ts:778,781` · form options in `part2-c-form.tsx:104-116`, `part3-d-form.tsx:88-99`

The renderer prints `esc(sys.developmentStrategy)` and `esc(sys.dataStorage)` directly, so
the PDF shows **"IN_HOUSE"**, **"COTS"**, **"ON_PREMISE"** instead of "In-House
Development", "Commercial Off-The-Shelf (COTS)", "On-Premise". Evaluators see internal enum
codes. (Template vocabulary for strategy is "In-house / Outsourced / Combination /
Off-the-shelf (COTS)" — the form's extra "Open Source" option is a deviation worth keeping
but it must print as a label.)

**Fix:** Map enum → label in the export route (one lookup table reused from the form
options). Consider also matching template wording ("Hybrid" → "Combination").

### 3. Internal/External Users — number inputs where the template wants *which units*

**Files:** `part2-c-form.tsx:355-368`, `part3-d-form.tsx:314-329` (NumberInput) · guidelines II.C: "Internal Users — *Units within the organization with access*; External Users — *External orgs/stakeholders with restricted access*"

The template asks **who** has access (e.g., "HR Division, Finance Division" / "GSIS,
PhilGEPS"), not **how many**. The builder captures a count, and the PDF prints a bare
number where evaluators expect unit names. The export route already coerces it through
`String(...)`, confirming the renderer wants text.

**Fix:** Change to a text Input (`placeholder="e.g., HR Division, Finance Division"`).
Migration: existing numeric values become `"≈N users"` or are carried as the string of the
number; the schema-change skill workflow applies.

### 4. Part II-A instructs users to describe a field that doesn't exist

**File:** `part2-a-form.tsx:109-113` (callout) vs form body; dead field `currentStrategy` in the data model

The "How to fill this section" callout says to describe the **current ICT strategy** —
but there is no input for it. (The 2026 template's table has only four columns: OO/SO/MFO,
Critical Business System, Problem, Intended Use of ICT — no current-strategy column.)
Users will hunt for a field that isn't there. `currentStrategy` also lingers unused in
`StrategicConcern`.

**Fix:** Rewrite the callout to match the four real fields; remove the dead
`currentStrategy` field (or render it if the team decides it adds value — but the template
doesn't ask for it).

### 5. "Others (specify)" strategic alignment has nothing to specify

**Files:** `part3-e1-form.tsx:70-76` (checkbox list) · `export/route.ts` maps `others: saArr.find(s => !SA_KNOWN.includes(s)) ?? ""` · renderer prints `Others: ${esc(...)}`

The template option is "Others **(specify)**". The form renders a plain checkbox storing
the literal string `"Others"`, so the PDF prints **"☑ Others: Others"**. There is no way
to name the actual national/agency plan.

**Fix:** When "Others" is checked, show a conditional text input; store the custom string
in `strategicAlignment` (the export mapping already supports exactly this — any
non-standard string becomes the "others" value).

---

## 🟡 Should-fix findings

### 6. Part III-D proposed systems have no "Description & Purpose" field

**File:** `part3-d-form.tsx` — fields list

The template requires **Description & Purpose** for every proposed system ("features,
functionalities, reports; for enhancements, indicate what will be changed"). The form only
has `enhancementDetails`, shown when status = For Enhancement. A "For Development" system
has no way to describe what it does — and the PDF has a DESCRIPTION & PURPOSE row that
prints empty.

**Fix:** Add a Description textarea for all proposed systems; keep `enhancementDetails` as
the enhancement-specific addition.

### 7. Part III-D interoperability captures 1 of 4 template dimensions

**File:** `part3-d-form.tsx:332-362` vs `part2-c-form.tsx:378-393`

Guidelines: III-D interoperability = "Same four dimensions as Part II.C" (integrated,
generates data for others, processes external data, shared platform). The proposed-IS form
has only "Will integrate with other systems" + the two system lists. II-C has all four.

**Fix:** Reuse the II-C interop checkbox group in III-D.

### 8. Cybersecurity checklists don't mark Mandatory vs Optional controls

**Files:** `part2-b-form.tsx:96-180`, `part3-a-form.tsx:15-92` (duplicated config)

The template explicitly marks controls as **Mandatory** (e.g., NGFW, IDS/IPS, WAF, Data
Encryption, Antivirus, DLP, Backups) vs Optional. The form presents all controls equally —
an agency can leave every mandatory control unchecked with no signal that this will be
flagged in evaluation.

**Fix:** Add a "Mandatory" badge per the template and a per-group "X of Y mandatory"
counter. (Also: the CYBER_GROUPS config is duplicated verbatim in both files — extract to
a shared module while touching it.)

### 9. PIA disclosure is a checkbox where the template demands an explicit Yes/No

**Files:** `part2-c-form.tsx:420-437`, `part3-d-form.tsx:364-389`

Guidelines: "Mandatory Disclosure: **Explicitly state 'Yes' or 'No'**." A checkbox can't
distinguish "No" from "didn't answer." The PDF then prints an unchecked box that reads as
"No" even when the user simply never reached the field.

**Fix:** Tri-state control (Yes / No segmented buttons, initially unset) for "processes
personal information," keeping the follow-up "PIA conducted" question conditional on Yes.

### 10. EGP statuses default to "Not Utilizing" — unanswered looks answered

**File:** `part2-d-form.tsx:36` (`DEFAULT_PROGRAM = { status: "not_utilizing" }`)

A fresh document shows every program pre-answered as red "Not Utilizing." There's no
visual difference between "we don't use eGovPay" (a real answer with reporting
consequences) and "haven't gotten to this yet."

**Fix:** Add an unset initial state (`status: ""`), render it as a neutral "Not set" badge,
and count unanswered programs in the summary pills.

### 11. Destructive deletes are instant everywhere — no confirm, no undo

**Files:** all list forms — `part1-a` (outcome), `part1-c` (stakeholder + all services), `part2-a` (concern), `part2-c` (entire IS card), `part3-c/d/e1` (rows/systems/projects), `part4-year-form.tsx:484-494` (line + drawer delete)

One mis-tap on a trash icon deletes a fully-filled IS card (≈20 fields) or a project (and
its KPI table and budget sections downstream). Autosave persists the deletion ~1.5s later.
There is no confirmation, no undo. The sidebar's "Clear" uses a two-step confirm — row
deletes deserve at least the same for high-value objects.

**Fix:** Tiered approach — small rows (a program line, a KPI row, a budget line): keep
instant. Containers (stakeholder, IS, proposed system, project, diagram): a two-tap confirm
on the same button ("Delete? ✓") or an undo toast. Deleting a *project* should warn that
its Part III-F KPIs and Part IV budget section will be orphaned.

### 12. Project Duration is free text with a stale example from the wrong cycle

**File:** `part3-e1-form.tsx:363-368` — `placeholder="e.g., 2026–2028"`

Coverage is locked to FY 2028–2030 (MITHI Res. 2026-02), yet the placeholder suggests
2026–2028, and the field accepts anything. Most projects span the full coverage period.

**Fix:** Default new projects to `"<startYear>–<endYear>"` from the document, fix the
placeholder, and optionally constrain with two year Selects bounded by the coverage period.

### 13. Stored title copies go stale after a project rename

**Files:** `part3-f-form.tsx` (`kpiSet.projectTitle`), `part4-year-form.tsx` (`pb.projectTitle`), export route

Part III-F and Part IV both seed a copy of the project title keyed by project id. The
editor headers display the live title, but the **stored copy** is what flows to the PDF —
rename a project in III-E after adding KPIs/budget and the PDF prints the old name in
Part III-F (and any consumer of `pb.projectTitle`).

**Fix:** Treat the id as the only link; resolve titles live at render/export time (the
export route already receives the full document — join there). Drop or backfill the stored
copies.

### 14. "Concurrently held by CIO" stores a one-time copy that can go stale

**File:** `part1-b-form.tsx:215-228`

Checking the box copies CIO values into the focal fields once. Edit the CIO afterwards and
the UI shows live CIO values (looks synced) while the stored focal fields — which the PDF
prints — still hold the old copy. UI and PDF disagree. (The checkbox behavior itself is a
deliberate design decision; the stale-copy edge is the bug.)

**Fix:** When `focalSameAsCio` is true, derive focal fields from CIO fields at save/export
time instead of relying on the copy.

### 15. Large peso amounts have no digit grouping while typing, and no cross-check

**Files:** `part3-e1-form.tsx:387-397` (Total Project Cost), `part4-year-form.tsx` (unit costs)

Budget figures run to nine digits; `150000000` is unreadable and off-by-a-zero errors are
the classic failure mode. Totals display formatted (`php()`), but inputs are raw. Also:
Part III-E says "Must match sum of yearly costs in Part IV" but offers no live comparison —
the consistency check the guidelines emphasize is left to mental math.

**Fix:** (a) Show a formatted echo under/next to cost inputs ("= ₱150,000,000.00") or
format-on-blur with grouped digits; (b) next to Total Project Cost, show the computed
Part IV sum for that project with a match/mismatch indicator.

---

## ⚪ Polish

| # | Finding | Files | Fix |
|---|---|---|---|
| 16 | `GripVertical` drag handles are decorative — no drag-reorder exists anywhere | `part1-a-form.tsx:297`, `part1-c-form.tsx:450-452`, `part2-a-form.tsx:163` | Remove the icons (or implement reorder; removal is honest and cheap) |
| 17 | Contact numbers are plain text inputs | `part1-b-form.tsx:124-131` | `type="tel" inputMode="tel"` |
| 18 | URL fields are plain text | `part2-c-form.tsx:261-267`, `part2-d-form.tsx:210-218` | `type="url" inputMode="url"` (keep loose validation — gov URLs are messy) |
| 19 | II-D "Notes" is a single-line Input | `part2-d-form.tsx:262-270` | Textarea rows=2 |
| 20 | II-A "Critical Business System" is an Input but the guidance says "Describe actual operations/activities performed" | `part2-a-form.tsx:203-210` | Textarea rows=2 |
| 21 | I-A outcome "Name / Description" is a single-line Input; OO statements are sentence-length | `part1-a-form.tsx:330-336` | Autosize textarea or rows=2 |
| 22 | III-B guidance says "Attach the EA diagram as a separate file in the final ISSP document" — stale now that upload embeds it in the PDF | `part3-b-form.tsx:49-52` | Rewrite the sentence |
| 23 | III-F KPI table (9 columns) has no mobile/cards fallback, unlike I-C and IV | `part3-f-form.tsx:120-223` | Card-per-KPI layout under `md:` |
| 24 | II-B network description gives no structured prompt for template-required data points (connectivity type, speeds per site, IPv6 readiness) | `part2-b-form.tsx:355-369` | Checklist-style hint above the textarea listing what the diagram/description must show |
| 25 | Part IV "Office / Unit" free text; template suggests Central Office / Regional Offices | `part4-year-form.tsx:161-169` | Optional: datalist suggestions, keep free text |

## Not issues (checked)

- Part I-C complexity Select matches the template exactly (Simple / Complex / Highly Technical).
- Part III-E strategic alignment & harmonization options match MITHI Res. 2025-01 wording, with helpful hints.
- Fund Source options match the template in both III-E and Part IV.
- Part IV CO/MOOE split, four strategic categories, and auto-computed totals follow the template; continuing costs correctly MOOE-only.
- PNPKI adoption % is properly clamped 0–100.
- Part I-B human capital matrix mirrors the template table (status × IT/non-IT × sex) with auto totals.
- UACS combobox + explorer link is stronger than what the template asks for.
- Definition of Terms: alphabetical-print note is communicated; standard terms restorable.

---

## Pattern for the post-fix sweep: label clarity & cross-section explicitness

> Added 2026-06-12 after fixing Part III-A's "Current" badge (commit `41b5c70`). Once all
> four fix phases ship, run a full builder pass hunting for this same smell in every section.

**The smell:** a label that is only meaningful if the user already knows where the data
comes from, what checking/unchecking implies, or which template rule it serves. Terse
labels read fine to the developer (who has the context) and are ambiguous to a first-time
ISSP focal person.

**The exemplar (Part III-A cybersecurity checklist):**

| Before | After | Why |
|---|---|---|
| Badge: "Current" / "Not current" | "Already in place (per Part II-B)" / "Not yet in place" | Names the *source* — the badge is derived from the user's own Part II-B answers, which was invisible |
| Checkbox: "Proposed" (same label for every row) | "Strengthen / upgrade" (when already in place) vs "Propose to add" (when not) | States the *consequence* of checking, contextually — and preserves the upgrade use-case instead of disabling existing controls |

**What to check for in the sweep — every label, badge, and checkbox answers three questions:**

1. **Source** — if the value is derived/mirrored from another section, does the label say
   so? ("per Part II-B", "from Part III-E", "auto-calculated")
2. **Consequence** — does a checkbox/toggle label state what checking it *means* for the
   document, not just a noun? ("Proposed" ❌ → "Propose to add" ✓)
3. **Audience** — would a first-time agency focal person (not the developer) understand
   the term without opening the guidelines PDF? Prefer the template's own words.

**Known candidates already spotted for the sweep (not yet fixed):**

- II-D status pill "Proposed / In Progress" — proposed *where*? (Part III? this checklist?)
- II-C/III-D "Frontline Service" — could reference the ARTA/Citizen's Charter meaning
- Part IV "Physical Target" — template term, but a tooltip ("units to procure this year") would help
- I-C complexity options — template gives processing-time definitions (3/7/20 days) that the
  Select doesn't surface
- Sidebar/overview status dots — color-only meaning (empty/in-progress/done) is never legended

**III-D ↔ III-E linking flow (user-reported 2026-06-12: "I do not see an interface where I
can explicitly select a proposed IS to be added to a project"):**

- **Hidden affordance (III-E):** the "Linked Proposed Systems" pill picker exists in the
  project card (`part3-e1-form.tsx:270-306`) but only renders when Project Type =
  "IS-Driven". The Project Type Select gives no hint that this selection is what unlocks
  system linking, so the linking UI is effectively undiscoverable. Fix direction: always
  show the linking section (with an explanatory empty state), or label the option
  "IS-Driven — links to systems from Part III-D" and auto-focus the picker on selection.
- **Dead affordance (III-D):** `ProposedSystem.linkedProjectId` is declared, defaulted, and
  *read* for the "Has project" badge (`part3-d-form.tsx:500`) — but no UI ever writes it.
  The real link lives on the project side (`IctProject.linkedSystemIds`). Consequences: the
  "Has project" badge can never appear, and the "Ready to plan implementation?" nudge never
  clears even after a project links the system. Fix direction: derive `isLinked` from
  projects' `linkedSystemIds` (passed into the form) and delete the dead field — or add a
  project picker on the system card and keep the two sides in sync by id.

## Suggested plan (for discussion)

**Phase 1 — PDF correctness (the silent-data-loss set):** #1, #2, #3, #5, plus #4's copy fix.
These change what evaluators receive. #1 and #3 are schema changes → follow the
schema-change skill (types, defaults, migration, demo file, export, section-fields).

**Phase 2 — Data integrity:** #13, #14 (stale copies), #11 (delete confirms).

**Phase 3 — Template completeness:** #6, #7, #8, #9, #10, #12.

**Phase 4 — Polish:** #16–#25, batched in one pass.
