# Agency Logo & PDF Header — Current State + Planned Work

> **Status:** Logo upload shipped 2026-06-10. **Header layout adjustments pending** — the
> logo implementation below is provisional and will change when we revise the headers.

---

## Current state (shipped 2026-06-10)

Agencies can upload a logo that replaces the default DICT logo in the exported PDF, per the
uniformity requirement in `references/ISSP_Guidelines_2026.md` ("Header → Replace DICT logo
with Agency logo").

**Where it lives:**
- **Upload UI** — `IsspFormFields` in `src/components/editor/issp-properties-dialog.tsx`
  (shared by both the *New ISSP* and *ISSP Properties* dialogs). Thumbnail preview +
  Upload/Replace/Remove controls.
- **Validation** — `getLogoUploadError` / `LOGO_ACCEPT` in `src/lib/diagram-upload.ts`
  (PNG/JPG/WebP/SVG, ≤ 2 MB). Stored as a base64 data URL on `agency.logoBase64`.
- **PDF cover** — `render-issp-html.ts`, `coverLogoHtml` (centered above the title).
- **PDF running header** — `generate-pdf.ts`, `logoBlock` (logo + acronym, repeats every page).
- Both render sites gate on `startsWith("data:image/")`; a missing/invalid logo falls back to
  the agency-name text (safe by design — see `docs/codebase-review-2026-06-10.md` finding 2).

## Planned work — header adjustments (NOT yet done)

The PDF headers are going to be revised. When that happens, the logo placement/sizing above
will likely change too. Open questions to settle during that work:

- Final header layout & exact logo dimensions (cover vs. running header may differ).
- Whether the running header keeps the acronym text alongside the logo, or logo-only.
- Alignment/spacing against the DICT template's header format once we re-check it.
- Revisit the 18px running-header logo height and 40px cover logo height after layout changes.

**When picking this up:** re-read the header template in `generate-pdf.ts` and `coverLogoHtml`
/ `pageHeader` in `render-issp-html.ts` together — they must stay visually consistent.
