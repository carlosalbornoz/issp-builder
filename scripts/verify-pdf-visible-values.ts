// The PDF prints only what the editor shows. Forms hide a dependent field when
// its gate is off (checkbox, Yes/No answer, status) but keep the stored value,
// so re-ticking brings the text back; the export must apply the same gate.
// Audit: docs/audit-pdf-hidden-values-2026-10-02.md (F1, F4–F8).
// Run: npx tsx scripts/verify-pdf-visible-values.ts
import assert from "node:assert/strict";
import { createEmptyDocument } from "../src/lib/store/defaults";
import { toRenderData } from "../src/lib/pdf/to-render-data";
import { renderContentHtml } from "../src/lib/pdf/render-issp-html";
import type { InformationSystem, IsspDocument, ProposedSystem } from "../src/lib/store/types";

function baseDoc(agencyType: "NGA" | "LGU" = "NGA"): IsspDocument {
  return createEmptyDocument({
    title: "Visible values fixture", startYear: 2028, endYear: 2030, amendmentNumber: 0, scope: "AGENCY_WIDE",
    agencyHeadName: "Head", agency: { name: "Smoke Agency", acronym: "SMK", type: agencyType, websiteUrl: "", logoBase64: null },
  });
}

const interop = (o: Partial<InformationSystem["interoperability"]> = {}): InformationSystem["interoperability"] => ({
  integrated: false, internalSystems: "", externalSystems: "", generatesData: false, processesExternalData: false, sharedPlatform: false, ...o,
});

function existingIs(name: string, o: Partial<InformationSystem> = {}): InformationSystem {
  return {
    id: name, name, classification: "GENERAL_ADMIN", frontline: false, frontlineAccessType: "", url: "", description: "",
    developmentStrategy: "", developmentPlatform: "", databaseName: "", dataStorage: "", internalUsers: "", externalUsers: "",
    owner: "", interoperability: interop(), pia: { processesPersonalInfo: "", piaCompleted: false }, ...o,
  };
}

function proposedIs(name: string, o: Partial<ProposedSystem> = {}): ProposedSystem {
  return {
    id: name, name, classification: "GENERAL_ADMIN", frontline: false, frontlineAccessType: "", url: "", description: "",
    status: "FOR_DEVELOPMENT", enhancementDetails: "", developmentStrategy: "", developmentPlatform: "", databaseName: "",
    dataStorage: "", internalUsers: "", externalUsers: "", owner: "", interoperability: interop(),
    pia: { processesPersonalInfo: "", piaRequired: false }, ...o,
  };
}

const html = (doc: IsspDocument) => renderContentHtml(toRenderData(doc));

/** The two check glyphs printed after `marker`, searching from `from`. */
function ticksAfter(out: string, from: string, marker: string): string {
  const at = out.indexOf(marker, out.indexOf(from));
  assert.ok(at > -1, `marker "${marker}" not found after "${from}"`);
  return (out.slice(at).match(/[☑☐]/g) ?? []).slice(0, 2).join("");
}

// ─── F1: interoperability names print only with "Integration" ticked ─────────
{
  const doc = baseDoc();
  doc.part2.informationSystems = [
    existingIs("Hidden II-C", { interoperability: interop({ internalSystems: "HIDDEN-IC-INT", externalSystems: "HIDDEN-IC-EXT" }) }),
    existingIs("Shown II-C", { interoperability: interop({ integrated: true, internalSystems: "SHOWN-IC-INT", externalSystems: "SHOWN-IC-EXT" }) }),
  ];
  doc.part3.proposedSystems = [
    proposedIs("Hidden III-D", { interoperability: interop({ internalSystems: "HIDDEN-D-INT", externalSystems: "HIDDEN-D-EXT" }) }),
    proposedIs("Shown III-D", { interoperability: interop({ integrated: true, internalSystems: "SHOWN-D-INT", externalSystems: "SHOWN-D-EXT" }) }),
  ];
  const out = html(doc);
  for (const v of ["HIDDEN-IC-INT", "HIDDEN-IC-EXT", "HIDDEN-D-INT", "HIDDEN-D-EXT"]) assert.ok(!out.includes(v), `(F1) ${v} must not print`);
  for (const v of ["SHOWN-IC-INT", "SHOWN-IC-EXT", "SHOWN-D-INT", "SHOWN-D-EXT"]) assert.ok(out.includes(v), `(F1) ${v} prints`);
}

