# Existing & Proposed IS Tables — Template Alignment: Implementation Plan

> **Status:** ✅ Complete — all phases implemented and verified (dev server), including unconditional rendering of the full Classification subtree. NOT yet deployed to prod.
> **Last updated:** 2026-07-16
> **References:**
> - `references/existing-is.pdf` — official DICT Part II-C template (Existing/Operational IS Inventory)
> - `references/proposed-is.pdf` — official DICT Part III-D template (Proposed IS)
> - DICT ISSP handout field-guidance text (captured verbatim in Appendix A below — source of tooltip copy)
> - `references/ISSP_Guidelines_2026.md`
> - Usability principle **#14** (`usability-patterns` skill) — "PDF renders the full template branch, always"

---

## How to use this document (execution model)

This plan is written to be **executed by sub-agents, phase by phase, and reviewed by the main model** between phases. Each phase is self-contained with:

- **Files** it touches (exact paths)
- **Exact changes** (old → new, or precise additions)
- **Acceptance checks** the sub-agent must run before reporting the phase complete
- **Review gate** — what the main model verifies before dispatching the next phase

**Rules for the executing sub-agent:**
1. Do **one phase per dispatch**. Do not start the next phase.
2. Follow the `schema-change` skill for Phases 1–3, 6–7 (data-model layers) — every `.issp` file ever saved must still open.
3. Follow the `verify-feature` skill's ladder for acceptance checks. **Do not** run `npm run build` (it clobbers the prod `.next`); use the dev server on port 3000 and the export API for PDF checks. If the dev server won't start, note it and fall back to `tsc` + `eslint` + code review — do not fight the Turbopack postcss fork-bomb (known issue; wiping `.next/dev` cache fixes it if it recurs).
4. Report back with: files changed, acceptance-check output (paste it), and anything ambiguous you resolved. Do not claim success without pasted evidence (per `verification-before-completion`).

**Rules for the reviewing main model:**
- Verify the phase's acceptance checks actually ran and passed (evidence, not assertion).
- Confirm no scope creep beyond the phase.
- Only then dispatch the next phase.

---

## Background — what's wrong today

`renderIsCard()` in `src/lib/pdf/render-issp-html.ts` is a **single shared function** for both Part II-C (existing) and Part III-D (proposed) IS cards, switched by an `isProposed` flag. It currently:

