// Verify script for the per-project slice filter (editScope.projectIds).
// Run: npx tsx scripts/verify-project-slice.ts
import assert from "node:assert/strict";
import { sliceScopedDoc, type DistributeSpec } from "../src/lib/scope/slice";
import { createEmptyDocument } from "../src/lib/store/defaults";
import type { IctProject, KpiRow, LineItem, ProjectKpiSet } from "../src/lib/store/types";

// ── fixtures ────────────────────────────────────────────────────────────────
function proj(id: string, title: string, linked: string[]): IctProject {
  return {
    id, title, description: "", objectives: "", projectType: "IS_DRIVEN",
    linkedSystemIds: linked, strategicAlignment: [], harmonizationFramework: [],
    implementingUnit: "", fundingSource: "", year1Deliverables: "",
    year2Deliverables: "", year3Deliverables: "", duration: "2028",
  };
}
function kpi(id: string): KpiRow {
  return { id, hierarchy: "Output", targetedResult: "", indicator: `indicator-${id}`, baseline: "",
    year1Target: "", year2Target: "", year3Target: "", dataCollectionMethod: "",
    responsibleUnit: "" };
}
function kpiSet(title: string, category: "internal" | "crossAgency"): ProjectKpiSet {
  return { projectTitle: title, projectCategory: category, rows: [kpi("k1")] };
}
function line(id: string, item: string): LineItem {
  return { id, item, office: "", categoryId: "",
    fundSource: "General Appropriations Act (GAA)", qty: 1, unitCost: 100 };
}

function makeMaster() {
  const d = createEmptyDocument({
    title: "Agency ISSP 2028-2030", startYear: 2028, endYear: 2030,
    amendmentNumber: 0, scope: "AGENCY_WIDE", agencyHeadName: "Dir. X",
    agency: { name: "N", acronym: "N", type: "NGA", websiteUrl: "", logoBase64: null },
  });
  d.part3.proposedSystems = [
    { id: "sys-hris", name: "HRIS", classification: "", frontline: false,
      frontlineAccessType: "", url: "", description: "", status: "",
      enhancementDetails: "", developmentStrategy: "", developmentPlatform: "",
      databaseName: "", dataStorage: "", internalUsers: "", externalUsers: "",
      owner: "", interoperability: { integrated: false, internalSystems: "",
        externalSystems: "", generatesData: false, processesExternalData: false,
        sharedPlatform: false },
      pia: { processesPersonalInfo: "", piaRequired: false } },
    { id: "sys-fin", name: "Finance", classification: "", frontline: false,
      frontlineAccessType: "", url: "", description: "", status: "",
      enhancementDetails: "", developmentStrategy: "", developmentPlatform: "",
      databaseName: "", dataStorage: "", internalUsers: "", externalUsers: "",
      owner: "", interoperability: { integrated: false, internalSystems: "",
        externalSystems: "", generatesData: false, processesExternalData: false,
        sharedPlatform: false },
      pia: { processesPersonalInfo: "", piaRequired: false } },
  ];
  d.part3.internalProjects = [
    proj("proj-sikap", "SIKAP", ["sys-hris"]),
    proj("proj-records", "Records Digitization", ["sys-fin"]),
  ];
  d.part3.crossAgencyProjects = [proj("proj-portal", "Bayanihan Portal", [])];
  d.part3.performanceFramework = {
    "proj-sikap": kpiSet("SIKAP", "internal"),
    "proj-records": kpiSet("Records Digitization", "internal"),
    "proj-portal": kpiSet("Bayanihan Portal", "crossAgency"),
  };
  d.part4.year1 = {
    officeProductivity: { capitalOutlay: [], mooe: [line("op-1", "Office connectivity")] },
    internalProjects: {
      "proj-sikap": { projectTitle: "SIKAP", capitalOutlay: [line("co-1", "Servers")], mooe: [] },
      "proj-records": { projectTitle: "Records Digitization", capitalOutlay: [], mooe: [line("m-1", "Scanning")] },
    },
    crossAgencyProjects: {
      "proj-portal": { projectTitle: "Bayanihan Portal", capitalOutlay: [], mooe: [line("m-2", "Hosting")] },
    },
    continuingCosts: { mooe: [line("cc-1", "Licenses")] },
  };
  d.part4.year2.internalProjects = {
    "proj-sikap": { projectTitle: "SIKAP", capitalOutlay: [], mooe: [line("y2-1", "Maintenance")] },
  };
  return d;
}

