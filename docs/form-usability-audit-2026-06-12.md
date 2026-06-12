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
> **Update 2026-06-12 (Phase 3 + sweep):** Template-completeness fixes shipped for #6–#10 and
> #12: III-D Description & Purpose, four-dimensional interoperability, mandatory cybersecurity
> badges/counters, PIA Yes/No/Not set, EGP Not set default, and structured project duration
> (single year or range constrained to the ISSP period). Additional sweep fixes shipped:
> tel/url input modes, II-A critical business system as multiline text, I-A OO/SO/MFO as
> multiline text, II-B/III-A network requirement prompts, II-D notes as multiline text,
> Part III-B embedded-PDF copy, I-C complexity processing-time hints, Part IV office
> suggestions/physical-target hint/unit-cost currency echo, and funding-source checkbox
> matching in the PDF renderer.
>
> **Update 2026-06-12 (post-sweep review):** A second-pass review of the Phase 3 + sweep diff
> found and fixed one bug: the proposed-IS STATUS row printed the raw enum (`FOR_DEVELOPMENT`)
> in the PDF after the demo regeneration converted statuses to enum codes — fixed with
> `PROPOSED_STATUS_LABELS` in `issp-labels.ts` mapped in the export route. Note the demo's
> former "For Procurement" system (iHRPS) is now correctly `FOR_DEVELOPMENT` + COTS strategy,
> matching the template's two-status vocabulary. Cleanups from the same review: `php()` peso
> formatter consolidated into `src/lib/utils.ts` (was 3 identical client copies + a new 4th),
> Part IV office `<datalist>` hoisted to a single constant-ID instance (the per-table IDs
> duplicated across project sections), the PIA Yes/No segmented control extracted to shared
> `PiaAnswerToggle` (`pia-answer-toggle.tsx`, was copy-pasted in II-C and III-D), and project
> duration ranges now format with an en-dash to match the template and existing data.
>
> **Update 2026-06-12 (Carlos feedback — Total Project Cost is derived, schema v6):**
> III-E Total Project Cost is no longer a user input — it duplicated the sum of the project's
> Part IV resource requirements (the demo had already drifted: stored ₱24.5M vs actual
> ₱20.875M for SIKAP). `IctProject.totalProjectCost` removed from the schema (v6 migration
> strips stale copies); the form shows a read-only auto-calculated value with an ⓘ tooltip
> ("Auto-calculated from this project's resource requirements in Part IV"); the E.1/E.2
> "Total Est. Cost" stat and the "Must match sum of yearly costs in Part IV" copy are removed;
> the PDF export computes the value via `computeProjectCosts` (part4-aggregations). This
> resolves finding #15(b) by construction — there is nothing left to cross-check.
>
> **Update 2026-06-12 (Carlos feedback — peso inputs):** The "= ₱…" echo lines under cost
> inputs were rejected: the field itself must auto-format (usability-patterns principle 10,
> "Format in the field, not beside it"). `NumberInput` now has a `currency` prop — live comma
> grouping while typing with caret preservation, max 2 decimals, `1,234,567.89` on blur —
> applied to III-E Total Project Cost and Part IV Unit Cost (drawer + table cell); echo lines
> removed. Verified in-browser: load formatting, mid-string edits, blur padding, store commit.
>
> **Update 2026-06-12 (verification sweep addendum):** EGP "Not set" is no longer a selectable
> status chip; unanswered cards are highlighted as "Needs answer." Part III-E Total Project Cost
> now shows a formatted PHP echo below the numeric input. A follow-up validation phase is needed:
> a shared `validateIsspDocument(doc)` / `validateSection(doc, sectionId)` rule engine should feed
> both `SectionShell` ("Mark as done" disabled with issue list until minimum DICT fields are
> satisfied) and `EditorSidebar` PDF export. Export should block by default when minimum standards
> fail, with an explicit "Export anyway" bypass that sends `incompleteOverride: true` to the
> export route and prints a visible incomplete/draft watermark in the PDF.
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
- PNPKI gets the standard utilizing/proposed/not-utilizing status chips even though the
  template (v1 and v2) asks only for adoption % on that row — **deliberate deviation, Carlos
  confirmed keep 2026-06-12** (richer info, harmless in review). Do not re-flag.
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