1. Uses **identical present-tense wording** for both tables — wrong for proposed (template III-D is future-tense throughout).
2. Renders **STATUS in the wrong position** (after Classification; template puts it after Description & Purpose).
3. Shows the **"did the system undergo PIA?" follow-up for proposed systems too** — the template has no such question there.
4. **Omits every explanatory parenthetical** the template prints in the Interoperability and PIA rows.
5. Renders the **"Generates/Processes data" checkboxes flat**, not nested under "Integrated with another system" as the template groups them.
6. **Gates the "Online/On-premise/Hybrid + Provide link" block incorrectly** — it renders whenever `deploymentType`/`url` are set, with no check on `frontline === true`. This is a live bug (violates usability principle #14).

**Root cause of #6:** the app has a generic **"Deployment Type" dropdown** (4 options: On-Premise/Cloud-Hosted/Hybrid/Hosted-3rd-party) shown for every system, and reuses that same field — relabeled — to answer the template's Frontline-nested "Online/On-premise/Hybrid" sub-question in the PDF. The DICT template and handout have **no generic deployment-type concept**; the only on-prem/cloud/hybrid question officially is (a) the Frontline sub-question and (b) the separate **Data Storage** field. **Decision (Carlos, 2026-07-16): retire the generic Deployment Type field**, repurpose it strictly for the Frontline sub-answer. Its informational value is already covered by Data Storage.

---

## Template field reference (both tables)

Field order (both): **NAME → CLASSIFICATION → DESCRIPTION & PURPOSE → [STATUS — proposed only] → DEVELOPMENT STRATEGY → DEVELOPMENT PLATFORM → DATABASE NAME → DATA STORAGE → INTERNAL USERS → EXTERNAL USERS → OWNER → INTEROPERABILITY → PIA**.

**CLASSIFICATION block (identical nesting, both tables):**
```
☐ Support to Operations
☐ General Administrative Systems
☐ Operations
   If yes, indicate whether the system supports:
      ☐ Frontline Service (directly used for public/client service delivery)
         Identify if:
            ☐ Online
               Provide link: ____
            ☐ On-premise
            ☐ Hybrid
      ☐ Non-Frontline Service (supports core mandate but not directly used by clients/public)
```

**Tense/wording differences (Existing vs Proposed):**

| Element | Existing (II-C) | Proposed (III-D) |
|---|---|---|
| Interop checkbox 1 | "Integrated with another system" *(If the system exchanges data or is technically integrated with another system)* | "Integration with another system" *(If the system **will** exchange data or **will be** technically integrated…)* |
| Interop checkbox 2 | "Generates data that is utilized by other system" *(The system generates and produces data that is consumed…)* | "Generate data that will be utilized by other system" *(The system **will** generate and produce…)* |
| Interop checkbox 3 | "Processes data generated from other system" *(The system receives and processes…)* | "Process data generated from other system" *(The system **will** receive and process…)* |
| Interop checkbox 4 | "Deployed on a shared platform" *(The system is hosted on the same platform…)* | "Deployment on a shared platform" *(The system **will be** hosted…)* |
| PIA row label | "PRIVACY IMPACT ASSESSMENT (PIA)" | "PRIVACY IMPACT ASSESSMENT" (no "(PIA)") |
| PIA question | "Is the system processing personal information?" *(Does the system collect, store, or process names, addresses, photos…?)* | "Will the system process personal information?" *(Will the system collect, store, or process…?)* |
| PIA follow-up | "If Yes, did the system undergo PIA? ☐ Yes ☐ No" | **none** |

**Interop nesting (both):** checkboxes 2 & 3 (Generates/Processes data) are **indented under** checkbox 1 (Integrated). "Internal System: ___ / External System: ___" blanks sit under checkbox 1's "If yes, specify the system name". Checkbox 4 (shared platform) is top-level, not nested.

---

## Phase 1 — Schema types (`src/lib/store/types.ts`)

**Strategy C (rename/restructure)** per `schema-change` skill.

Both `InformationSystem` and `ProposedSystem`:

- **Remove:** `deploymentType: "HOSTED" | "CLOUD" | "HYBRID" | "ON_PREMISE" | ""`.
- **Add:** `frontlineAccessType: "ONLINE" | "ON_PREMISE" | "HYBRID" | ""` — the template's Frontline "Identify if: Online/On-premise/Hybrid". Only meaningful when `classification === "OPERATIONS" && frontline === true`.
- `url` stays. Its meaning narrows to "the link for Online frontline access" (template's "Provide link:" is nested under Online specifically).

Note: `InformationSystem` uses `pia.piaCompleted`; `ProposedSystem` uses `pia.piaRequired`. Leave those as-is — they are correctly distinct.

**Acceptance:** `npx tsc --noEmit --skipLibCheck` will fail here (downstream not yet updated) — that's expected. Just confirm the type file itself is syntactically correct by reading it back. Real type-check gate is Phase 6.

**Review gate:** both interfaces changed identically; `deploymentType` gone; `frontlineAccessType` added with the 3-value union (not 4).

---

## Phase 2 — Migration + version bump (`src/lib/store/index.tsx`)

Bump `CURRENT_SCHEMA_VERSION` **8 → 9**.

Add a `v8 → v9` migration block (after the v7→v8 block, before the idempotent-normalizations section), applied to **both** `part2.informationSystems[]` and `part3.proposedSystems[]`:

```ts
// v8 -> v9: retire generic deploymentType; introduce frontlineAccessType (template's
// Frontline "Identify if: Online/On-premise/Hybrid"). The old deploymentType only carried
// real meaning for frontline systems; on non-frontline systems it duplicated Data Storage.
if ((base.schemaVersion ?? 1) < 9) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const migrateSystem = (s: any) => {
    const rest = { ...s };
    const dt = rest.deploymentType;
    delete rest.deploymentType;
    // Only frontline Operations systems get a frontlineAccessType; others reset to "".
    let fat = "";
    if (rest.frontline === true) {
      if (dt === "CLOUD" || dt === "HOSTED") fat = "ONLINE";
      else if (dt === "ON_PREMISE") fat = "ON_PREMISE";
      else if (dt === "HYBRID") fat = "HYBRID";
    }
    return { ...rest, frontlineAccessType: fat };
  };
  base = {
    ...base,
    schemaVersion: 9,
    part2: { ...base.part2, informationSystems: base.part2.informationSystems.map(migrateSystem) },
    part3: { ...base.part3, proposedSystems: base.part3.proposedSystems.map(migrateSystem) },
  };
}
```

**`deriveMetaFromContent`:** no change needed — IS-section completion is keyed on array length, not on `deploymentType`. Grep to confirm `deploymentType` is not referenced there.

**Form-init normalization trap (schema-change skill):** the II-C / III-D forms do **not** normalize `deploymentType` on mount today, so no snapshot-sync mirror is required in the idempotent-normalization block. Confirm by grep. (If Phase 4 introduces any on-mount normalization of `frontlineAccessType`, revisit this.)

**Acceptance:**
- Grep `deploymentType` across `src/` — only the migration's local `dt` read should remain in this file.
- `tsc` still failing downstream is fine at this stage.

**Review gate:** version bumped to 9; migration maps all four old values correctly; only frontline systems receive a non-empty `frontlineAccessType`; old key deleted.

---

## Phase 3 — Labels (`src/lib/issp-labels.ts`)

- **Replace** `FRONTLINE_ACCESS_LABELS` (currently a lossy 4→3 collapse) with a clean 1:1 map:
  ```ts
  export const FRONTLINE_ACCESS_LABELS = {
    ONLINE: "Online",
    ON_PREMISE: "On-premise",
    HYBRID: "Hybrid",
  } as const;
  ```
- **Remove** `DEPLOYMENT_LABELS` — but **grep first** (`grep -rn "DEPLOYMENT_LABELS" src/`). If anything outside the two IS forms imports it, stop and flag; otherwise delete.
- Leave `DATA_STORAGE_LABELS`, `DEV_STRATEGY_LABELS`, `CLASSIFICATION_LABELS`, `PROPOSED_STATUS_LABELS`, `EMPLOYMENT_STATUS_LABELS` untouched.

**Acceptance:** grep output pasted; confirm no orphan imports of removed symbols.

**Review gate:** `FRONTLINE_ACCESS_LABELS` is now 3 keys matching the enum; no dangling `DEPLOYMENT_LABELS` imports.

---

## Phase 4 — Forms (`part2-c-form.tsx` + `part3-d-form.tsx`)

Both forms, mirrored changes. **Also delivers Phase 9 tooltips** (bundled here because both touch the same field JSX — do them together to avoid two passes over the file).

### 4a. Retire the generic Deployment Type control
- Delete the "Deployment Type" `<Select>` and its `DEPLOYMENT_OPTIONS` const from both forms.
- In the local type mirror (`InformationSystem` / `ProposedSystem` inside each form) and `DEFAULT_IS` / `DEFAULT_SYSTEM`: rename `deploymentType` → `frontlineAccessType`, default `""`.

### 4b. Add the Frontline access control (template-accurate nesting)
Shown **only when** `classification === "OPERATIONS" && frontline === true`, nested visually under the existing Frontline checkbox:
- A 3-option control (Online / On-premise / Hybrid) — a small radio/segmented group or `<Select>` with `FRONTLINE_ACCESS_LABELS` values.
- When `frontlineAccessType === "ONLINE"`: reveal the existing `url` input, labelled **"Provide link"**, nested one level deeper (matches template: link is under Online, not under Frontline generally).
- When `frontline` is unchecked or classification isn't Operations: `frontlineAccessType` and `url` are not shown (and should reset to `""` on toggle-off, so stale values don't linger — mirror the pattern the PIA block already uses when clearing `piaCompleted`/`piaRequired`).

### 4c. Read views
- `ISReadView` / `SystemReadView`: drop the generic "Deployment" read row. Fold frontline access into the existing "Operations Type" row, e.g. `Frontline service — Online (https://…)` / `Non-frontline`.

### 4d. Tooltips (Phase 9 content, top-level fields only)
- **Part III-D** currently inlines `<Label>` + input per field; **introduce a `FormField` wrapper** there mirroring Part II-C's (`label`, optional `htmlFor`, optional `tooltip`, `children`) so tooltips attach uniformly and the file's repetition shrinks. Part II-C already has `FormField` — just add the `tooltip` prop wiring if missing (Part I-A's version is the exemplar: `Info` icon, base-ui `Tooltip`, opens on hover+focus).
- Attach one `tooltip` per top-level field using **Appendix A copy**. Use the Existing-column text in II-C, the Proposed-column text in III-D (they differ only where the handout is future-tense: Description, Status, Interoperability, PIA).

**Acceptance (dev server, port 3000):**
- Load demo doc; open a II-C card and a III-D card. Screenshot both, Read the PNGs.
- Verify: no "Deployment Type" dropdown; Frontline access appears only for Operations+frontline; "Provide link" appears only when Online; (i) tooltips render and show correct text on hover/focus.
- Mobile viewport 390×844 screenshot of one card.

**Review gate:** template-accurate nesting; correct gating; tooltips present with right copy; read views updated; identity fields still edit-mode-only (usability principle #2).

---

## Phase 5 — PDF renderer (`renderIsCard()` in `render-issp-html.ts`)

Apply usability principle **#14** throughout: render every template branch unconditionally, mark by data.

1. **Hoist the EGP indent/blank helpers to module scope** (currently nested in `renderPart2`): `egpIndent` → `tmplIndent`, `egpBlankInline` → `tmplBlankInline`, `egpBlankBlock` → `tmplBlankBlock` (or keep names, just lift them). Update EGP call sites. These are needed by the IS Interop nesting and Provide-link blank.
2. **Update the `IsSystem` interface** in this file: `deploymentType` → `frontlineAccessType`; keep `pia.piaCompleted` and add nothing new (proposed PIA follow-up is being *removed*, see #6).
3. **Classification block — always render the full nested structure when `classification === "Operations"`**, regardless of `frontline`/`frontlineAccessType` being set:
   - Frontline Service ☐ (checked iff `frontline === true`) → nested "Identify if:" → Online ☐ / On-premise ☐ / Hybrid ☐ (checked per `frontlineAccessType`) → "Provide link: ___" nested under Online (blank underline, filled iff `url` present **and** `frontlineAccessType === "ONLINE"`).
   - Non-Frontline Service ☐ (checked iff `frontline === false`).
4. **Reorder:** STATUS row moves to **after** Description & Purpose (proposed only).
5. **Interoperability — nest checkboxes 2 & 3 under checkbox 1**, checkbox 4 top-level; include the italic parentheticals; **branch wording on `isProposed`** (present vs future tense per the table above). "Internal System: ___ / External System: ___" blanks render always (not gated on `integrated`), using `tmplBlankInline`.
6. **PIA — branch on `isProposed`:**
   - Existing: label "PRIVACY IMPACT ASSESSMENT (PIA)", question "Is the system processing…?" + parenthetical, Yes/No, **and** the "If Yes, did the system undergo PIA? Yes/No" follow-up (driven by `pia.piaCompleted`).
   - Proposed: label "PRIVACY IMPACT ASSESSMENT" (no "(PIA)"), question "Will the system process…?" + parenthetical, Yes/No — **no follow-up**.
7. Italic parentheticals: render in a muted/italic span exactly as the template prints them (see field reference table).

**Acceptance (export API, port 3000):** export demo doc; extract+decode the SSE PDF; rasterize the Part II-C and Part III-D pages; Read PNGs; compare side-by-side against `references/existing-is.pdf` and `references/proposed-is.pdf`. Confirm: field order, tense wording, parentheticals, Interop nesting, Frontline nesting, no proposed-PIA-followup.

**Review gate:** both cards match their reference template; principle #14 honoured (full structure on every system, including a non-frontline Operations system and an unanswered one).

---

## Phase 6 — Export route (`src/app/api/export/route.ts`)

- Both `informationSystems` and `proposedSystems` mappings: `deploymentType` → `frontlineAccessType` (map via new `FRONTLINE_ACCESS_LABELS`; but note the renderer compares against `"Online"/"On-premise/Hybrid"` — keep label strings and renderer comparisons in exact sync, per the label file's own warning).
- **Remove** the proposed-system `piaCompleted: sys.pia.piaRequired ?? null` remap. The renderer no longer prints a PIA follow-up for proposed systems, so pass PIA through cleanly (`processesPersonalInfo` only for proposed; `piaCompleted` stays for existing).
- Confirm the `frontline` boolean and `url` still flow through for both.

**Acceptance:** `npx tsc --noEmit --skipLibCheck` — **now must be clean** (all layers updated). Paste output. Re-run the Phase 5 export check to confirm route + renderer agree.

**Review gate:** clean type-check; no `deploymentType` anywhere in `src/`; proposed PIA no longer remapped.

---

## Phase 7 — Demo file + `section-fields.ts`

- `public/demo/ncwtr-issp-2026-2028.issp`: for all 4 existing + 3 proposed systems, **remove `deploymentType`, add `frontlineAccessType`**. Only eCLAS (existing) and CFCP (proposed) are frontline — set both to `"ONLINE"` (they already carry URLs). All others → `""`. Bump `schemaVersion` **8 → 9**.
- Validate JSON: `node -e "JSON.parse(require('fs').readFileSync('public/demo/ncwtr-issp-2026-2028.issp','utf8'));console.log('valid')"`.
- `src/lib/section-fields.ts`: grep for `deploymentType`; if the II-C/III-D field lists reference it, rename the key/label to `frontlineAccessType` / "Frontline Access".

**Acceptance:** JSON valid; grep shows no `deploymentType` in demo or section-fields.

**Review gate:** demo at v9, frontline systems set correctly, JSON parses.

---

## Phase 8 — Full verification (per `verify-feature` ladder)

Run end-to-end, paste evidence:
1. `npx tsc --noEmit --skipLibCheck` — clean.
2. `eslint` on all touched files — clean.
3. Browser smoke (port 3000): II-C + III-D golden path, an interaction (toggle Operations→frontline→Online, confirm Provide-link appears), mobile viewport, one neighboring screen (II-D EGP) for regression.
4. PDF export smoke: demo doc → decode → rasterize II-C & III-D pages → Read → compare to references. Also test a **legacy doc** (a pre-v9 `.issp` with old `deploymentType`) loads and exports without error and migrates visibly.
5. Edge cases: Operations+non-frontline system (frontline block shows Non-Frontline checked, no access sub-block filled); a system with empty `frontlineAccessType`; a very long system name (wrap check).

**Review gate:** all pasted; references matched; legacy file migrates cleanly.

---

## Phase 9 — Tooltips

**Delivered inside Phase 4** (top-level field tooltips, copy from Appendix A). Listed as its own phase only for tracking. If Phase 4 shipped without them, this phase adds them; otherwise mark complete.

---

## Phase 10 — Documentation

- `docs/project-status.md`: note the II-C/III-D template alignment + deploymentType→frontlineAccessType migration (schema v9).
- `docs/session-handoff.md`: update `InformationSystem`/`ProposedSystem` field descriptions and the schema-version table.
- Memory (`project_status.md`): one line under recent work.
- This plan's status banner → "Complete".

---

## Appendix A — Tooltip copy (from DICT handout, verbatim-condensed)

Top-level field tooltips. Use the **Existing** text in II-C, **Proposed** where it differs (future tense).

| Field | Existing (II-C) | Proposed (III-D) — only if different |
|---|---|---|
| Information System Name | Indicate the name of the IS. The name should be descriptive of the business process it represents. | *(same)* |
| Classification | Support to Operations = facilitates internal processes but isn't core back-office (e.g. library, knowledge base, project management). General Administrative Systems = back-office systems that keep the agency running (HRIS, Payroll, Accounting). Operations = directly supports the agency's primary mandate — mark Frontline if directly used for public/client service delivery, Non-Frontline if it supports the mandate but isn't used directly by clients/public. | *(same)* |
| Description & Purpose | Describe the IS in terms of its salient features, functionalities, and reports generated. | Describe salient features, functionalities, and reports generated. For an IS that will be enhanced, indicate the enhancement to be done. |
| Status | *(field not present in Existing)* | Whether the IS is For Development (an entirely new system not in the current inventory — built from scratch or replacing a manual process) or For Enhancement (an existing Part II system needing significant upgrades — new modules, platform upgrade, better interoperability; should address a Problem from Part II-A). |
| Development Strategy | Indicate whether the IS is for in-house development, outsourcing, or a combination of both. Ready-made / off-the-shelf software may also be considered. | *(same)* |
| Development Platform | The foundation the software is built on — tools and technologies supporting the development lifecycle, e.g. Visual Studio, Supabase, Firebase, Retool. | *(same)* |
| Database Name | Should relate to the IS it serves and be descriptive of the data sets it represents. | *(same)* |
| Data Storage | Identify how or in what form you intend to store / preserve the data. | *(same)* |
| Internal Users | Units within the organization who may access the system in whole or in part. | *(same)* |
| External Users | External organizations, stakeholders, or private entities that may be given authority to access the system with certain restrictions. | *(same)* |
| Owner | The organizational unit for which the IS was developed, based on their business process. | *(same)* |
| Interoperability | How the system connects, shares, and processes data within the government digital ecosystem: whether it's integrated with another system (list internal/external systems), generates data used by others, processes data from others, or is deployed on a shared platform. | How the system will connect, share, and process data within the government digital ecosystem: whether it will integrate with another system, generate data for others, process data from others, or be deployed on a shared platform. |
| Privacy Impact Assessment | Whether the IS processes personal data — names, addresses, photos, or anything that can identify an individual — per the Data Privacy Act of 2012. You must state Yes or No; if Yes, indicate whether it has already undergone a formal PIA (if not, that's a gap to address in your proposed strategy). | Whether the IS will process personal data — names, addresses, photos, or anything identifying an individual — per the Data Privacy Act of 2012. Project whether the future system will process personal data; if Yes, ensure your roadmap includes a PIA phase and privacy-by-design features. |

---

## Appendix B — File change index (quick reference)

| File | Phase(s) | Nature |
|---|---|---|
| `src/lib/store/types.ts` | 1 | remove `deploymentType`, add `frontlineAccessType` (both interfaces) |
| `src/lib/store/index.tsx` | 2 | v8→v9 migration; version bump |
| `src/lib/issp-labels.ts` | 3 | rewrite `FRONTLINE_ACCESS_LABELS`; remove `DEPLOYMENT_LABELS` |
| `src/components/issp-editor/part2/part2-c-form.tsx` | 4, 9 | retire deployment select; add frontline-access control; tooltips |
| `src/components/issp-editor/part3/part3-d-form.tsx` | 4, 9 | same + introduce `FormField` wrapper |
| `src/lib/pdf/render-issp-html.ts` | 5 | hoist template helpers; rewrite `renderIsCard()` (order, gating, nesting, tense, PIA branch) |
| `src/app/api/export/route.ts` | 6 | field rename in mappings; drop proposed PIA remap |
| `public/demo/ncwtr-issp-2026-2028.issp` | 7 | field migration; schemaVersion → 9 |
| `src/lib/section-fields.ts` | 7 | rename field key/label if present |
| `docs/project-status.md`, `docs/session-handoff.md` | 10 | documentation |
