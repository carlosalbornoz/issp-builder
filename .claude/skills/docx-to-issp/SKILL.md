---
name: docx-to-issp
description: Convert a filled-in DICT ISSP Word template (.docx) into a "perfect" .issp JSON file that the ISSP Builder app accepts and loads with zero errors. Extracts the docx (text + tables + images), maps every DICT field to the app's exact storage values (enum codes vs. verbatim labels), embeds images as data URLs, preserves all Part I→IV cross-references, and validates against the app's real import gates.
argument-hint: "[path/to/agency-issp.docx] [optional output basename]"
---

# docx → .issp converter

Turn a completed **DICT ISSP 2026 Word template** (`.docx`) into a `.issp` JSON
file the ISSP Builder loads perfectly. The hard part is not parsing the docx —
it is mapping the template's free-text answers onto the app's **exact storage
values**. This skill bundles the authoritative mapping, an extractor, and a
validator so the output is correct on the first try.

**Input:** `$1` = path to the `.docx` (the filled-in DICT template).
**Output:** a `<Agency>_ISSP_<start>-<end>.issp` JSON file (DICT naming
convention, e.g. `NCWTR_ISSP_2026-2028.issp`) written next to the source.

If the user gives already-extracted text/markdown instead of a `.docx`, skip
Phase 1 and map from that directly.

---

## Workflow — five phases

### Phase 1 — Extract the docx

```bash
python3 .claude/skills/docx-to-issp/scripts/extract_docx.py "<docx>" "<out_dir>"
```

Zero-dependency (stdlib only). Produces:
- `<base>.extracted.md` — the document body with **tables preserved as GitHub
  markdown** and headings as `#`. The DICT template is almost entirely tables,
  so this structure is what you map from.
- `<base>.images.json` — every embedded image as `{path, mime, bytes, embeddable,
  dataUrl}`. `embeddable:false` means png/jpeg/webp/svg only — `.emf`/`.wmf`
  (common in Word) are flagged and **must be skipped or converted**.

Read both files fully before mapping.

### Phase 2 — Map DICT sections → JSON (use the reference below)

Work **part by part**, in order Part I → IV. Fill the skeleton (end of this
file) as you go. Two value patterns matter — get them wrong and the app silently
shows wrong/blank values:

1. **Enum-coded fields → store the SCREAMING_SNAKE code** (e.g.
   `classification: "SUPPORT_TO_OPERATIONS"`).
2. **Label-string fields → store the human label verbatim** (e.g.
   `fundingSource: "General Appropriations Act (GAA)"`).

See the **Mapping reference** below for the exact allowed values per field.

### Phase 3 — Generate IDs and cross-references

Generate **stable, readable IDs** (`oo-1`, `sys-uqmp`, `proj-sikap`) — never
random UUIDs. Then satisfy the cross-reference contracts (these are checked by
the validator and broken links mean dropped data):

| Source ID lives on… | …and is referenced by |
|---|---|
| `part1.orgOutcomes[].id` | `part2.strategicConcerns[].outcomeIds[]` |
| `part3.proposedSystems[].id` | `part3.internalProjects[].linkedSystemIds[]` |
| `part3.internalProjects[].id` | keys of `part3.performanceFramework` **and** `part4.yearN.internalProjects` |
| `part3.crossAgencyProjects[].id` | keys of `part3.performanceFramework` **and** `part4.yearN.crossAgencyProjects` |

> `performanceFramework[id].projectCategory` is `"internal"` if `id` is an
> internal project, `"crossAgency"` if it's a cross-agency project. (The demo
> file uses a stale `projectType` key — ignore it; the form reads
> `projectCategory`.)

### Phase 4 — Embed images

From `<base>.images.json`, assign each embeddable image to the right field by
its surrounding caption/heading in the markdown:

| DICT image | JSON field |
|---|---|
| Agency logo (header) | `agency.logoBase64` (≤ **2 MB**) |
| Existing network diagram (II-B) | `part2.networkDiagrams[]` `{id,dataUrl,title}` (each ≤ 10 MB) |
| Proposed network diagram (III-A) | `part3.proposedNetworkDataUrl` |
| Enterprise architecture (III-B) | `part3.enterpriseArchDataUrl` |

