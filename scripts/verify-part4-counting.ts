// Part IV counts only the budget the year pages list: project budgets of
// projects that still exist in Part III-E, in years their duration covers.
// Before the fix, B.1–B.4 (editor + PDF) and III-E Total Project Cost summed
// every stored budget record, so a deleted project's or an off-duration
// year's money was in the totals but on no visible line.
// Audit: docs/audit-pdf-hidden-values-2026-10-02.md (F2, F3).
// Run: npx tsx scripts/verify-part4-counting.ts
import assert from "node:assert/strict";
import { createEmptyDocument } from "../src/lib/store/defaults";
import { toRenderData } from "../src/lib/pdf/to-render-data";
import { renderContentHtml } from "../src/lib/pdf/render-issp-html";
import { buildPart4Summary, computeProjectCosts, countedPart4 } from "../src/components/issp-editor/part4/part4-aggregations";
import type { IctProject, IsspDocument, LineItem } from "../src/lib/store/types";

const AMOUNT = 777777.77;
const PRINTED = "777,777.77";

function line(id: string): LineItem {
  return { id, item: `Line ${id}`, office: "", categoryId: "co-ict-software", fundSource: "General Appropriations Act", qty: 1, unitCost: AMOUNT };
}
function project(id: string, duration: string): IctProject {
  return {
    id, title: `Project ${id}`, description: "", objectives: "", projectType: "STANDALONE", linkedSystemIds: [], strategicAlignment: [],
    harmonizationFramework: [], implementingUnit: "", fundingSource: "", year1Deliverables: "", year2Deliverables: "", year3Deliverables: "", duration,
  };
}
function baseDoc(): IsspDocument {
  return createEmptyDocument({
    title: "Counting fixture", startYear: 2028, endYear: 2030, amendmentNumber: 0, scope: "AGENCY_WIDE",
    agencyHeadName: "Head", agency: { name: "Smoke Agency", acronym: "SMK", type: "NGA", websiteUrl: "", logoBase64: null },
  });
}
const pdfHtml = (doc: IsspDocument) => renderContentHtml(toRenderData(doc));
const grand = (doc: IsspDocument) => buildPart4Summary(doc).grandTotals;

// ─── control: a live, in-duration project's line counts everywhere ───────────
{
  const doc = baseDoc();
  doc.part3.internalProjects = [project("live", "2028")];
  doc.part4.year1.internalProjects["live"] = { projectTitle: "Project live", capitalOutlay: [line("a")], mooe: [] };
  assert.deepEqual(grand(doc), [AMOUNT, 0, 0], "(control) editor B.1 grand totals");
  assert.ok(pdfHtml(doc).includes(PRINTED), "(control) the PDF prints the amount");
  assert.equal(computeProjectCosts(countedPart4(doc), "internalProjects")["live"], AMOUNT, "(control) III-E Total Project Cost");
}

// ─── F2: a deleted project's budget counts nowhere ───────────────────────────
{
  const doc = baseDoc();
  doc.part4.year1.internalProjects["gone"] = { projectTitle: "Project gone", capitalOutlay: [line("b")], mooe: [] };
  doc.part4.year2.crossAgencyProjects["gone-x"] = { projectTitle: "Project gone-x", capitalOutlay: [], mooe: [line("c")] };
  assert.deepEqual(grand(doc), [0, 0, 0], "(F2) editor summary ignores deleted projects' budgets");
  assert.deepEqual(buildPart4Summary(doc).b4, [], "(F2) editor B.4 has no category rows");
  assert.ok(!pdfHtml(doc).includes(PRINTED), "(F2) the PDF prints no deleted-project money");
}

// ─── F3: a line outside the project's duration counts nowhere ────────────────
{
  const doc = baseDoc();
  doc.part3.internalProjects = [project("short", "2028")];
  doc.part4.year2.internalProjects["short"] = { projectTitle: "Project short", capitalOutlay: [line("d")], mooe: [] };
  assert.deepEqual(grand(doc), [0, 0, 0], "(F3) editor summary ignores off-duration lines");
  assert.equal(computeProjectCosts(countedPart4(doc), "internalProjects")["short"] ?? 0, 0, "(F3) III-E Total Project Cost ignores them");
  assert.ok(!pdfHtml(doc).includes(PRINTED), "(F3) the PDF prints no off-duration money (B.1–B.4, Total Project Cost)");
}

// ─── the stored data is untouched (lines stay visible in the editor's warning) ─
{
  const doc = baseDoc();
  doc.part4.year1.internalProjects["gone"] = { projectTitle: "Project gone", capitalOutlay: [line("e")], mooe: [] };
  const before = structuredClone(doc);
  countedPart4(doc);
  pdfHtml(doc);
  assert.deepEqual(doc, before, "counting never mutates the document");
}

console.log("✓ part4 counting verification passed");
