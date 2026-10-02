// Verify script for src/lib/scope/merge-review.ts — the merge review engine
// (Slice 3 of docs/superpowers/specs/2026-09-27-consolidate-merge-review-design.md).
//
// Seams: buildMergeReview(master, files), applyReviewDecisions(master, files,
// decisions), findBrokenLinks(doc, master).
// Run: npx tsx scripts/verify-merge-review.ts
import assert from "node:assert/strict";
import { applyReviewDecisions, buildMergeReview, findBrokenLinks, type ParsedScopedFile, type ReviewChange } from "../src/lib/scope/merge-review";
import { applyResolutions, consolidate, conflictKey } from "../src/lib/scope/consolidate";
import { createEmptyDocument } from "../src/lib/store/defaults";
import { cellLabel, formatValue } from "../src/components/editor/merge-review/format";
import { CURRENT_SCHEMA_VERSION } from "../src/lib/migration-review";
import type { Annex1FilePayload, IctProject, InformationSystem, IsspDocument, LineItem } from "../src/lib/store/types";

function makeMaster(): IsspDocument {
  return createEmptyDocument({
    title: "Review fixture",
    startYear: 2028,
    endYear: 2030,
    amendmentNumber: 0,
    scope: "AGENCY_WIDE",
    agencyHeadName: "Head",
    agency: { name: "Fixture Agency", acronym: "FA", type: "NGA", websiteUrl: "", logoBase64: null },
  });
}

/** A returned file for `officeId`, cut from `master` (like Distribute) then edited. */
function returned(master: IsspDocument, officeId: string, editable: string[], edit: (d: IsspDocument) => void): ParsedScopedFile {
  const d = structuredClone(master);
  d.editScope = {
    office: { id: officeId, name: `Office ${officeId}`, displayLabel: `Office ${officeId}` },
    editable,
    generatedAt: "2026-09-27T00:00:00.000Z",
  };
  edit(d);
  return { doc: d, sourceSchemaVersion: CURRENT_SCHEMA_VERSION };
}

function only(changes: ReviewChange[], label: string): ReviewChange {
  assert.equal(changes.length, 1, `${label}: expected exactly one change, got ${changes.map((c) => c.id).join(", ")}`);
  return changes[0];
}

// ─── (1) one office overwrites a text field ──────────────────────────────────
{
  const master = makeMaster();
  master.part1.cioName = "Atty. Old";
  const a = returned(master, "a", ["part1/b.cioName"], (d) => { d.part1.cioName = "Atty. New"; });
  const review = buildMergeReview(master, [a]);
  const c = only(review.changes.filter((x) => x.kind !== "unchanged"), "(1)");
  assert.equal(c.kind, "overwritten", "(1) kind");
  assert.equal(c.sectionId, "part1/b", "(1) section");
  assert.equal(c.fieldKey, "cioName", "(1) field");
  assert.deepEqual(c.officeIds, ["a"], "(1) attributed to office a");
  assert.equal(c.before, "Atty. Old", "(1) before = master value");
  assert.equal(c.after, "Atty. New", "(1) after = merged value");
  assert.equal(c.valueShape, "text", "(1) value shape");
  assert.equal(c.decision, "keep-master", "(1) Keep master is offered on an overwrite");
}

// ─── (2) New, Cleared and No change; only real changes are attributed ────────
{
  const master = makeMaster();
  master.part1.cioEmail = "old@agency.gov.ph";
  master.part1.cioUnit = "ICT Division";
  const a = returned(master, "a", ["part1/b.cioName", "part1/b.cioEmail", "part1/b.cioUnit"], (d) => {
    d.part1.cioName = "Atty. New"; // master was empty
    d.part1.cioEmail = ""; // emptied
  });
  const review = buildMergeReview(master, [a]);
  const byField = Object.fromEntries(review.changes.map((c) => [c.fieldKey, c]));
  assert.equal(byField.cioName.kind, "new", "(2) empty master field filled → New");
  assert.equal(byField.cioName.decision, null, "(2) New is not rejectable");
  assert.equal(byField.cioEmail.kind, "cleared", "(2) master value emptied → Cleared");
  assert.equal(byField.cioEmail.decision, "keep-master", "(2) Keep master is offered on a clear");
  assert.equal(byField.cioUnit.kind, "unchanged", "(2) same as master → No change");
  assert.deepEqual(byField.cioUnit.officeIds, [], "(2) an unchanged field is attributed to nobody");
}