Copy the full `dataUrl` string verbatim. Skip any image over its limit or with
`embeddable:false` and list it in your final report instead. **Total embedded ≤
35 MB.** If the docx has no usable image for a field, leave it `null` / `[]`.

### Phase 5 — Validate

```bash
node .claude/skills/docx-to-issp/scripts/validate_issp.mjs "<output>.issp"
```

It re-implements the app's import gates plus enum membership and cross-ref
checks the app's forgiving normalizer does **not** catch. Fix every `✗ HARD
ERROR`; `⚠ warning`s load fine but should be reviewed (blank required fields,
unchecked Mandatory cyber controls, etc.). The known-good demo must pass:

```bash
node .claude/skills/docx-to-issp/scripts/validate_issp.mjs public/demo/ncwtr-issp-2026-2028.issp
```

Report to the user: output path, validation result, and any images you skipped
(with reason) or fields left blank for manual entry.

---

## Mapping reference

> **Source of truth:** `src/lib/issp-labels.ts`, `src/lib/store/types.ts`,
> `src/lib/cyber-controls.ts`, and the demo `public/demo/ncwtr-issp-2026-2028.issp`.
> If any value here disagrees with those files, the code wins — update this skill.

### Envelope (always present, exactly)

```jsonc
{
  "version": "1.0",                 // literal
  "fileType": "issp-main",          // literal — WRONG value = file rejected
  "exportedAt": "<now ISO>",
  "tool": "issp-platform",          // literal
  "schemaVersion": 6,               // current; >6 = "newer version" rejected
  "title": "<Agency> Information Systems Strategic Plan <start>–<end>",
  "startYear": 2026, "endYear": 2028,
  "amendmentNumber": 0,
  "scope": "<scope enum>",          // see below
  "agencyHeadName": "Chairperson ...",
  "planStatus": "draft",            // draft | for_review | submitted
  "submissionTarget": { "agency": "DICT", "deadline": null },
  "sectionMeta": {},
  "createdAt": "<ISO>", "updatedAt": "<ISO>",
  "agency": { "name": "...", "acronym": "...", "type": "NGA", "websiteUrl": "...", "logoBase64": null },
  "definitions": [ /* optional; omit to use the 3 standard template terms */ ],
  "part1": { /* ... */ }, "part2": { /* ... */ }, "part3": { /* ... */ }, "part4": { /* ... */ }
}
```

Hard gates (file rejected if any fail): `fileType === "issp-main"` ·
`schemaVersion ≤ 6` · `agency`/`part1`/`part2`/`part3`/`part4` are objects.

### Enum-coded fields → store the CODE

| Field (path) | Allowed codes |
|---|---|
| `agency.type` | `NGA` · `GOCC` · `LGU` · `OTHER` |
| `scope` | `DEPARTMENT_WIDE` · `DEPARTMENT_CENTRAL_ONLY` · `CENTRAL_ONLY` · `WITH_REGIONAL` · `WITH_BUREAUS` · `AGENCY_WIDE` · `AGENCY_CENTRAL_ONLY` · `AGENCY_WITH_REGIONAL` · `OTHER_GOVERNMENT_ENTITY` · `LGU_SCOPE` |
| `part2.informationSystems[].classification` *and* `part3.proposedSystems[].classification` | `SUPPORT_TO_OPERATIONS` · `GENERAL_ADMIN` · `OPERATIONS` |
| `part2.informationSystems[].deploymentType` | `HOSTED` · `CLOUD` · `HYBRID` · `ON_PREMISE` |
| `*.developmentStrategy` | `IN_HOUSE` · `OUTSOURCED` · `HYBRID` · `COTS` · `OPEN_SOURCE` |
| `*.dataStorage` | `ON_PREMISE` · `CLOUD` · `HYBRID` |
| `part3.proposedSystems[].status` | `FOR_DEVELOPMENT` · `FOR_ENHANCEMENT` |
| `part3.internalProjects/crossAgencyProjects[].projectType` | `IS_DRIVEN` · `STANDALONE` |
| `part3.proposedHumanCapital[].employmentStatus` | `PLANTILLA` · `CONTRACTUAL` · `OUTSOURCED` |
| `pia.processesPersonalInfo` (IS + proposed) | `"yes"` · `"no"` · `""` |
| `egpChecklist.<prog>.status` | **lowercase:** `utilizing` · `proposed` · `not_utilizing` · `not_applicable` |
| `egpChecklist.onlinePortal.connectedToPortal` | `"yes"` · `"no"` · `""` |

> ⚠ EGP status is the one **lowercase** enum — everything else is SCREAMING_SNAKE.

### Label-string fields → store the LABEL verbatim

| Field | Allowed values (copy the string exactly) |
|---|---|
| `*.fundingSource` · LineItem.`fundSource` | `General Appropriations Act (GAA)` · `Foreign-Assisted` · `Locally Funded` · `Other Income Generating Sources` |
| `IctProject.strategicAlignment[]` | `Public Investment Program` · `National Cybersecurity Plan` · `E-Government Master Plan` · `Program Convergence Budgeting` · `Others` |
| `IctProject.harmonizationFramework[]` | `National Prioritization` · `Resource Optimization` · `Interoperability Framework` · `Cross-Agency Collaboration` · `Scalability and Sustainability` |
| `StakeholderService.complexity` | `Simple` · `Complex` · `Highly Technical` |
| `KpiRow.hierarchy` | `Intermediate Outcome` · `Immediate Outcome` · `Output` |

These are stored as the human-readable string, **not** a code — the PDF renderer
`.includes()`-matches them, so a typo leaves a checkbox unchecked.

### DICT template section → JSON path

| Template section | JSON path | Shape |
|---|---|---|
| I-A Mandate / Vision / Mission / Outcomes | `part1.{legalBasis, mandateFunction, visionStatement, missionStatement}` | strings |
| I-A Outcomes & programs | `part1.orgOutcomes[]` | `{id, name, programs:string[]}` |
| I-B CIO | `part1.{cioName, cioPosition, cioUnit, cioEmail, cioContact}` | strings |
| I-B Focal person | `part1.focalSameAsCio` + `{focalName…}` | boolean + strings |
| I-B Human capital grid | `part1.humanCapital` | `{plantilla,contractual,outsourced}.{it,nonIt}.{male,female}` (numbers) |
| I-C Stakeholders | `part1.stakeholders[]` | `{id, name, services:[{id,name,complexity}]}` |
| II-A Strategic concerns | `part2.strategicConcerns[]` | `{id, outcomeIds[], criticalSystem, concern, desiredStrategy}` |
| II-B Network diagram(s) | `part2.networkDiagrams[]` | `{id, dataUrl, title}` |
| II-B Network description | `part2.networkDescription` | string |
| II-B Cyber checklist | `part2.cybersecurityControls` | CyberControls (below) |
| II-C IS inventory | `part2.informationSystems[]` | InformationSystem (below) |
| II-D EGP checklist | `part2.egpChecklist` | EgpChecklist (below) |
| III-A Proposed network | `part3.{proposedNetworkDataUrl, proposedNetworkDesc, proposedCybersecControls}` | |
| III-B Enterprise arch | `part3.enterpriseArchDataUrl` | data URL \| null |
| III-C Proposed HC | `part3.proposedHumanCapital[]` | `{id, position, employmentStatus, quantity}` |
| III-D Proposed systems | `part3.proposedSystems[]` | ProposedSystem (below) |
| III-E1 Internal projects | `part3.internalProjects[]` | IctProject |
| III-E2 Cross-agency projects | `part3.crossAgencyProjects[]` | IctProject + `leadAgency?`, `implementingAgencies?` |
| III-F Performance framework | `part3.performanceFramework` | `{ [projectId]: {projectTitle, projectCategory:"internal"\|"crossAgency", rows:KpiRow[] } }` |
| IV Year N (N=1,2,3) | `part4.yearN` | YearBudget (below) |
| Definition of Terms | `definitions[]` | `{id, term, definition}` (omit for standard terms) |

### InformationSystem / ProposedSystem (II-C, III-D)

```
{ id, name, classification<code>, frontline<boolean>,
  deploymentType<code>, url, description,
  developmentStrategy<code>, developmentPlatform, databaseName, dataStorage<code>,
  internalUsers<string>, externalUsers<string>, owner,
  interoperability: { integrated, internalSystems, externalSystems,
                      generatesData, processesExternalData, sharedPlatform },
  pia: { processesPersonalInfo<"yes"|"no"|"">, piaCompleted / piaRequired<boolean> },
  // ProposedSystem only adds: status<code>, enhancementDetails  (and piaRequired instead of piaCompleted)
}
```
- `internalUsers`/`externalUsers` are **free text** ("which units/orgs"), not counts.
- Proposed system uses `pia.piaRequired`; existing system uses `pia.piaCompleted`.

### Cybersecurity Controls (`CyberControls`) — all booleans, default `false`

```
physical:  { perimeterProtection*, accessControl*, surveillance*, detection }
perimeter: { ngfw*, idsIps*, waf*, dmz }
network:   { dataEncryption*, networkSegmentation }
endpoint:  { antivirus*, appControl*, byod*, xdr }
data:      { dataClassification*, dlp*, backupRecovery* }
application:{ securityScanning* }
other:     { vulnAssessment, patchMgmt, strongPasswords, mfa, accessReviews,
             securityLogs, logAnalysis, incidentResponse, siem, penTesting, secureSdlc }