// ── (a) full bundle office: E1 + F + all three years, filtered to SIKAP ─────
{
  const master = makeMaster();
  const spec: DistributeSpec = {
    office: { id: "imp", name: "Implementor", displayLabel: "Implementor" },
    editable: ["part3/e1", "part3/f", "part4/year1", "part4/year2", "part4/year3"],
    projectIds: ["proj-sikap"],
  };
  const s = sliceScopedDoc(master, spec);

  assert.deepEqual(s.editScope!.projectIds, ["proj-sikap"], "(a) projectIds written through");
  assert.deepEqual(s.part3.internalProjects.map((p) => p.id), ["proj-sikap"],
    "(a) E1 filtered to selected project");
  assert.deepEqual(s.part3.crossAgencyProjects, [], "(a) unselected cross-agency project stripped");
  assert.deepEqual(Object.keys(s.part3.performanceFramework), ["proj-sikap"],
    "(a) PF filtered to selected project");
  assert.deepEqual(Object.keys(s.part4.year1.internalProjects), ["proj-sikap"],
    "(a) year1 internal budget filtered");
  assert.deepEqual(Object.keys(s.part4.year1.crossAgencyProjects), [],
    "(a) year1 cross-agency budget filtered");
  assert.deepEqual(Object.keys(s.part4.year2.internalProjects), ["proj-sikap"],
    "(a) year2 budget filtered");
  assert.deepEqual(s.part4.year1.officeProductivity, { capitalOutlay: [], mooe: [] },
    "(a) officeProductivity STRIPPED from project-filtered file (not the office's to edit)");
  assert.deepEqual(s.part4.year1.continuingCosts, { mooe: [] },
    "(a) continuingCosts STRIPPED from project-filtered file");
  assert.deepEqual(s.part3.proposedSystems.map((x) => x.id), ["sys-hris"],
    "(a) linked-system context: only systems of carried projects");
}

// ── (b) Part-IV-only office: project rows carried as read-only context ─────
{
  const master = makeMaster();
  const spec: DistributeSpec = {
    office: { id: "fin", name: "Finance", displayLabel: "Finance" },
    editable: ["part4/year1", "part4/year2", "part4/year3"],
    projectIds: ["proj-sikap"],
  };
  const s = sliceScopedDoc(master, spec);

  assert.ok(
    !s.editScope!.editable.includes("part3/e1"),
    "(b) III-E1 not owned"
  );
  assert.deepEqual(s.part3.internalProjects.map((p) => p.id), ["proj-sikap"],
    "(b) context rows injected even though E1 unowned (Part IV forms need them)");
  assert.deepEqual(s.part3.performanceFramework, {},
    "(b) PF unowned → stays at default (no context needed)");
  assert.deepEqual(Object.keys(s.part4.year1.internalProjects), ["proj-sikap"],
    "(b) year1 budget filtered to selected project");
  assert.deepEqual(s.part3.proposedSystems.map((x) => x.id), ["sys-hris"],
    "(b) linked-system context narrowed when E1+D unowned");
}

// ── (c) start-empty: projectIds [] strips every project row ─────────────────
{
  const master = makeMaster();
  const s = sliceScopedDoc(master, {
    office: { id: "x", name: "X", displayLabel: "X" },
    editable: ["part3/e1"],
    projectIds: [],
  });
  assert.deepEqual(s.part3.internalProjects, [], "(c) start-empty E1");
  assert.deepEqual(s.editScope!.projectIds, [], "(c) projectIds preserved as []");
}