const NONE = { keptFromMaster: new Set<string>(), resolutions: {} as Record<string, unknown> };

// ─── (3) Keep master on a field; no decisions = today's merge ────────────────
{
  const master = makeMaster();
  master.part1.cioName = "Atty. Old";
  const a = returned(master, "a", ["part1/b.cioName", "part1/b.cioUnit"], (d) => {
    d.part1.cioName = "Atty. New";
    d.part1.cioUnit = "ICT Division";
  });
  const review = buildMergeReview(master, [a]);
  const cio = review.changes.find((c) => c.fieldKey === "cioName")!;

  const kept = applyReviewDecisions(master, [a], { ...NONE, keptFromMaster: new Set([cio.id]) });
  assert.equal(kept.doc.part1.cioName, "Atty. Old", "(3) Keep master restores the master value");
  assert.equal(kept.doc.part1.cioUnit, "ICT Division", "(3) other changes still apply");

  const plain = applyReviewDecisions(master, [a], NONE);
  const today = consolidate(master, [a.doc]);
  applyResolutions(today.merged, {});
  assert.deepEqual(plain.doc, today.merged, "(3) no decisions → identical to consolidate + applyResolutions");
  assert.deepEqual(plain.reviewFlags, today.reviewFlags, "(3) no decisions → same flags");
}

/** A minimal IS Inventory row (only the fields these tests read). */
function system(id: string, name: string, url = ""): InformationSystem {
  return { id, name, url, description: "" } as unknown as InformationSystem;
}
const IS = ["part2/c.informationSystems"];

// ─── (4) rows of a single-owner list: replaced (with cells), removed, added ──
{
  const master = makeMaster();
  master.part2.informationSystems = [system("s1", "HRIS"), system("s2", "Payroll"), system("s3", "Records")];
  const a = returned(master, "a", IS, (d) => {
    d.part2.informationSystems = [
      system("s1", "HRIS v2", "https://hris.gov.ph"),
      system("s3", "Records"),
      system("s4", "Helpdesk"),
    ];
  });
  const review = buildMergeReview(master, [a]);
  const rows: Record<string, ReviewChange> = Object.fromEntries(review.changes.filter((c) => c.fieldKey === "informationSystems").map((c) => [c.rowId, c]));
  assert.equal(rows.s1.kind, "replaced-row", "(4) edited row → Replaced row");
  assert.deepEqual(rows.s1.cells!.map((x) => [x.path.join("."), x.before, x.after]), [["name", "HRIS", "HRIS v2"], ["url", "", "https://hris.gov.ph"]], "(4) changed cells only");
  assert.equal(rows.s1.decision, "keep-master", "(4) Keep master on a replaced row");
  assert.equal(rows.s1.label, "IS Inventory › HRIS v2", "(4) row label names the row");
  assert.equal(rows.s2.kind, "removed-row", "(4) deleted row → Removed row");
  assert.equal(rows.s2.decision, "keep-master", "(4) Keep master on a removed row");
  assert.equal(rows.s3.kind, "unchanged", "(4) untouched row → No change");
  assert.equal(rows.s4.kind, "added-row", "(4) new id → Added row");
  assert.equal(rows.s4.decision, null, "(4) an added row outside a flagged section is not rejectable");
  assert.ok(review.changes.every((c) => c.fieldKey !== "informationSystems" || c.rowId), "(4) a row list reports rows, not one whole-field change");
}