## Input-type alignment sweep vs Template v2 (2026-06-12)

Method: full pass of `references/ISSP Template 2026_v2.pdf` (all 40 pages, section by
section) against every editor form and the PDF renderer, checking field presence, control
type, and option vocabulary. Findings below are NEW (not duplicates of #1–#15).

> **Status: ALL FIXED same day (S1–S10), verified via PDF export + browser.** EGP If-No
> follow-ups are additive-optional schema fields (`EgpIfNo`, `EgpPortalMechanisms`,
> `connectedToPortal`, `equivalentUrl` — no version bump needed); frontline access mode
> maps via `FRONTLINE_ACCESS_LABELS`; employment status via `EMPLOYMENT_STATUS_LABELS`;
> `PiaAnswerToggle` renamed to the generic `YesNoToggle` (reused for the portal-connection
> question); legacy `channels` free text retained read-only in the PDF for old files.
> Demo file enriched with If-No / mechanisms data.

### 🔴 S1. EGP item 9 is a different question in the editor than in the template

**File:** `part2-d-form.tsx:142-146` · renderer `render-issp-html.ts:770` (correct)

Template item 9: **"PUBLIC SERVICE CONTINUITY PLAN — Is there an existing Public Service
Continuity Plan in your agency?"** The editor labels it "Philippine Standard Chart of
Accounts (PSCP) / Accounting System" with an accounting description. Users answer about an
accounting system; the PDF prints their answer under PUBLIC SERVICE CONTINUITY PLAN.
**Fix:** relabel + new description; template has no follow-ups here (Yes/No only) — drop
`showEquivalent`.

### 🔴 S2. EGP "If No" follow-ups cannot be answered

**Files:** `part2-d-form.tsx:164` (`showDetails = isUtilizing || isProposed`) ·
`render-issp-html.ts:783` (same gate)

Template items 1 (eLGU), 4 (HCMIS), 5 (IFMIS), 7 (Procurement) require, **when the answer
is No**: ☐ Using equivalent system (IS name + url for eLGU) / ☐ Manual transaction-or-
processing / ☐ Proposed development of equivalent system. eGovPay's No-branch adds "Using
other digital or electronic payment platform". Our editor hides all detail fields unless
status is utilizing/proposed, and the PDF prints no details for not_utilizing — so the
template's No-branch data is structurally impossible to capture or print.
**Fix:** when status = Not Utilizing, show the program's "If No" options (checkbox set per
template + equivalent IS name/url); print them in the PDF details column.

### 🔴 S3. Frontline access-mode checkboxes never check in the PDF

**File:** `render-issp-html.ts:717` · confirmed in live export: "☐ Online ☐ On-premise ☐ Hybrid"
all empty while URL prints

Template (II-C and III-D): Frontline Service → "Identify if: ☐ Online (provide link) /
☐ On-premise / ☐ Hybrid". The renderer compares `deploymentType` against those literals,
but the export route sends `DEPLOYMENT_LABELS` values ("Cloud-Hosted", "On-Premise" —
capital P, "Hosted (3rd Party)"), so Online never matches and On-premise fails on case.
**Fix:** map deployment → template access-mode at export (CLOUD/HOSTED → Online,
ON_PREMISE → On-premise, HYBRID → Hybrid). Editor vocabulary (4 deployment options) is a
reasonable superset; no form change required.

### 🔴 S4. Part III-C employment status prints raw enum codes

**Files:** `render-issp-html.ts:959` (`esc(r.employmentStatus)`) · route passes code through
(`route.ts:251`) · confirmed: "PLANTILLA" ×5 in live export

Same class as finding #2/STATUS leak. **Fix:** label map (Plantilla / Contractual /
Outsourced (JO, COS, and HTC)) in `issp-labels.ts`, applied in the route.

