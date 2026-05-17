# Privacy Architecture Notes
## ISSP Builder — Local-First Redesign Brainstorm

> **Status:** Brainstorming / planning notes only. No code changes made yet.  
> **Last updated:** 2026-05-17  
> **Context:** As the platform is intended for use by government agencies, it must be aligned with RA 10173 (Data Privacy Act), RA 10175 / E-Gov Act IRR provisions, and the principle of Privacy by Design. This document captures the architectural thinking and UX patterns being considered before any implementation begins.

---

## 1. The Privacy Problem with the Current Architecture

The current ISSP Builder requires:
- **Account registration / sign-in** (email + password stored in SQLite)
- **Server-side data persistence** — all ISSP content (agency info, systems inventory, budget tables, etc.) is stored in a database on our server
- **Session management** via JWT cookies (NextAuth.js)

This creates meaningful data privacy exposure:

- ISSP documents contain potentially sensitive government data: system names, security posture descriptions, HR headcounts, budget breakdowns, vendor names, infrastructure descriptions
- By collecting and storing this data server-side, the platform becomes subject to the full scope of RA 10173 compliance: PIA, NPC registration, security controls, breach notification obligations
- Any tool used by a government agency should also align with the E-Gov Act IRR — which includes requirements for data handling, system security, and ideally VAPT before deployment
- We have not done a VAPT, a PIA, or registered as a personal information controller with the NPC
- Even if the data is not "personal" in the strict sense, ISSP budget and systems data is sensitive government information

**The core issue:** We're holding data we don't need to hold.

---

## 2. Proposed Direction: Local-First, Privacy by Design

### Core principle
> The tool should never see the agency's data. The data stays on the agency's machine, in the agency's browser, under the agency's control.