// ─── (5) row decisions: Keep master (replaced / removed), Skip row + Q19 flag ─
{
  const master = makeMaster();
  master.part2.informationSystems = [system("s1", "HRIS"), system("s2", "Payroll"), system("s3", "Records")];
  const a = returned(master, "a", IS, (d) => {
    d.part2.informationSystems = [system("s1", "HRIS v2"), system("s3", "Records")];
  });
  const review = buildMergeReview(master, [a]);
  const id = (rowId: string) => review.changes.find((c) => c.rowId === rowId)!.id;
  const out = applyReviewDecisions(master, [a], { ...NONE, keptFromMaster: new Set([id("s1"), id("s2")]) });
  assert.deepEqual(
    out.doc.part2.informationSystems.map((x) => `${x.id}:${x.name}`),
    ["s1:HRIS", "s2:Payroll", "s3:Records"],
    "(5) Keep master restores the replaced row and puts the removed row back in its master position"
  );
}
{
  const master = makeMaster();
  master.part2.informationSystems = [system("s1", "HRIS")];
  const a = returned(master, "a", IS, (d) => { d.part2.informationSystems.push(system("s4", "Helpdesk")); });
  const b = returned(master, "b", IS, (d) => { d.part2.informationSystems.push(system("s5", "Help desk")); });
  const review = buildMergeReview(master, [a, b]);
  assert.ok(review.reviewFlags.includes("part2/c"), "(5) two offices added rows → section flagged");
  const s5 = review.changes.find((c) => c.rowId === "s5")!;
  assert.equal(s5.kind, "appended", "(5) rows added by two offices → Appended");
  assert.equal(s5.decision, "skip-row", "(5) Skip row offered in a flagged section");
  const out = applyReviewDecisions(master, [a, b], { ...NONE, keptFromMaster: new Set([s5.id]) });
  assert.deepEqual(out.doc.part2.informationSystems.map((x) => x.id), ["s1", "s4"], "(5) the skipped row is not added");
  assert.ok(!out.reviewFlags.includes("part2/c"), "(5) Q19: the flag drops once its cause is kept from the master");
}

// ─── (6) object fields: one change listing only the changed sub-items ───────
{
  const master = makeMaster();
  master.part1.humanCapital.plantilla.it.male = 4;
  const a = returned(master, "a", ["part1/b.humanCapital"], (d) => {
    d.part1.humanCapital.plantilla.it.male = 6;
    d.part1.humanCapital.plantillaUnfilled.nonIt = 2;
  });
  const c = only(buildMergeReview(master, [a]).changes, "(6)");
  assert.equal(c.kind, "overwritten", "(6) changed object → Overwritten");
  assert.equal(c.valueShape, "object", "(6) value shape");
  assert.deepEqual(
    c.cells!.map((x) => [x.path.join("."), x.before, x.after]),
    [["plantilla.it.male", 4, 6], ["plantillaUnfilled.nonIt", 0, 2]],
    "(6) cells are the changed leaves only"
  );
}

function line(id: string, item: string, qty = 1, unitCost = 1000): LineItem {
  return { id, item, office: "", categoryId: "", fundSource: "General Appropriations Act", qty, unitCost };
}

// ─── (7) Part IV: one row per line item, per bucket and project ─────────────
{
  const master = makeMaster();
  master.part4.year1.officeProductivity.capitalOutlay = [line("li1", "Printers")];
  master.part4.year1.internalProjects["p1"] = { projectTitle: "HRIS", capitalOutlay: [], mooe: [line("li2", "Cloud hosting")] };
  const a = returned(master, "a", ["part4/year1.year1"], (d) => {
    d.part4.year1.officeProductivity.capitalOutlay[0].qty = 3;
    d.part4.year1.internalProjects["p1"].mooe = [line("li3", "Licenses")];
  });
  const review = buildMergeReview(master, [a]);
  const changes = review.changes.filter((c) => c.kind !== "unchanged");
  assert.deepEqual(
    changes.map((c) => [c.id, c.kind, c.label]),
    [
      ["part4/year1.year1/officeProductivity/capitalOutlay#li1", "replaced-row", "Year 1 Budget › Office Productivity › Capital Outlay › Printers"],
      ["part4/year1.year1/internalProjects/p1/mooe#li2", "removed-row", "Year 1 Budget › HRIS › MOOE › Cloud hosting"],
      ["part4/year1.year1/internalProjects/p1/mooe#li3", "added-row", "Year 1 Budget › HRIS › MOOE › Licenses"],
    ],
    "(7) line-item rows with bucket/project context"
  );
  assert.deepEqual(changes[0].cells!.map((x) => [x.path[0], x.before, x.after]), [["qty", 1, 3]], "(7) only Qty changed");

  const out = applyReviewDecisions(master, [a], { ...NONE, keptFromMaster: new Set([changes[1].id]) });
  assert.deepEqual(out.doc.part4.year1.internalProjects["p1"].mooe.map((l) => l.id), ["li2", "li3"], "(7) Keep master puts a removed line item back");
}