```
`*` = **Mandatory** per the template. If the docx leaves a Mandatory one
unchecked, set it `false` (do not guess) — the validator will warn.

### EGP checklist (`part2.egpChecklist`)

Eight programs. `elgu` is optional; the rest are always present (default
`{status:""}`). Each `EgpProgram = {status, url?, equivalentName?, equivalentUrl?,
notes?, ifNo?}`.

| key | Template item | `ifNo` options when `not_utilizing` |
|---|---|---|
| `elgu` *(optional)* | eLGU | `usingEquivalent`, `manual` |
| `eGovPay` | eGovPay | `otherPlatform`, `manual`, `proposedDevelopment` |
| `pnpki` | PNPKI | — (also has `adoptionPercentage?: number`) |
| `hcmis` | HCMIS | `usingEquivalent`, `manual`, `proposedDevelopment` |
| `ifmis` | IFMIS | `usingEquivalent`, `manual`, `proposedDevelopment` |
| `onlinePortal` | Online Public Service Portal | — has `mechanisms:{website,email,landline,socialMedia,mobile}` + `connectedToPortal<"yes"\|"no"|"">` |
| `procurement` | PhilGEPS | `usingEquivalent`, `manual`, `proposedDevelopment` |
| `recordsMgmt` | Records & Knowledge Mgmt | — |
| `pscp` | Public Service Continuity Plan | — |

`ifNo` is an object of booleans; only set the keys that apply for that program.

### Part IV — YearBudget (`part4.year1` / `year2` / `year3`)

```
{
  officeProductivity: { capitalOutlay: LineItem[], mooe: LineItem[] },
  internalProjects:   { [projectId]: { projectTitle, capitalOutlay:LineItem[], mooe:LineItem[] } },
  crossAgencyProjects:{ [projectId]: { projectTitle, capitalOutlay:LineItem[], mooe:LineItem[] } },
  continuingCosts:    { mooe: LineItem[] }
}
```
`LineItem = { id, item, office, uacsCode, uacsLabel, fundSource<label>, qty<number>, unitCost<number> }`
- `internalProjects`/`crossAgencyProjects` keys are **project IDs** (same as
  Part III), and `projectTitle` must match the Part III project title.
- UACS codes live in `uacs/uacs_active.json` (`{uacs, label}`). Pick the closest
  match; common ones: `5060405015` "ICT Software", `5020503000` "Internet
  Subscription Expenses". If unsure, set `uacsCode:""` + `uacsLabel:""` and warn.
- Total project cost is **derived** from these line items — do not store it.

---

## Common gotchas

- **EGP status is lowercase.** Every other enum is SCREAMING_SNAKE.
- **`internalUsers`/`externalUsers` are "which", not "how many"** — store the
  unit/org names as a sentence.
- **Focal person:** if "same as CIO" is ticked, set `focalSameAsCio:true`. You
  may still copy CIO values into the focal fields for completeness.
- **Blank is valid** for most fields (app defaults them). A "perfect" file still
  fills everything the template filled — but never **invent** data the docx
  doesn't contain. Note gaps in the report instead.
- **Proposed vs existing PIA:** existing IS uses `pia.piaCompleted`; proposed
  system uses `pia.piaRequired`.
- **EMF/WMF diagrams:** Word often stores diagrams as EMF. The extractor flags
  them `embeddable:false`. Do not embed — they'll be rejected. List for manual
  conversion (export the original as PNG/SVG).
- **Don't store total project cost** anywhere — it's computed from Part IV.
- **`definitions`:** omit the key entirely (or set standard terms) unless the
  docx customized the Definition of Terms.

---

## Minimal skeleton (fill this)

```jsonc
{
  "version": "1.0", "fileType": "issp-main", "tool": "issp-platform", "schemaVersion": 6,
  "exportedAt": "ISO", "createdAt": "ISO", "updatedAt": "ISO",
  "title": "", "startYear": 0, "endYear": 0, "amendmentNumber": 0,
  "scope": "AGENCY_WIDE", "agencyHeadName": "", "planStatus": "draft",
  "submissionTarget": { "agency": "DICT", "deadline": null }, "sectionMeta": {},
  "agency": { "name": "", "acronym": "", "type": "NGA", "websiteUrl": "", "logoBase64": null },
  "part1": {
    "legalBasis": "", "mandateFunction": "", "visionStatement": "", "missionStatement": "",
    "orgOutcomes": [], "cioName": "", "cioPosition": "", "cioUnit": "", "cioEmail": "", "cioContact": "",
    "focalSameAsCio": false, "focalName": "", "focalPosition": "", "focalUnit": "", "focalEmail": "", "focalContact": "",
    "humanCapital": { "plantilla": { "it": {"male":0,"female":0}, "nonIt": {"male":0,"female":0} },
                      "contractual": { "it": {"male":0,"female":0}, "nonIt": {"male":0,"female":0} },
                      "outsourced":  { "it": {"male":0,"female":0}, "nonIt": {"male":0,"female":0} } },
    "stakeholders": []
  },
  "part2": {
    "strategicConcerns": [], "networkDiagrams": [], "networkDescription": "",
    "cybersecurityControls": { /* all 7 groups, every control false unless ticked */ },
    "informationSystems": [],
    "egpChecklist": { "eGovPay":{"status":""}, "pnpki":{"status":""}, "hcmis":{"status":""},
      "ifmis":{"status":""}, "onlinePortal":{"status":""}, "procurement":{"status":""},
      "recordsMgmt":{"status":""}, "pscp":{"status":""} }
  },
  "part3": {
    "proposedNetworkDataUrl": null, "proposedNetworkDesc": "",
    "proposedCybersecControls": { /* CyberControls */ }, "enterpriseArchDataUrl": null,
    "proposedHumanCapital": [], "proposedSystems": [],
    "internalProjects": [], "crossAgencyProjects": [], "performanceFramework": {}
  },
  "part4": {
    "year1": { "officeProductivity": {"capitalOutlay":[],"mooe":[]}, "internalProjects": {},
               "crossAgencyProjects": {}, "continuingCosts": {"mooe":[]} },
    "year2": { "officeProductivity": {"capitalOutlay":[],"mooe":[]}, "internalProjects": {},
               "crossAgencyProjects": {}, "continuingCosts": {"mooe":[]} },
    "year3": { "officeProductivity": {"capitalOutlay":[],"mooe":[]}, "internalProjects": {},
               "crossAgencyProjects": {}, "continuingCosts": {"mooe":[]} }
  }
}
```
```
// CyberControls fully expanded (paste into both cybersecurityControls and proposedCybersecControls):
{
  "physical":  { "perimeterProtection":false, "accessControl":false, "surveillance":false, "detection":false },
  "perimeter": { "ngfw":false, "idsIps":false, "waf":false, "dmz":false },
  "network":   { "dataEncryption":false, "networkSegmentation":false },
  "endpoint":  { "antivirus":false, "appControl":false, "byod":false, "xdr":false },
  "data":      { "dataClassification":false, "dlp":false, "backupRecovery":false },
  "application":{ "securityScanning":false },
  "other":     { "vulnAssessment":false, "patchMgmt":false, "strongPasswords":false, "mfa":false,
                 "accessReviews":false, "securityLogs":false, "logAnalysis":false, "incidentResponse":false,
                 "siem":false, "penTesting":false, "secureSdlc":false }
}
```
