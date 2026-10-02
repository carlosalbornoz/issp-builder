// Deleting a III-E project removes everything that belongs to it — its III-F
// KPI set and its Part IV budget in every year — and the confirmation dialog
// lists exactly those items first. Before, the delete removed only the project
// and left its money counted in the summaries (audit F2, F10; decision Q3).
// Run: npx tsx scripts/verify-project-delete.ts
import assert from "node:assert/strict";
import { createEmptyDocument } from "../src/lib/store/defaults";
import { projectCasualties, withoutProjectData } from "../src/lib/project-delete";
import type { IctProject, IsspDocument, KpiRow, LineItem } from "../src/lib/store/types";

function line(id: string, unitCost: number, qty = 1): LineItem {
  return { id, item: `Item ${id}`, office: "", categoryId: "", fundSource: "General Appropriations Act", qty, unitCost };
}
function kpi(id: string): KpiRow {
  return { id, hierarchy: "Output", targetedResult: "", indicator: `KPI ${id}`, baseline: "", year1Target: "", year2Target: "", year3Target: "", dataCollectionMethod: "", responsibleUnit: "" };
}
function project(id: string): IctProject {
  return {
    id, title: `Project ${id}`, description: "", objectives: "", projectType: "STANDALONE", linkedSystemIds: [], strategicAlignment: [],
    harmonizationFramework: [], implementingUnit: "", fundingSource: "", year1Deliverables: "", year2Deliverables: "", year3Deliverables: "", duration: "",
  };
}
function fixture(): IsspDocument {
  const doc = createEmptyDocument({
    title: "Delete fixture", startYear: 2028, endYear: 2030, amendmentNumber: 0, scope: "AGENCY_WIDE",
    agencyHeadName: "Head", agency: { name: "Smoke Agency", acronym: "SMK", type: "NGA", websiteUrl: "", logoBase64: null },
  });
  doc.part3.internalProjects = [project("gone"), project("stays")];
  doc.part3.crossAgencyProjects = [project("x")];
  doc.part3.performanceFramework = {
    gone: { projectTitle: "Project gone", projectCategory: "internal", rows: [kpi("k1"), kpi("k2")] },
    stays: { projectTitle: "Project stays", projectCategory: "internal", rows: [kpi("k3")] },
  };
  doc.part4.year1.internalProjects = {
    gone: { projectTitle: "Project gone", capitalOutlay: [line("a", 1000, 2)], mooe: [line("b", 500)] },
    stays: { projectTitle: "Project stays", capitalOutlay: [line("c", 7)], mooe: [] },
  };
  doc.part4.year3.internalProjects = { gone: { projectTitle: "Project gone", capitalOutlay: [], mooe: [line("d", 250)] } };
  doc.part4.year2.crossAgencyProjects = { x: { projectTitle: "Project x", capitalOutlay: [line("e", 9)], mooe: [] } };
  return doc;
}

// ─── (1) the dialog's list: every KPI row and budget line, with the total ────
{
  const c = projectCasualties(fixture(), "internalProjects", "gone");
  assert.deepEqual(c.kpiRows.map((r) => r.id), ["k1", "k2"], "(1) KPI rows of the project");
  assert.deepEqual(
    c.budgetLines.map((b) => [b.year, b.expenseClass, b.line.id]),
    [[2028, "capitalOutlay", "a"], [2028, "mooe", "b"], [2030, "mooe", "d"]],
    "(1) budget lines in year order, CO before MOOE"
  );
  assert.equal(c.budgetTotal, 2750, "(1) budget total = 2×1000 + 500 + 250");
}

// ─── (2) a project with nothing attached lists nothing ───────────────────────
{
  const c = projectCasualties(fixture(), "internalProjects", "stays-nothing");
  assert.deepEqual([c.kpiRows.length, c.budgetLines.length, c.budgetTotal], [0, 0, 0], "(2) nothing to list");
}

// ─── (3) the removal takes the KPI set and every year's budget, nothing else ─
{
  const doc = fixture();
  const before = structuredClone(doc);
  const { performanceFramework, part4 } = withoutProjectData(doc, "internalProjects", "gone");
  assert.deepEqual(Object.keys(performanceFramework), ["stays"], "(3) only the deleted project's KPI set goes");
  assert.deepEqual(Object.keys(part4.year1.internalProjects), ["stays"], "(3) year 1 budget removed, others kept");
  assert.deepEqual(Object.keys(part4.year3.internalProjects), [], "(3) year 3 budget removed");
  assert.deepEqual(part4.year2.crossAgencyProjects, before.part4.year2.crossAgencyProjects, "(3) the other list is untouched");
  assert.deepEqual(doc, before, "(3) pure: the input document is not mutated");
}

// ─── (4) cross-agency projects use their own budget list ─────────────────────
{
  const { part4 } = withoutProjectData(fixture(), "crossAgencyProjects", "x");
  assert.deepEqual(part4.year2.crossAgencyProjects, {}, "(4) cross-agency budget removed");
  assert.ok(part4.year1.internalProjects.gone, "(4) internal budgets untouched");
}

console.log("✓ project-delete verification passed");