// ─── (8) Performance Framework: KPI rows per project ─────────────────────────
{
  const kpi = (id: string, indicator: string) => ({
    id, hierarchy: "Output" as const, targetedResult: "", indicator, baseline: "",
    year1Target: "", year2Target: "", year3Target: "", dataCollectionMethod: "", responsibleUnit: "",
  });
  const master = makeMaster();
  master.part3.performanceFramework["px"] = { projectTitle: "Project X", projectCategory: "internal", rows: [kpi("k1", "Permits issued"), kpi("k2", "Users trained")] };
  const a = returned(master, "a", ["part3/f.performanceFramework"], (d) => {
    d.part3.performanceFramework["px"].rows[0].year1Target = "500";
    d.part3.performanceFramework["px"].rows.push(kpi("k3", "Uptime"));
  });
  const changes = buildMergeReview(master, [a]).changes.filter((c) => c.kind !== "unchanged");
  assert.deepEqual(
    changes.map((c) => [c.id, c.kind, c.label]),
    [
      ["part3/f.performanceFramework/px#k1", "replaced-row", "Performance Framework › Project X › Permits issued"],
      ["part3/f.performanceFramework/px#k3", "added-row", "Performance Framework › Project X › Uptime"],
    ],
    "(8) KPI rows per project"
  );
}

// ─── (9) shared table (stakeholders): rows belong to the office in officeId ──
{
  const st = (id: string, officeId: string, name: string) => ({ id, officeId, name, services: [] });
  const master = makeMaster();
  master.part1.stakeholders = [st("a1", "a", "DBM"), st("a2", "a", "COA"), st("b1", "b", "DICT")];
  const a = returned(master, "a", ["part1/c.stakeholders"], (d) => {
    d.part1.stakeholders = [st("a1", "a", "DBM (budget)")]; // edits a1, removes a2
  });
  const b = returned(master, "b", ["part1/c.stakeholders"], (d) => {
    d.part1.stakeholders = [st("b1", "b", "DICT"), st("b2", "b", "NPC")]; // adds b2
  });
  const review = buildMergeReview(master, [a, b]);
  const byRow: Record<string, ReviewChange> = Object.fromEntries(review.changes.filter((c) => c.rowId).map((c) => [c.rowId, c]));
  assert.equal(byRow.a1.kind, "replaced-row", "(9) a1 replaced");
  assert.equal(byRow.a2.kind, "removed-row", "(9) a2 removed");
  assert.deepEqual(byRow.a2.officeIds, ["a"], "(9) a2's removal is office a's, not every owner's");
  assert.equal(byRow.b2.kind, "added-row", "(9) b2 added (each office adds only to its own rows)");
  assert.deepEqual(byRow.b2.officeIds, ["b"], "(9) b2 attributed to b");
  const summaries = review.changes.filter((c) => c.kind === "office-rows-replaced");
  assert.deepEqual(summaries.map((c) => c.officeIds[0]), ["a", "b"], "(9) one 'Office rows replaced' summary per office");

  const out = applyReviewDecisions(master, [a, b], { ...NONE, keptFromMaster: new Set([byRow.a2.id]) });
  assert.deepEqual(out.doc.part1.stakeholders.map((x) => x.id).sort(), ["a1", "a2", "b1", "b2"], "(9) Keep master restores a2");
}

