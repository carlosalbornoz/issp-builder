# Attribution & Recognition — Plan (later)

**Status:** Backlogged (captured 2026-06-13). Not yet scheduled. Build after current
usability/UX sweeps settle.

## Intent (from Carlos)

The tool is free, local-first, and ad-free — but hosting the infrastructure isn't free,
and Carlos wants a tasteful, dignified way to be **recognized** for building it. The ask is
recognition and goodwill, not money or ads:

- If an agency finds the tool useful, invite **feedback / comments**.
- Make it easy to give Carlos **recognition**: a nomination for **PRAISE awards**, a
  **letter of recommendation**, a testimonial, a kind word — the kind of recognition a
  civil-servant/civic-dev would value for their record.
- Acknowledge that **hosting costs real money** ("hosting this infrastructure is not free"),
  framed lightly ("eme eme"), **without running ads**.

## Proposed surface

A **modal that appears when a PDF export completes** and the file begins downloading:

- Triggers on export success (PDF generated, download started).
- **Points the user to their browser's download button** (top-right of the address bar) so
  they actually find the file — genuinely useful, not just self-promotion. This earns the
  moment of attention the attribution then gently uses.
- Below the "your download is ready ↗" cue, a short, warm attribution + the recognition ask
  (feedback link, "consider a PRAISE nomination / recommendation", contact).
- Tone: tasteful, self-aware, *para sa bayan* — matches the splash attribution chip
  (`Made with ❤️ … Carlos Antonio Albornoz`). Not pushy; dismissible; remembered so it
  doesn't nag every single export.

## Open questions to resolve when building

- **Frequency:** show once per session? once ever (localStorage flag)? every Nth export?
  Lean: first successful export per browser, then a much quieter footer/link afterward.
- **Where the download-arrow hint points** differs by browser (Chrome/Edge/Firefox/Safari) —
  use a generic "look for the download in your browser's toolbar, usually top-right" rather
  than a brittle per-browser pointer.
- **Links:** feedback channel (email already exists: issp-builder@carlosanton.io), maybe a
  short form; an explicit "how to nominate / recommend" blurb.
- Respect that some users export many times while iterating — never block or delay the
  download; the modal is additive and instantly dismissible.

## Related

- Splash attribution chip + What's New modal (`home-page-client.tsx`).
- Export flow: `POST /api/export` → `render-issp-html.ts` / `generate-pdf.ts`; the client
  trigger lives wherever the editor's Export action calls the API.
