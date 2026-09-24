// Verify Part IV Cycle View's pure grouping/mutation model.
// Run: npx tsx scripts/verify-part4-cycle-model.ts   (expect: ALL CHECKS PASSED)
import assert from "node:assert/strict";
import {
  groupLineItemsAcrossCycle,
  updateRowSharedFields,
  updateYearCell,
  addYearCell,
  clearYearCell,
  reassignRow,
  addNewRow,
  deleteRow,
  type CycleGroupDescriptor,
} from "../src/components/issp-editor/part4/part4-cycle-model";
import type { Part4Data, LineItem, YearBudget } from "../src/lib/store/types";

function line(id: string, item: string, opts?: Partial<LineItem>): LineItem {
  return {
    id, item, office: "", uacsCode: "", uacsLabel: "",
    fundSource: "General Appropriations Act", qty: 1, unitCost: 100,
    ...opts,
  };
}

function emptyYear(): YearBudget {
  return {
    officeProductivity: { capitalOutlay: [], mooe: [] },
    internalProjects: {},
    crossAgencyProjects: {},
    continuingCosts: { mooe: [] },
  };
}

function emptyPart4(): Part4Data {
  return { year1: emptyYear(), year2: emptyYear(), year3: emptyYear() };
}

const proj: CycleGroupDescriptor = {
  kind: "internalProject", projectId: "proj-a", label: "Project A",
  activeYears: ["year1", "year2", "year3"],
};

// ── grouping: an item present in all 3 years merges into one row ───────────
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m1", "Internet Subscription")] };
  part4.year2.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m2", "Internet Subscription")] };
  part4.year3.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m3", "Internet Subscription")] };

  const rows = groupLineItemsAcrossCycle(part4, [proj]);
  assert.equal(rows.length, 1, "same-name item across 3 years merges into one row");
  assert.equal(rows[0].cells.year1?.id, "m1");
  assert.equal(rows[0].cells.year2?.id, "m2");
  assert.equal(rows[0].cells.year3?.id, "m3");
}

// ── grouping: item present in only one year leaves the other cells blank ──
{
  const part4 = emptyPart4();
  part4.year2.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m1", "One-off Training")] };
  const rows = groupLineItemsAcrossCycle(part4, [proj]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].cells.year1, null);
  assert.equal(rows[0].cells.year2?.id, "m1");
  assert.equal(rows[0].cells.year3, null);
}

// ── grouping: duplicate names in the same group+class pair in list order ──
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = {
    projectTitle: "Project A", capitalOutlay: [],
    mooe: [line("a", "Software License"), line("b", "Software License")],
  };
  part4.year2.internalProjects["proj-a"] = {
    projectTitle: "Project A", capitalOutlay: [], mooe: [line("c", "Software License")],
  };
  const rows = groupLineItemsAcrossCycle(part4, [proj]);
  assert.equal(rows.length, 2, "two Year 1 items stay two rows");
  assert.equal(rows[0].cells.year1?.id, "a");
  assert.equal(rows[0].cells.year2?.id, "c", "Year 2's single item pairs with the FIRST Year 1 row");
  assert.equal(rows[1].cells.year1?.id, "b");
  assert.equal(rows[1].cells.year2, null, "second Year 1 row has no Year 2 match left");
}

// ── updateRowSharedFields: rename propagates to every populated year, and
//    does not cause the row to re-split when regrouped ────────────────────
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m1", "Old Name")] };
  part4.year2.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m2", "Old Name")] };
  const row = groupLineItemsAcrossCycle(part4, [proj])[0];

  const result = updateRowSharedFields(part4, row, { item: "New Name" });
  assert.deepEqual([...result.touchedYears].sort(), ["year1", "year2"]);
  assert.equal(result.part4.year1.internalProjects["proj-a"].mooe[0].item, "New Name");
  assert.equal(result.part4.year2.internalProjects["proj-a"].mooe[0].item, "New Name");
  const rowsAfter = groupLineItemsAcrossCycle(result.part4, [proj]);
  assert.equal(rowsAfter.length, 1, "rename does not split the row");
}

// ── updateYearCell: only the targeted year changes ─────────────────────────
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m1", "Hosting", { qty: 1, unitCost: 500 })] };
  part4.year2.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m2", "Hosting", { qty: 1, unitCost: 500 })] };
  const row = groupLineItemsAcrossCycle(part4, [proj])[0];

  const result = updateYearCell(part4, row, "year1", { unitCost: 750 });
  assert.deepEqual(result.touchedYears, ["year1"]);
  assert.equal(result.part4.year1.internalProjects["proj-a"].mooe[0].unitCost, 750);
  assert.equal(result.part4.year2.internalProjects["proj-a"].mooe[0].unitCost, 500, "year2 untouched");
}

