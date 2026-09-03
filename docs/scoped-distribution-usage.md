# Scoped `.issp` Distribution — for the secretariat

The ISSP Builder is local-first: there is no server or login. **Scoped distribution**
lets the secretariat (the CIO office) split the agency ISSP across contributing
offices using `.issp` files alone — each office sees and fills only the fields
assigned to them, and the secretariat merges everything back into one master.

## The workflow at a glance

```
 Secretariat (master)            Office (scoped file)           Secretariat (master)
 ─────────────────────           ────────────────────           ─────────────────────
 1. Distribute          ──┐    3. Open their .issp
    pick fields per        ├──> sees ONLY their fields
    office → generate      │    fills them in, saves
    one .issp each         │    returns the file
                          ┌┘                                ┌──> 4. Consolidate
                          └─────────────────────────────────┤       review + apply
                                                              └──> 5. Export PDF
```

Only the consolidated master produces the official PDF.

## 1. Distribute (secretariat)

1. Open the **master** ISSP in the editor.
2. Click **Distribute to offices…** (in the sidebar's file-actions ⋯ menu — only visible on a master).
3. For each contributing office: type a name, then tick the areas / sections /
   fields that office owns in the tree. You can be as coarse as a whole Part or as
   fine as a single field (e.g. only *Part I-B → CIO Name*).
4. **Generate files** → one scoped `.issp` per office downloads. Send each office
   their file (email, shared drive — whatever you use).

The generated file carries only that office's owned fields plus the agency header
(name, years, etc.) so it's self-identifying. Everything else is stripped — Office
B cannot see Office A's data.

## 2. Edit (each office)

1. The office opens their `.issp` in the ISSP Builder (same app — Home → Load).
2. They land in **scoped mode**: only their assigned sections/fields show, a banner
   reads *"Scoped file — \<office\>"*, and **PDF export is hidden**.
3. They fill in their fields and add any rows they own (stakeholders, Annex 1
   inventory). Every row they add is silently stamped with their office id.
4. They **save** the `.issp` (it stays scoped) and return it to the secretariat.

Office identity (name + the hidden stable id) is fixed when the file is generated.
If you need to change which office owns what, generate a new file rather than
editing the scope by hand.

## 3. Consolidate (secretariat)

1. Open the **master** → **Consolidate returned files…** (sidebar file-actions ⋯ menu).
2. Select one or more returned `.issp` files. A **review screen** shows what each
   will do: overlay fields, replace that office's shared-table rows (stakeholders,
   Annex 1), flag overlapped sections, or surface a scalar conflict.
3. For any **scalar conflict** (two offices wrote the same field differently), pick
   which value to keep.
4. **Apply**. The master is updated; sections that need a dedup look get a **review
   flag** (a banner on the section + a badge in the sidebar).

Re-importing an office's file is idempotent — it replaces *their* rows/fields and
leaves everyone else's untouched, so you can re-consolidate corrected files freely.

## 4. Review flags

After consolidating, flagged sections show a **"Flagged during consolidation"**
banner ("Multiple scoped files contributed to this section — review for duplicates
or conflicting entries, then clear the flag."). Check the section, remove
duplicates, then click **Mark reviewed** to clear the flag.

## 5. Export the official PDF

Once the master is consolidated, **Export PDF** produces the official agency ISSP.
Scoped files cannot export PDF — only the master can.

## Things to keep in mind

- **Coordinate distribution rounds.** Generating a scoped file for an office starts
  their shared-table sections (stakeholders, Annex 1) **empty**. If an office that
  already contributed gets a fresh scoped file and returns it without re-entering
  their rows, consolidating it will replace their previous rows with none. Best
  practice: one distribution round per office, or tell them to keep their rows when
  they get an updated file.
- **Soft lock.** The scope is a UI/data gate, not encryption. A determined user
  *could* hand-edit the JSON. That's acceptable — it's the agency's own data, and
  the secretariat reviews everything on consolidate. Tamper-proofing can come later.
- **Legacy Annex 1 files still work.** Offices that send old-style standalone
  Annex 1 files can still be attached via the editor's "Attach Annex 1 files…" flow; both
  legacy-attached and scoped-consolidated Annex 1 entries coexist in the master and
  render in the PDF.

## Where to look in the code

- Scope types/resolver: `src/lib/scope/types.ts`, `src/lib/scope/paths.ts`
- Slice (Distribute) + merge (Consolidate): `src/lib/scope/slice.ts`,
  `src/lib/scope/consolidate.ts`
- Dialogs: `src/components/editor/distribute-dialog.tsx`,
  `src/components/editor/consolidate-dialog.tsx`
- Design spec: `docs/scoped-issp-distribution-design-2026-07-21.md`