// ─── F4: EGP If-Yes / If-No branches follow the answer ───────────────────────
{
  const doc = baseDoc();
  doc.part2.egpChecklist.hcmis = { status: "yes", equivalentName: "HIDDEN-EQ-YES", ifNo: { usingEquivalent: true, manual: true } };
  const out = html(doc);
  assert.ok(!out.includes("HIDDEN-EQ-YES"), "(F4) answer Yes: the If-No IS name must not print");
  assert.ok(!out.includes("☑ Manual processing") && !out.includes("☑ Using equivalent system"), "(F4) answer Yes: no If-No box is ticked");
}
{
  const doc = baseDoc();
  doc.part2.egpChecklist.hcmis = { status: "no", equivalentName: "HIDDEN-EQ-UNTICKED", ifNo: { manual: true } };
  doc.part2.egpChecklist.ifmis = { status: "no", equivalentName: "SHOWN-EQ", ifNo: { usingEquivalent: true } };
  const out = html(doc);
  assert.ok(!out.includes("HIDDEN-EQ-UNTICKED"), "(F4) the IS name needs 'Using equivalent system' ticked");
  assert.ok(out.includes("☑ Manual processing"), "(F4) answer No: the ticked If-No box prints");
  assert.ok(out.includes("SHOWN-EQ"), "(F4) answer No + Using equivalent: the IS name prints");
}
{
  const doc = baseDoc("LGU");
  doc.part2.egpChecklist.elgu = { status: "no", url: "https://hidden-elgu-url.example", ifNo: { manual: true } };
  assert.ok(!html(doc).includes("hidden-elgu-url"), "(F4) eLGU answer No: the If-Yes URL must not print");
  doc.part2.egpChecklist.elgu = { status: "yes", url: "https://shown-elgu-url.example" };
  assert.ok(html(doc).includes("shown-elgu-url"), "(F4) eLGU answer Yes: the URL prints");
}
{
  // recordsMgmt's If-Yes system name follows the answer too.
  const doc = baseDoc();
  doc.part2.egpChecklist.recordsMgmt = { status: "no", equivalentName: "HIDDEN-RECORDS" };
  assert.ok(!html(doc).includes("HIDDEN-RECORDS"), "(F4) records answer No: the If-Yes system name must not print");
  doc.part2.egpChecklist.recordsMgmt = { status: "yes", equivalentName: "SHOWN-RECORDS" };
  assert.ok(html(doc).includes("SHOWN-RECORDS"), "(F4) records answer Yes: the system name prints");
}

// ─── F5: Enhancement Details print only for "For Enhancement" systems ────────
{
  const doc = baseDoc();
  doc.part3.proposedSystems = [
    proposedIs("Dev empty desc", { status: "FOR_DEVELOPMENT", description: "", enhancementDetails: "HIDDEN-ENH-DEV" }),
    proposedIs("Enh both", { status: "FOR_ENHANCEMENT", description: "SHOWN-DESC", enhancementDetails: "SHOWN-ENH" }),
  ];
  const out = html(doc);
  assert.ok(!out.includes("HIDDEN-ENH-DEV"), "(F5) For Development: hidden Enhancement Details must not print");
  assert.ok(out.includes("SHOWN-DESC"), "(F5) For Enhancement: the description prints");
  assert.match(out, /Enhancement to be done:\s*SHOWN-ENH/, "(F5) For Enhancement: the enhancement prints under its label");
}

// ─── F6: the PIA follow-up is ticked only when the answer is Yes ─────────────
{
  const doc = baseDoc();
  doc.part2.informationSystems = [
    existingIs("PIA-NO-SYS", { pia: { processesPersonalInfo: "no", piaCompleted: false } }),
    existingIs("PIA-BLANK-SYS", { pia: { processesPersonalInfo: "", piaCompleted: false } }),
    existingIs("PIA-YES-NOTDONE", { pia: { processesPersonalInfo: "yes", piaCompleted: false } }),
    existingIs("PIA-YES-DONE", { pia: { processesPersonalInfo: "yes", piaCompleted: true } }),
  ];
  const out = html(doc);
  const q = "did the system undergo PIA?";
  assert.equal(ticksAfter(out, "PIA-NO-SYS", q), "☐☐", "(F6) answer No: follow-up left blank");
  assert.equal(ticksAfter(out, "PIA-BLANK-SYS", q), "☐☐", "(F6) unanswered: follow-up left blank");
  assert.equal(ticksAfter(out, "PIA-YES-NOTDONE", q), "☐☑", "(F6) answer Yes, not done: No ticked");
  assert.equal(ticksAfter(out, "PIA-YES-DONE", q), "☑☐", "(F6) answer Yes, done: Yes ticked");
}

// ─── F7: the Online Portal URL is not printed (the form has no field for it) ─
{
  const doc = baseDoc();
  // Legacy files may also carry a status on this row (it has no Yes/No question now).
  doc.part2.egpChecklist.onlinePortal = { ...doc.part2.egpChecklist.onlinePortal, status: "yes", url: "https://hidden-portal-url.example" };
  assert.ok(!html(doc).includes("hidden-portal-url"), "(F7) legacy Online Portal URL must not print");
}

// ─── F8: eLGU answers print only for an LGU (the form hides the row otherwise) ─
{
  const doc = baseDoc("NGA");
  doc.part2.egpChecklist.elgu = { status: "yes", url: "https://hidden-nonlgu.example" };
  const out = html(doc);
  assert.ok(!out.includes("hidden-nonlgu"), "(F8) non-LGU: the eLGU URL must not print");
  assert.ok(out.includes("Is your LGU already utilizing the eLGU system?"), "(F8) the template row still renders (principle 14)");
  assert.equal(ticksAfter(out, "ELECTRONIC LOCAL GOVERNMENT UNIT", "Is your LGU already utilizing the eLGU system?"), "☐☐", "(F8) non-LGU: Yes/No left blank");
}

console.log("✓ pdf visible-values verification passed");