// ── addYearCell: fills a blank cell using the row's shared fields, even when
//    that project's per-year budget record does not exist yet (auto-create,
//    must not silently no-op) ───────────────────────────────────────────────
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = {
    projectTitle: "Project A", capitalOutlay: [],
    mooe: [line("m1", "Cloud Backup", { office: "Central Office", fundSource: "Locally funded" })],
  };
  // Note: year2 has NO "proj-a" record at all yet.
  const row = groupLineItemsAcrossCycle(part4, [proj])[0];
  assert.equal(row.cells.year2, null);

  const result = addYearCell(part4, row, "year2");
  assert.deepEqual(result.touchedYears, ["year2"]);
  const added = result.part4.year2.internalProjects["proj-a"]?.mooe[0];
  assert.ok(added, "year2 project record was auto-created, not skipped");
  assert.equal(added.item, "Cloud Backup");
  assert.equal(added.office, "Central Office");
  assert.equal(added.fundSource, "Locally funded");
  assert.equal(added.qty, 1);
  assert.equal(added.unitCost, 0);
}

// ── clearYearCell: removes just that year, others stay ─────────────────────
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m1", "Item")] };
  part4.year2.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m2", "Item")] };
  const row = groupLineItemsAcrossCycle(part4, [proj])[0];

  const result = clearYearCell(part4, row, "year1");
  assert.deepEqual(result.touchedYears, ["year1"]);
  assert.equal(result.part4.year1.internalProjects["proj-a"].mooe.length, 0);
  assert.equal(result.part4.year2.internalProjects["proj-a"].mooe.length, 1, "year2 untouched");
}

// ── deleteRow: removes every populated year in one call ────────────────────
{
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m1", "Item"), line("keep", "Other Item")] };
  part4.year3.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [], mooe: [line("m3", "Item")] };
  const row = groupLineItemsAcrossCycle(part4, [proj]).find((r) => r.item === "Item")!;

  const result = deleteRow(part4, row);
  assert.deepEqual([...result.touchedYears].sort(), ["year1", "year3"]);
  assert.deepEqual(result.part4.year1.internalProjects["proj-a"].mooe.map((l) => l.id), ["keep"]);
  assert.equal(result.part4.year3.internalProjects["proj-a"].mooe.length, 0);
}

// ── reassignRow: moves every populated year to the new group/class, never
//    drops a year's data even if the target project's duration is shorter ──
{
  const projB: CycleGroupDescriptor = {
    kind: "crossAgencyProject", projectId: "proj-b", label: "Project B",
    activeYears: ["year1", "year2", "year3"],
  };
  const part4 = emptyPart4();
  part4.year1.internalProjects["proj-a"] = { projectTitle: "Project A", capitalOutlay: [line("c1", "Server")], mooe: [] };
  const row = groupLineItemsAcrossCycle(part4, [proj, projB]).find((r) => r.item === "Server")!;

  const result = reassignRow(part4, row, projB, "mooe");
  assert.equal(result.part4.year1.internalProjects["proj-a"].capitalOutlay.length, 0, "removed from old location");
  assert.equal(result.part4.year1.crossAgencyProjects["proj-b"]?.mooe.length, 1, "added to new location");
  assert.equal(result.part4.year1.crossAgencyProjects["proj-b"]?.mooe[0].id, "c1", "same LineItem id preserved");
}

// ── addNewRow: only creates cells in the group's active years ──────────────
{
  const part4 = emptyPart4();
  const lateProj: CycleGroupDescriptor = {
    kind: "internalProject", projectId: "proj-late", label: "Late-Starting Project",
    activeYears: ["year2", "year3"],
  };
  const result = addNewRow(part4, lateProj, "mooe");
  assert.deepEqual(result.touchedYears, ["year2", "year3"]);
  assert.equal(result.row.cells.year1, null);
  assert.equal(result.part4.year2.internalProjects["proj-late"]?.mooe.length, 1);
  assert.equal(result.part4.year3.internalProjects["proj-late"]?.mooe.length, 1);
  assert.equal(result.part4.year1.internalProjects["proj-late"], undefined, "year1 untouched — outside duration");
}

console.log("ALL CHECKS PASSED");
