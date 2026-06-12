---
name: usability-patterns
description: Carlos's usability design principles and review method for the ISSP Builder (and his systems generally). Consult BEFORE designing any new UI surface and WHEN reviewing existing forms/flows. This is a living document — append new principles whenever Carlos gives usability feedback, with the incident that produced them.
---

# Usability Patterns — How Carlos Wants Systems Designed

A living document. Every principle below was extracted from a real correction or review
finding in this project. When Carlos gives new usability feedback, **add the principle here
with its incident** — don't just fix the instance.

## How Carlos runs a usability check (the method)

He walks the real flow **as a first-time end user** (an agency focal person, not a
developer), narrating what he can and cannot see. The recurring questions:

1. **"Did the user see what just happened?"** — every action must have a visible
   consequence at the point of attention (not below the fold, not implied).
2. **"Would they know what this means without asking?"** — labels judged against a
   first-time user with zero developer context.
3. **"What happens to old/existing data?"** — he loads old files and pre-existing
   documents against new features; hidden or hidden-by-default data is a bug.
4. **"Where do I manage this state?"** — any state the app holds (drafts, caches, links)
   must have a visible place to inspect and clear it.

He checks in passes: one concern at a time across the whole builder (e.g. one pass for
input-control fit, one for label clarity, one for add/edit/delete flows). Findings go in a
dated audit doc with severity tiers, then a phased fix plan he approves before any code.

## The principles

### 1. Visible consequence — never add silently
**Incident:** III-D/E "Add Project" appended a card below existing ones; user didn't know
anything was added ("hindi alam na may na-add na pala sa ibaba").
**Rule:** Adding an item happens in a focused surface (modal/drawer — see Part IV's
LineItemDrawer, the house exemplar), or at minimum the new item is scrolled into view with
its first input focused. Off-screen mutations are bugs.

### 2. Read and edit are different modes
**Incident:** III-E project accordions opened fully editable; reading required wading
through inputs, and accidental edits were one keystroke away.
**Rule:** Lists of rich objects open **collapsed**; expanding shows a **read-optimized
view** (label/value rows, checked-only summaries, formatted numbers — not disabled inputs);
editing is an explicit action (Edit button → drawer or edit mode). Default to viewing.

### 3. Labels answer source, consequence, audience
**Incident:** III-A's "Current" badge (silently mirrored from Part II-B) and the bare
"Proposed" checkbox; fixed as "Already in place (per Part II-B)" + "Strengthen / upgrade"
vs "Propose to add" (commit `41b5c70`).
**Rule:** Every label/badge/checkbox must say (a) **where the value comes from** if
derived ("per Part II-B", "auto-calculated"), (b) **what acting on it means** (verb
phrases, not nouns), (c) in words a first-time focal person understands — prefer the
official template's own vocabulary.

### 4. Cross-references warn, by name, verbosely
**Incident:** linking a proposed IS already linked to another project gave no signal;
double-counting risk invisible.
**Rule:** When an action creates a second relationship to something already claimed,
name the existing counterpart and explain the risk before applying ("X is already linked
to Project SIKAP… budget and KPIs may be double-counted. Link anyway?"). Indicators that
say *that* something is linked must also say *to what*.

### 5. Destruction is two-step, sized to the loss
**Incident:** one mis-tap deleted a fully-filled IS card (~20 fields) instantly.
**Rule:** Container objects get a two-tap confirm (armed "Confirm?" state, 3 s timeout);
deletes with downstream casualties name them ("Delete project + its KPIs/budget?"). Small
rows stay instant — friction proportional to what's lost.

### 6. The app's hidden state must be self-evident and manageable
**Incident:** returning to the splash screen with work in IndexedDB showed a generic
landing page — no sign of the draft, no way to clear it outside the editor.
**Rule:** Wherever the app holds state for the user, the entry point must surface it
("Continue where you left off" + metadata: title, last edited, completion) and offer the
same management actions (clear, with two-step confirm) available elsewhere.

### 7. Old data must survive — and stay visible — through schema changes
**Incidents:** classification enums never matching the PDF; freeform `projectType` hiding
the linked-systems picker on old files.
**Rule:** See the schema-change skill: map historical values, derive gating fields from
the data they gate, test by loading a pre-change `.issp` and confirming everything is
visible without touching a control.

### 8. Derived/copied data may never go stale
**Incidents:** stored project-title copies printing old names in the PDF; CIO→focal
one-time copy diverging from the live CIO fields.
**Rule:** Store ids, resolve display values live at render/export. If a mirror flag
exists ("same as CIO"), keep the mirror in sync on every write *and* derive at export as
a backstop.

### 9. Compact UI, honest affordances
**Standing preferences:** desktop stays dense (standard Tailwind p-2/p-3; touch sizes only
under `pointer: coarse`); left-aligned nav; no decorative controls — a drag handle that
doesn't drag is a lie, remove it.

## Process expectations (how to work with these)

- **Plan first:** findings → dated audit doc (severity tiers, file:line) → phased plan doc
  → explicit approval → one commit per phase, verified per the verify-feature skill.
- **Document after:** update the audit doc's status banner, `docs/project-status.md`, and
  memory after each phase.
- **Flag the family, not the instance:** when Carlos reports one bad control, grep for the
  same pattern everywhere and list the siblings in the audit doc ("flag similar items").
- **This file is append-only in spirit:** new feedback ⇒ new principle (or sharpen an
  existing one) with its incident, same session.