// ─── (10) Definitions (document root) and Annex 1 (payload per office) ──────
{
  const master = makeMaster();
  master.definitions = [{ id: "t1", term: "ICT", definition: "Information and communications technology" }];
  const a = returned(master, "a", ["definitions.definitions"], (d) => {
    d.definitions = [
      { id: "t1", term: "ICT", definition: "Information and communication technology" },
      { id: "t2", term: "PNPKI", definition: "Philippine National Public Key Infrastructure" },
    ];
  });
  const changes = buildMergeReview(master, [a]).changes.filter((c) => c.kind !== "unchanged");
  assert.deepEqual(changes.map((c) => [c.sectionId, c.rowId, c.kind]), [["definitions", "t1", "replaced-row"], ["definitions", "t2", "added-row"]], "(10) definitions as rows");
}
{
  const equip = (id: string, type: string, operational: number) => ({
    id, type, isCustom: false,
    centralOffice: { operational, endOfLife: 0, backup: 0 },
    fieldOffice: { operational: 0, endOfLife: 0, backup: 0 },
  });
  const payload = (officeId: string, equipment: ReturnType<typeof equip>[]): Annex1FilePayload => ({
    version: "1.0", fileType: "annex1", exportedAt: "x", tool: "issp-platform",
    office: { type: "region", name: `Office ${officeId}`, displayLabel: `Office ${officeId}` }, officeId,
    annex1: { equipment, software: [] },
  } as unknown as Annex1FilePayload);
  const master = makeMaster();
  master.annexedOffices = [payload("a", [equip("e1", "Desktop", 10)])];
  const a = returned(master, "a", ["annexes/annex1"], (d) => {
    d.annexedOffices = [payload("a", [equip("e1", "Desktop", 12), equip("e2", "Laptop", 5)])];
  });
  const review = buildMergeReview(master, [a]);
  const changes = review.changes.filter((c) => c.kind !== "unchanged");
  assert.deepEqual(
    changes.map((c) => [c.kind, c.rowId ?? null]),
    [["office-rows-replaced", null], ["replaced-row", "e1"], ["added-row", "e2"]],
    "(10) Annex 1: office summary + equipment rows"
  );
  assert.equal(changes[1].label, "Annex 1 › Office a › Equipment › Desktop", "(10) Annex 1 row label");
  const out = applyReviewDecisions(master, [a], { ...NONE, keptFromMaster: new Set([changes[1].id]) });
  const e1 = out.doc.annexedOffices![0].annex1.equipment.find((e) => e.id === "e1")!;
  assert.equal((e1 as unknown as { centralOffice: { operational: number } }).centralOffice.operational, 10, "(10) Keep master restores an Annex 1 row");
}

// ─── (11) a project deleted from a project file is kept → Kept (office deleted) ─
{
  const proj = (id: string, title: string) => ({ id, title, description: "", objectives: "", projectType: "", linkedSystemIds: [], strategicAlignment: [], harmonizationFramework: [], implementingUnit: "", fundingSource: "", year1Deliverables: "", year2Deliverables: "", year3Deliverables: "", duration: "" }) as IctProject;
  const master = makeMaster();
  master.part3.internalProjects = [proj("p1", "HRIS"), proj("p2", "Payroll")];
  const a = returned(master, "a", ["part3/e1.internalProjects"], (d) => {
    d.editScope!.projectIds = ["p1", "p2"];
    d.part3.internalProjects = [proj("p1", "HRIS")];
  });
  const review = buildMergeReview(master, [a]);
  const p2 = review.changes.find((c) => c.rowId === "p2")!;
  assert.equal(p2.kind, "kept-office-deleted", "(11) deleted in a project file → Kept (office deleted)");
  assert.deepEqual(p2.officeIds, ["a"], "(11) attributed to the deleting office");
  assert.equal(p2.decision, null, "(11) informational, no decision");
  assert.ok(review.reviewFlags.includes("part3/e1"), "(11) section flagged by the engine");
}

// ─── (12) provenance warnings and upgraded files ─────────────────────────────
{
  const master = makeMaster();
  const good = returned(master, "a", ["part1/b.cioName"], () => {});
  const other = returned(master, "b", ["part1/b.cioUnit"], (d) => {
    d.agency.name = "Another Agency";
    d.startYear = 2025;
    d.endYear = 2027;
  });
  const old = { ...returned(master, "c", ["part1/b.cioEmail"], () => {}), sourceSchemaVersion: 12 };
  const review = buildMergeReview(master, [good, other, old]);
  assert.deepEqual(
    review.provenance.map((w) => [w.officeId, w.field, w.file, w.master]),
    [
      ["b", "agency", "Another Agency", "Fixture Agency"],
      ["b", "startYear", "2025", "2028"],
      ["b", "endYear", "2027", "2030"],
    ],
    "(12) one warning per differing header field, only for the mismatched file"
  );
  assert.deepEqual(review.upgraded, [{ officeId: "c", fromVersion: 12 }], "(12) upgraded files listed with their original version");
}