### 🟡 S5. Employment-status labels group Job Order under the wrong bucket

**Files:** `part1-b-form.tsx:145` ("Contractual / Job Order") · `part3-c-form.tsx:27` (same)

Template taxonomy: **Plantilla / Contractual / Outsourced (JO, COS, and HTC)** — Job Order
belongs under *Outsourced*. The editor's "Contractual / Job Order" coaches users to count
JO staff in the wrong row; the PDF matrix labels are already correct
(`render-issp-html.ts:625-627`), making editor and output disagree.
**Fix:** editor labels → "Contractual" and "Outsourced (JO, COS, and HTC)".

### 🟡 S6. Online Public Service Portal (EGP 6) asks different questions than the template

**File:** `part2-d-form.tsx:119-126` (free-text `channels`, url, equivalent)

Template item 6 asks: (a) which consumer protection / citizen assistance, feedback and
grievance mechanisms exist — **☐ Website ☐ Email ☐ Landline ☐ Social Media ☐ Mobile**
(multi-select); (b) "Are these mechanisms already connected with online public service
portals?" **Yes/No**. Our card asks utilizing-status + free-text channels.
**Fix:** replace `channels` free text with the 5 fixed checkboxes + a connected-to-portal
Yes/No; map both into the PDF details cell.

### 🟡 S7. PNPKI adoption % only prints when status is utilizing/proposed

**File:** `render-issp-html.ts:783`

The template asks adoption % unconditionally (no status question on that row — kept as
deliberate deviation per the Not-issues entry). If the user picks Not Utilizing, the %
they entered silently drops from the PDF. **Fix:** always print adoption % for pnpki.

### 🟡 S8. Records & Knowledge Management (EGP 8) label drift

**File:** `part2-d-form.tsx:136`

Template: "RECORDS AND KNOWLEDGE MANAGEMENT INFORMATION SYSTEM — Is there an existing
repository for Records and Knowledge Management?" (If Yes → indicate the system). Ours:
"Electronic Records Management System". **Fix:** relabel; the If-Yes "indicate system"
maps to the existing equivalent-name field shown on Yes.

### ⚪ S9. Part IV editor column order vs template

Editor table mode: Qty before Unit Cost (`part4-year-form.tsx:406-407`); template order is
Unit Cost → Physical Target, and calls it "Physical Target" (drawer already does). PDF
column order already matches the template. Cosmetic alignment only.

### ⚪ S10. III-F renderer matches projects by title before id

**File:** `render-issp-html.ts:995` — `perfEntries.find(e => e.projectTitle === proj.title)`
with id fallback. Works (id fallback catches renames) but title-first inverts principle 8;
make id the primary key when touching this file.

### Verified aligned (no action)

Cover scope options; I-A mandate (Legal Basis + Function), vision, mission, OO/programs;
I-B CIO/Focal field sets; I-B HC matrix structure (status × IT/non-IT × sex + totals);
I-C stakeholder columns; II-A four columns; II-B/III-A cyber checklists incl.
mandatory/optional split; II-C & III-D full field sets (incl. 4-dim interoperability,
PIA Yes/No, Description & Purpose, Status); III-C columns; III-E/E.2 complete row sets,
funding options, lead/implementing agency; III-F hierarchy (3 template values), KPI,
baseline, targets, data collection methods, responsibility; Part IV PDF columns,
categories, continuing-costs-as-MOOE; B.1–B.4 summary tables; PDF project card prints no
extra rows beyond the template.

## Suggested plan (for discussion)

**Phase 1 — PDF correctness (the silent-data-loss set):** #1, #2, #3, #5, plus #4's copy fix.
These change what evaluators receive. #1 and #3 are schema changes → follow the
schema-change skill (types, defaults, migration, demo file, export, section-fields).

**Phase 2 — Data integrity:** #13, #14 (stale copies), #11 (delete confirms).

**Phase 3 — Template completeness:** #6, #7, #8, #9, #10, #12.

**Phase 4 — Polish:** #16–#25, batched in one pass.