// ── (d) legacy: no projectIds → wholesale copy (today's behavior) ───────────
{
  const master = makeMaster();
  const s = sliceScopedDoc(master, {
    office: { id: "x", name: "X", displayLabel: "X" },
    editable: ["part3/e1", "part3/f", "part4/year1"],
  });
  assert.equal(s.part3.internalProjects.length, 2, "(d) all internal projects copied");
  assert.equal(Object.keys(s.part3.performanceFramework).length, 3, "(d) all PF keys copied");
  assert.equal(Object.keys(s.part4.year1.internalProjects).length, 2, "(d) all budget keys copied");
  assert.equal(s.editScope!.projectIds, undefined, "(d) projectIds omitted (legacy shape)");
}

// ── (e) unowned year fields + owned III-D: filter/context boundaries ────────
{
  const master = makeMaster();
  const s = sliceScopedDoc(master, {
    office: { id: "x", name: "X", displayLabel: "X" },
    editable: ["part3/e1", "part3/d"], // owns systems; owns NO year, NO F
    projectIds: ["proj-sikap"],
  });
  assert.deepEqual(s.part4.year1.internalProjects, {}, "(e) unowned year stays at default");
  assert.deepEqual(s.part3.proposedSystems.map((x) => x.id), ["sys-hris"],
    "(e) owned III-D also carries ONLY the carried projects' systems (one rule)");
}

// ── (f) deep isolation: mutating the slice never touches the master ─────────
{
  const master = makeMaster();
  const s = sliceScopedDoc(master, {
    office: { id: "x", name: "X", displayLabel: "X" },
    editable: ["part3/e1", "part4/year1"],
    projectIds: ["proj-sikap"],
  });
  s.part3.internalProjects[0].title = "MUTATED";
  // Categories never travel in a project-filtered file, so the slice holds
  // the empty default — no master row to alias or mutate through.
  assert.deepEqual(s.part4.year1.officeProductivity, { capitalOutlay: [], mooe: [] },
    "(f) categories excluded from the slice — nothing of master's to alias");
  assert.equal(master.part3.internalProjects[0].title, "SIKAP", "(f) master project row untouched");
  assert.equal(master.part4.year1.officeProductivity.mooe[0].item, "Office connectivity",
    "(f) master officeProductivity untouched");
}

// ── (g) Part-IV-only office, filtered: budget categories empty, projects kept ─
{
  const master = makeMaster();
  const s = sliceScopedDoc(master, {
    office: { id: "x", name: "X", displayLabel: "X" },
    editable: ["part4/year1", "part4/year2", "part4/year3"], // owns ONLY years
    projectIds: ["proj-sikap"],
  });
  assert.deepEqual(s.part4.year1.officeProductivity, { capitalOutlay: [], mooe: [] },
    "(g) year1 officeProductivity empty default");
  assert.deepEqual(s.part4.year1.continuingCosts, { mooe: [] },
    "(g) year1 continuingCosts empty default");
  assert.deepEqual(s.part4.year2.officeProductivity, { capitalOutlay: [], mooe: [] },
    "(g) year2 officeProductivity empty default");
  assert.deepEqual(s.part4.year3.continuingCosts, { mooe: [] },
    "(g) year3 continuingCosts empty default");
  assert.deepEqual(Object.keys(s.part4.year1.internalProjects), ["proj-sikap"],
    "(g) internal budget still filtered to the selected project");
}

// ── (h) a Standalone project's stored links carry no systems ────────────────
// The III-E link picker exists only for IS-driven projects; a project switched
// to Standalone keeps its old linkedSystemIds (so switching back restores
// them), but nothing may act on them (audit 2026-10-02, F9).
{
  const master = makeMaster();
  master.part3.internalProjects[0] = { ...master.part3.internalProjects[0], projectType: "STANDALONE" };
  const s = sliceScopedDoc(master, {
    office: { id: "imp", name: "Implementor", displayLabel: "Implementor" },
    editable: ["part3/e1"],
    projectIds: ["proj-sikap"],
  });
  assert.deepEqual(s.part3.proposedSystems.map((x) => x.id), [],
    "(h) Standalone project: its hidden links carry no systems");
  assert.deepEqual(s.part3.internalProjects[0].linkedSystemIds, ["sys-hris"],
    "(h) the stored links themselves are kept");
}

console.log("✓ project-slice verification passed");