// ─── (13) broken links: the three contracts, new breaks only, named ─────────
{
  const proj = (id: string, title: string, linkedSystemIds: string[] = []) => ({ id, title, description: "", objectives: "", projectType: "", linkedSystemIds, strategicAlignment: [], harmonizationFramework: [], implementingUnit: "", fundingSource: "", year1Deliverables: "", year2Deliverables: "", year3Deliverables: "", duration: "" }) as IctProject;
  const master = makeMaster();
  master.part1.orgOutcomes = [{ id: "oo-1", name: "Better services", programs: [{ id: "pg1", name: "Scholarship" }, { id: "pg2", name: "Internship" }] }];
  master.part2.strategicConcerns = [
    { id: "sc-1", outcomeIds: ["oo-1", "general"], programIds: ["pg1"], criticalSystem: "", concern: "Paper forms", desiredStrategy: "" },
    { id: "sc-2", outcomeIds: [], programIds: ["ghost"], criticalSystem: "", concern: "Already broken", desiredStrategy: "" },
  ];
  master.part3.proposedSystems = [{ id: "sys1", name: "HRIS" } as unknown as IsspDocument["part3"]["proposedSystems"][number]];
  master.part3.internalProjects = [proj("p1", "HRIS Rollout", ["sys1"])];
  master.part3.performanceFramework["p1"] = { projectTitle: "HRIS Rollout", projectCategory: "internal", rows: [] };
  master.part4.year1.internalProjects["p1"] = { projectTitle: "HRIS Rollout", capitalOutlay: [], mooe: [] };

  assert.deepEqual(findBrokenLinks(master, master), [], "(13) nothing new is broken in the master itself");

  const afterDropProgram = structuredClone(master);
  afterDropProgram.part1.orgOutcomes[0].programs = [{ id: "pg2", name: "Internship" }];
  afterDropProgram.part3.proposedSystems = [];
  const links = findBrokenLinks(afterDropProgram, master);
  assert.deepEqual(
    links.map((l) => [l.sectionId, l.from, l.to]),
    [["part2/a", "Paper forms", "Scholarship"], ["part3/e1", "HRIS Rollout", "HRIS"]],
    "(13) a concern → removed program, a project → removed system (sc-2's old break not reported)"
  );
  assert.match(links[0].message, /Paper forms.*Scholarship/, "(13) message names both ends");

  const afterDropProject = structuredClone(master);
  afterDropProject.part3.internalProjects = [];
  assert.deepEqual(
    findBrokenLinks(afterDropProject, master).map((l) => [l.sectionId, l.to]),
    [["part3/f", "HRIS Rollout"], ["part4/year1", "HRIS Rollout"]],
    "(13) KPI set and Year 1 budget point to a removed project"
  );
}

// ─── (14) value shapes: rich text, image, yes/no ─────────────────────────────
{
  const master = makeMaster();
  master.part1.visionStatement = "<p>A <strong>digital</strong> agency</p>";
  const a = returned(master, "a", ["part1/a.visionStatement", "part3/a.proposedNetworkDataUrl", "part1/b.focalSameAsCio"], (d) => {
    d.part1.visionStatement = "<p>A <strong>fully digital</strong> agency</p>";
    d.part3.proposedNetworkDataUrl = "data:image/png;base64,iVBORw0KGgo=";
    d.part1.focalSameAsCio = !master.part1.focalSameAsCio;
  });
  const byField = Object.fromEntries(buildMergeReview(master, [a]).changes.map((c) => [c.fieldKey, c.valueShape]));
  assert.equal(byField.visionStatement, "rich-text", "(14) Vision Statement is rich text");
  assert.equal(byField.proposedNetworkDataUrl, "image", "(14) diagram data URL is an image");
  assert.equal(byField.focalSameAsCio, "boolean", "(14) yes/no field");
}

// ─── (15) conflicts resolve through the same call; inputs stay untouched ─────
{
  const master = makeMaster();
  master.part1.cioName = "Atty. Old";
  master.part1.cioUnit = "ICT";
  const a = returned(master, "a", ["part1/b.cioName", "part1/b.cioUnit"], (d) => { d.part1.cioName = "Atty. A"; d.part1.cioUnit = "ICT Division"; });
  const b = returned(master, "b", ["part1/b.cioName"], (d) => { d.part1.cioName = "Atty. B"; });
  const masterSnap = JSON.stringify(master);
  const aSnap = JSON.stringify(a.doc);
  const review = buildMergeReview(master, [a, b]);
  assert.equal(review.conflicts.length, 1, "(15) CIO name is a conflict");
  const unit = review.changes.find((c) => c.fieldKey === "cioUnit")!;
  const out = applyReviewDecisions(master, [a, b], {
    keptFromMaster: new Set([unit.id]),
    resolutions: { [conflictKey(review.conflicts[0])]: review.conflicts[0].master },
  });
  assert.equal(out.doc.part1.cioName, "Atty. Old", "(15) conflict resolved to the master value");
  assert.equal(out.doc.part1.cioUnit, "ICT", "(15) Keep master on an overwrite keeps the master value");
  assert.ok(out.reviewFlags.includes("part1/b"), "(15) a conflict keeps its flag");
  assert.equal(JSON.stringify(master), masterSnap, "(15) master not mutated");
  assert.equal(JSON.stringify(a.doc), aSnap, "(15) returned file not mutated");
}