This is **Privacy by Design** in its most literal form (Ann Cavoukian's 7 Foundational Principles):

| Principle | How local-first satisfies it |
|---|---|
| Proactive, not reactive | Architecture eliminates the risk rather than mitigating it |
| Privacy as default | No account, no server storage — private by default, not by configuration |
| Privacy embedded into design | Data never leaves the client; not a setting, it's the architecture |
| Full functionality | The tool is fully functional without server-side data; positive-sum |
| End-to-end security | No data in transit beyond the PDF export call; nothing to breach |
| Visibility and transparency | Users can see and control their own file; no black-box server |
| Respect for user privacy | Agency keeps sovereignty over their ISSP data |

### What "local-first" means in practice

- **No sign-in required.** The tool opens and works immediately.
- **No server database.** All ISSP content is stored in the browser (`IndexedDB`) during editing.
- **No account data collected.** No emails, no passwords, no user records on our end.
- **Export to a local file** is the primary "save" action (replaces server persistence).
- **PDF generation** still requires a server call (Puppeteer renders the HTML server-side), but the data sent to that endpoint is ephemeral — processed and discarded, never persisted.
- **The server becomes a static file host + PDF renderer.** Nothing more.

### Dramatically reduced compliance scope

Under this architecture:
- **PIA scope shrinks to near-zero** — we're not collecting, storing, or processing personal information. The PIA would document that explicitly and serve as a compliance artifact.
- **VAPT scope is limited** to the static web server and the PDF generation endpoint (which receives transient HTML and returns a PDF buffer — no persistence). This is far simpler and cheaper than VAPT-ing a full authenticated app with a database.
- **NPC registration** — if we collect no personal information, registration obligations are significantly reduced.
- **E-Gov Act alignment** — a tool that keeps data local and gives agencies full control over their own ISSP data is strongly aligned with the spirit of the E-Gov Act's sovereignty and transparency provisions.

---

## 3. Answering the Two Questions

### Q1: Does autosave currently use only the browser/cookies?

**No.** The current autosave (`useAutoSave` hook) calls server-side PUT API endpoints (`/api/issp/documents/[id]/partX`) which write to the SQLite database hosted on our server. The JWT cookie (`authjs.session-token`) is used only to authenticate those API calls — it does not store document content. The document data itself lives entirely server-side.

In a local-first redesign, autosave would write to **`IndexedDB`** (the browser's persistent key-value store, significantly larger and more structured than `localStorage`). Nothing would leave the client except for the optional PDF export call.

### Q2: UX pattern for autosave + save-to-file reminder

#### The core tension
Browser storage (`IndexedDB`) is ephemeral from the user's perspective — clearing browser data, switching computers, or opening an incognito tab loses everything. Government users especially cannot be expected to understand this. The UX must compensate with a persistent, non-annoying "save your work to a file" rhythm.

#### Recommended pattern: "Working Copy + Export"

**Layer 1 — Silent autosave to IndexedDB (always on)**
- Saves on every change, debounced 1.5s (same as current)
- This is the "working copy" — recoverable if the tab is accidentally closed, but not portable
- Status indicator: *"Draft saved in browser"* (subtle, not alarming)

**Layer 2 — Prominent "Export File" button (always visible)**
- Placed in the editor header, always visible — not in a menu, not a secondary action
- Distinct visual treatment (e.g. outlined blue button with a download icon)
- Label: *"Save to File"* (not "Export" — government users understand "Save")
- Clicking downloads the `.issp` file to the user's local machine immediately

**Layer 3 — "Last saved to file" timestamp**
- Shown next to the Save to File button: *"Last saved: 34 min ago"* or *"Never saved to file"*
- Creates soft urgency without modal interruptions
- Turns red/amber if it's been more than 30 minutes since the last file export

**Layer 4 — Periodic reminder toast (every ~20 min of active editing)**
- Non-blocking, dismissible toast at the bottom of the screen:
  > *"Your ISSP draft is stored in this browser only. Export a copy to your computer so you don't lose it."*
  > [Save to File ↓]  [Dismiss]
- Not shown if the user exported within the last 20 minutes

**Layer 5 — Section-complete nudge**
- When a user finishes filling out a Part and navigates away, a small inline prompt:
  > *"Part I complete — want to save a backup copy?"* [Save Now] [Not yet]
- This creates a natural rhythm: finish a section → save a file

**Layer 6 — beforeunload warning**
- Standard browser "Are you sure you want to leave?" dialog, triggered if:
  - There are unsaved changes (autosave has run but no file export yet in this session), OR
  - The last file export was more than 60 minutes ago

---

## 4. Local File Format

### Recommended: `.issp` (JSON with custom extension)

```
NCWTR-ISSP-2026-2028.issp
```

- **Internally**: plain JSON — the full ISSP document tree serialized as a single object
- **Custom extension**: `.issp` gives it a tool-specific identity (users know what it is), allows future OS file association, and mirrors how design tools do it (`.fig`, `.sketch`, `.pptx`)
- **Human-readable**: a `.issp` file can be opened in any text editor for inspection — important for government transparency
- **Versioned**: include a `version` field in the JSON so future tool versions can migrate older files
- **Encryption**: opt-in passphrase protection (see Section 4a below) — the agency is responsible for securing the file on their own systems regardless

#### File structure (proposed)

The `.issp` envelope includes a `fileType` field to distinguish between the main ISSP document and standalone annex files (Annex 1, Annex 2). This allows the consolidation UI to validate attached files and prevents a user accidentally loading an annex file as a main ISSP.

| `fileType` | Created by | Contents |
|---|---|---|
| `"issp-main"` | Main ISSP editor | Parts I–IV |
| `"annex1"` | Annex 1 standalone module | ICT Asset Inventory + office identity |
| `"annex2"` | Annex 2 standalone module (future) | DRBCP for ICT Resources + office identity |

Files without a `fileType` field are treated as `"issp-main"` for backward compatibility.

**Main ISSP file (`fileType: "issp-main"`)**:

```json
{
  "version": "1.0",
  "fileType": "issp-main",
  "exportedAt": "2026-05-17T10:30:00Z",
  "tool": "issp-platform",
  "document": {
    "title": "NCWTR Information Systems Strategic Plan 2026–2028",
    "startYear": 2026,
    "endYear": 2028,
    "status": "draft",
    "scope": "AGENCY_WITH_REGIONAL",
    "amendmentNumber": 0,
    "agency": { "name": "...", "acronym": "...", "type": "NGA" },
    "part1": { ... },
    "part2": { ... },
    "part3": { ... },
    "part4": { ... }
  }
}
```

**Annex 1 file (`fileType: "annex1"`)**:

```json
{
  "version": "1.0",
  "fileType": "annex1",
  "exportedAt": "2026-05-17T10:30:00Z",
  "tool": "issp-platform",
  "office": {
    "type": "field",
    "region": "NCR",
    "parentRegion": "NCR",
    "name": "UP Diliman Field Office",
    "displayLabel": "NCR › UP Diliman Field Office"
  },
  "annex1": {
    "equipment": [ ... ],
    "software": [ ... ]
  }
}
```

---

## 4a. Optional File Encryption

> **Status:** Planned — implement as part of the local-first rearchitecture (not a standalone feature).

### Design decision: opt-in, not mandatory

Encryption is offered as an option when the user clicks "Save to File." It is **off by default.** Reasons:

- Government auditors and DICT reviewers may need to inspect `.issp` files directly (a `.issp` file is plain JSON, readable in any text editor — this is a transparency feature, not a bug)
- Mandatory encryption adds passphrase management burden for agencies who lose the passphrase and lose their ISSP
- Opt-in gives security-conscious agencies the option without forcing it on everyone

UX: a checkbox in the Save to File dialog — *"Protect with a passphrase."* When checked, a passphrase input appears. A warning is shown: *"If you forget this passphrase, your ISSP file cannot be recovered."*

### Cryptographic approach

No external library required. All primitives are available in `window.crypto.subtle` — the Web Crypto API built into every modern browser.

**Key derivation:** PBKDF2 with SHA-256, 310,000 iterations (OWASP 2023 recommendation for PBKDF2-SHA-256), random 16-byte salt.

**Encryption:** AES-256-GCM — authenticated encryption, meaning the ciphertext is tamper-evident. A corrupted or maliciously modified file will fail to decrypt.

### Encrypted file structure

When encryption is enabled, the `.issp` file format changes from a document object to an envelope:

```json
{
  "version": "1.0",
  "encrypted": true,
  "kdf": "PBKDF2",
  "kdfParams": {
    "hash": "SHA-256",
    "iterations": 310000,
    "saltBase64": "<random 16-byte salt, base64-encoded>"
  },
  "cipher": "AES-256-GCM",
  "ivBase64": "<random 12-byte IV, base64-encoded>",
  "ciphertextBase64": "<base64-encoded AES-GCM ciphertext of the full document JSON>"
}
```

The `document` field is absent — it exists only as ciphertext until decrypted.

Unencrypted files (where `encrypted` is absent or `false`) retain the original structure and load without prompting.

### Decryption flow

1. File loaded → parser checks for `"encrypted": true`
2. Passphrase prompt shown
3. PBKDF2 run with stored `saltBase64` and `kdfParams` → AES-256 key derived
4. `crypto.subtle.decrypt("AES-GCM", key, ciphertext)` → plaintext JSON
5. JSON parsed → document loaded into the editor
6. If decryption fails (wrong passphrase or tampered file): clear error shown, no partial data loaded

### Implementation notes

```typescript
// Key derivation
const keyMaterial = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(passphrase),
  "PBKDF2",
  false,
  ["deriveKey"]
);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, hash: "SHA-256", iterations: 310_000 },
  keyMaterial,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt", "decrypt"]
);

// Encrypt
const iv = crypto.getRandomValues(new Uint8Array(12));
const ciphertext = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv },
  key,
  new TextEncoder().encode(JSON.stringify(document))
);

// Decrypt
const plaintext = await crypto.subtle.decrypt(
  { name: "AES-GCM", iv },
  key,
  ciphertext
);
```

### Compatibility guarantee

- Unencrypted `.issp` files always load without a passphrase prompt
- Encrypted files always prompt — the loader checks the `encrypted` field
- The `version` field governs document schema migrations; the `encrypted` field governs the load path — they are independent

### Estimated implementation effort

2–3 hours once the local-first save/load mechanism is in place. The crypto primitives are trivial; the work is mostly in the save/load UX (passphrase dialog, error states, the "no recovery" warning).

---

### Secondary format: PDF

The existing PDF export (Puppeteer-based, DICT-compliant) remains the **submission format** — the document you send to DICT or attach to your MFO accountability report. The `.issp` file is the **working format** — the file you save to your Desktop and reopen next week to continue editing.

### Format summary

| Format | Purpose | When |
|---|---|---|
| `.issp` (JSON) | Working copy / draft / backup | Every editing session — Save to File button |
| PDF | Formal submission to DICT/oversight | Final step — Export PDF button |

---

## 5. Architecture Changes Required

> This section documents what would need to change — not a plan to execute yet.

### Remove
- NextAuth.js (no login, no sessions)
- SQLite database (no server-side persistence)
- Prisma ORM and all DB schema
- All `/api/issp/documents/**` PUT/POST/GET/DELETE routes (the data-bearing ones)
- `src/proxy.ts` auth middleware (no auth needed)
- User/Agency/IsspDocument models

### Keep
- Next.js App Router (serves the static UI)
- The ISSP form components (all Part I–IV forms) — same UI, different data layer
- PDF export endpoint (`/api/issp/documents/export`) — but refactored to accept the full ISSP JSON in the POST body rather than fetching from DB
- `render-issp-html.ts` and `generate-pdf.ts` — unchanged
- Landing page, about page

### New
- **`IndexedDB` data layer** — replaces API calls; a small client-side module that reads/writes ISSP state to IndexedDB
- **`.issp` file import/export** — `JSON.stringify` on save, `JSON.parse` on load, with a `<input type="file">` for import
- **"New ISSP" flow** — instead of a create dialog with auth, a simple form asking for agency name, acronym, and coverage period
- **Save-to-file UX** — the persistent reminder system described in Section 3
- **No-auth PDF export** — refactored to accept JSON body from client (POST instead of GET) without requiring a session

### PDF export consideration
The PDF generation still requires a server (Puppeteer runs Chrome server-side). In the local-first model:
- Client POSTs the full ISSP JSON to `/api/export` (no session required, no auth)
- Server renders HTML from the JSON, generates PDF, streams it back
- **Server never persists anything** — the JSON is used only to generate the PDF and is discarded
- This is the only server-side call in the entire application
- VAPT scope: this single endpoint

---

## 6. Privacy Impact Assessment (PIA) Outline

> To be written formally before public launch. This is a starting outline.

**System name:** ISSP Platform  
**PIA author:** Carlos Antonio Albornoz  
**Date:** TBD  
**NPC reference:** RA 10173 IRR, Section 12 (Privacy Impact Assessment)

### What data is collected?
- Under the proposed local-first architecture: **none**
- The tool processes ISSP data locally in the user's browser
- The only server call is PDF generation, which receives transient HTML and returns a PDF — nothing is stored
- Server logs (standard web server access logs) may record IP addresses and request timestamps — this should be noted

### Personal information involved?
- ISSP documents may contain names of CIO and ICT Focal Person (required DICT fields)
- In the local-first model, these names are stored only on the user's own device — they are never transmitted to our servers except transiently during PDF generation
- Recommendation: include a note in the PDF generation API's privacy documentation that names included in the exported ISSP pass through the server transiently but are not logged or persisted

### Data flows
```
User's browser (IndexedDB)
    → [on Save to File] → User's local filesystem (.issp file)
    → [on Export PDF] → POST to /api/export (transient, no persistence)
                      → PDF returned to browser
                      → User's local filesystem (.pdf file)
```
No other data flows.

### Risks and mitigations
| Risk | Mitigation |
|---|---|
| User loses work (browser cleared) | Save-to-file UX reminders; beforeunload warning |
| PDF export endpoint could be abused | Rate limiting on /api/export; no data persistence |
| Server access logs contain IP addresses | Standard log retention policy; document in privacy notice |
| .issp file left on shared computer | Out of scope for the tool; user responsibility; add note in UI |

---

## 7. VAPT Considerations

Under the local-first architecture, the VAPT scope is limited to:

1. **Static file server** — the Next.js app serving HTML/CSS/JS. Standard web server hardening.
2. **`/api/export` endpoint** — the only server-side processing endpoint. Receives JSON, returns PDF. Attack surface: malformed JSON, oversized payloads, SSRF via embedded URLs in the HTML, DoS via expensive PDF generation.

Recommended VAPT focus areas for `/api/export`:
- Input validation: reject malformed or excessively large JSON payloads
- SSRF: Puppeteer should not be allowed to make network requests during PDF generation (disable network in Chrome sandbox)
- DoS: rate limiting, timeout on Puppeteer rendering
- Output: ensure PDF response headers are correct (Content-Disposition: attachment) to prevent inline rendering of attacker-controlled content

---

## 8. Open Questions / Things to Decide

1. **Multi-document support** — can a user work on multiple ISSPs (e.g. one for each coverage period) stored in IndexedDB? Or is it always one active document?
2. **File versioning** — should the `.issp` file include a version history, or just the current state?
3. **Agency identity** — without accounts, how do we identify "which agency" is using the tool? Answer: we don't. The tool is anonymous. The agency name in the document is what matters.
4. **Collaboration** — multi-user editing (CIO + Focal Person working together) is impossible in a local-first model without a server. Is this a dealbreaker? Options: (a) accept that collaboration is file-based (one person drafts, shares the .issp file, other person continues); (b) offer an optional "collaboration mode" that requires opt-in account creation.
5. **PDF export authentication** — the current PDF export requires a session to fetch document data. In local-first mode, the client sends the data. The endpoint should have CSRF protection or at minimum an `Origin` check to prevent third-party abuse.
6. **Network diagram uploads** — currently stored server-side in `public/uploads/`. In local-first mode, images would need to be stored as base64 in the `.issp` JSON, which could make files large. Alternatively, only store a reference and require the user to re-upload on each session.
7. **DICT endorsement** — before encouraging other agencies to use this, it would be ideal to get informal feedback or endorsement from DICT. The platform's alignment with the MITHI advisory and DICT 2026 template strengthens this case.