// ─── (16) project files: a removal names only the office that removed it ─────
{
  const master = makeMaster();
  master.part4.year1.internalProjects["p1"] = { projectTitle: "HRIS", capitalOutlay: [line("l1", "Servers")], mooe: [] };
  master.part4.year1.internalProjects["p2"] = { projectTitle: "Payroll", capitalOutlay: [line("l2", "Laptops"), line("l3", "Printers")], mooe: [] };
  const Y1 = ["part4/year1.year1"];
  const a = returned(master, "a", Y1, (d) => {
    d.editScope!.projectIds = ["p1"];
    delete d.part4.year1.internalProjects["p2"]; // a p1 file never carries p2
  });
  const b = returned(master, "b", Y1, (d) => {
    d.editScope!.projectIds = ["p2"];
    delete d.part4.year1.internalProjects["p1"];
    d.part4.year1.internalProjects["p2"].capitalOutlay = [line("l2", "Laptops")]; // removes l3
  });
  const l3 = buildMergeReview(master, [a, b]).changes.find((c) => c.rowId === "l3")!;
  assert.equal(l3.kind, "removed-row", "(16) l3 removed");
  assert.deepEqual(l3.officeIds, ["b"], "(16) only B removed it — A's file never held p2");
}

// ─── (17) a whole project deleted from a project file → Kept (office deleted) ─
{
  const kpi = (id: string) => ({ id, hierarchy: "Output" as const, targetedResult: "", indicator: `KPI ${id}`, baseline: "", year1Target: "", year2Target: "", year3Target: "", dataCollectionMethod: "", responsibleUnit: "" });
  const master = makeMaster();
  master.part3.performanceFramework["p2"] = { projectTitle: "Payroll", projectCategory: "internal", rows: [kpi("k1")] };
  master.part4.year1.internalProjects["p2"] = { projectTitle: "Payroll", capitalOutlay: [line("l2", "Laptops")], mooe: [] };
  const b = returned(master, "b", ["part3/f.performanceFramework", "part4/year1.year1"], (d) => {
    d.editScope!.projectIds = ["p2"];
    delete d.part3.performanceFramework["p2"];
    delete d.part4.year1.internalProjects["p2"];
  });
  const review = buildMergeReview(master, [b]);
  const kept = review.changes.filter((c) => c.kind === "kept-office-deleted");
  assert.deepEqual(
    kept.map((c) => [c.sectionId, c.label, c.officeIds.join()]),
    [
      ["part3/f", "Performance Framework › Payroll", "b"],
      ["part4/year1", "Year 1 Budget › Payroll", "b"],
    ],
    "(17) the kept KPI set and the kept project budget are both reported"
  );
  assert.ok(review.reviewFlags.includes("part3/f") && review.reviewFlags.includes("part4/year1"), "(17) engine flags both");
}

// ─── (18) an expense-category change shows category names, not stored ids ────
{
  const master = makeMaster();
  master.part4.year1.officeProductivity.capitalOutlay = [{ ...line("l1", "Laptops"), categoryId: "co-ict-machinery-equipment" }];
  const a = returned(master, "a", ["part4/year1.year1"], (d) => {
    d.part4.year1.officeProductivity.capitalOutlay[0].categoryId = "co-ict-software";
  });
  const change = buildMergeReview(master, [a]).changes.find((c) => c.rowId === "l1")!;
  const cell = change.cells!.find((c) => c.path[0] === "categoryId")!;
  assert.equal(cellLabel(change.fieldKey, cell), "Expense category", "(18) cell label");
  assert.deepEqual(
    [formatValue(cell.before, "categoryId"), formatValue(cell.after, "categoryId")],
    ["ICT Machinery and Equipment", "ICT Software"],
    "(18) before/after show the handout category names"
  );
  assert.match(formatValue(change.after), /Expense category: ICT Software/, "(18) the whole-row summary uses the name too");
}

console.log("✓ merge-review verification passed");
