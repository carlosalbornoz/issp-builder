// Regression test for schema v14 (2026-09-29): UACS object codes were
// replaced by the 30 fixed DICT handout expense categories
// (src/lib/expense-categories.ts). Old files must map through the curated
// legacy table — generic Training Expenses (5020201002) counts as ICT
// Training; unknown codes and class mismatches are left "" and flagged via
// the conditional part4/categories migration-review section — and the stored
// shape must carry categoryId only.
// Run: npx tsx scripts/verify-expense-categories.ts
import assert from "node:assert/strict";
import { migrateLegacyDoc } from "../src/lib/store/index";
import { createEmptyDocument } from "../src/lib/store/defaults";
import { CURRENT_SCHEMA_VERSION } from "../src/lib/migration-review";
import {
  EXPENSE_CATEGORIES,
  categoriesForClass,
  categoryForLegacyUacs,
} from "../src/lib/expense-categories";
import {
  getRequiredMigrationReviewSectionIdsForDoc,
  hasUncategorizedPart4Lines,
} from "../src/lib/migration-review";
import { buildB4 } from "../src/components/issp-editor/part4/part4-aggregations";
import { reassignRow, groupLineItemsAcrossCycle, type CycleGroupDescriptor } from "../src/components/issp-editor/part4/part4-cycle-model";
import type { IsspDocument, LineItem } from "../src/lib/store/types";

/** A pre-v14 line item, with the numeric-code shape the old combobox wrote. */
function legacyLine(id: string, uacsCode: string, unitCost = 1000): LineItem {
  return {
    id, item: id, office: "", uacsCode, uacsLabel: uacsCode ? `Label ${id}` : "",
    fundSource: "General Appropriations Act", qty: 1, unitCost,
  } as unknown as LineItem;
}

function baseDoc(): IsspDocument {
  const doc = createEmptyDocument({
    title: "Category fixture", startYear: 2028, endYear: 2030, amendmentNumber: 0, scope: "AGENCY_WIDE",
    agencyHeadName: "Head", agency: { name: "Smoke Agency", acronym: "SMK", type: "NGA", websiteUrl: "", logoBase64: null },
  });
  doc.schemaVersion = 13; // force the v13 → v14 path
  return doc;
}

const OP_GROUP: CycleGroupDescriptor = { kind: "officeProductivity", label: "Office Productivity", activeYears: ["year1", "year2", "year3"] };

// ─── (0) the category list itself is the 30 handout categories ───────────────
{
  assert.equal(EXPENSE_CATEGORIES.length, 30, "(0) 30 categories");
  assert.equal(categoriesForClass("capitalOutlay").length, 5, "(0) 5 Capital Outlay categories");
  assert.equal(categoriesForClass("mooe").length, 25, "(0) 25 MOOE categories");
  assert.equal(new Set(EXPENSE_CATEGORIES.map((c) => c.id)).size, 30, "(0) ids are unique");
  assert.deepEqual(
    EXPENSE_CATEGORIES.map((c) => c.order).sort((a, b) => a - b),
    Array.from({ length: 30 }, (_, i) => i + 1),
    "(0) handout order runs 1–30 exactly"
  );
  assert.ok(EXPENSE_CATEGORIES.every((c) => c.name.trim() && c.group.trim()), "(0) every category has a name and display group");
  assert.equal(categoryForLegacyUacs("5020201002"), "mooe-ict-training", "(0) generic Training Expenses maps to ICT Training");
  assert.equal(categoryForLegacyUacs("5021404000"), undefined, "(0) an unrelated code maps to nothing — never guess");
}

// ─── (a) loading a v13 file maps codes → categories and strips the legacy shape ──
{
  const doc = baseDoc();
  doc.part4.year1.officeProductivity.capitalOutlay = [
    legacyLine("l1", "5060405003"),       // exact → co-ict-machinery-equipment
    legacyLine("l2", "5020321003"),       // MOOE code in a CO bucket → class mismatch → ""
    legacyLine("l3", "5021404000"),       // unknown code → ""
    legacyLine("l4", ""),                 // never had a code → ""
  ];
  doc.part4.year1.officeProductivity.mooe = [
    legacyLine("l5", "5020201002"),       // generic Training Expenses → ICT Training
    legacyLine("l6", "5029907003"),       // Cloud Computing → mooe-cloud-computing
  ];

  const migrated = migrateLegacyDoc(doc);
  assert.equal(migrated.schemaVersion, CURRENT_SCHEMA_VERSION, "(a) doc lands on the current schema");
  const byId = (id: string) =>
    [migrated.part4.year1.officeProductivity.capitalOutlay, migrated.part4.year1.officeProductivity.mooe]
      .flat()
      .find((l) => l.id === id)!;
  assert.equal(byId("l1").categoryId, "co-ict-machinery-equipment", "(a) exact code maps to its category");
  assert.equal(byId("l2").categoryId, "", "(a) a category from the wrong expense class is dropped");
  assert.equal(byId("l3").categoryId, "", "(a) an unknown code is left uncategorized");
  assert.equal(byId("l4").categoryId, "", "(a) a line without a code stays uncategorized");
  assert.equal(byId("l5").categoryId, "mooe-ict-training", "(a) generic Training Expenses becomes ICT Training");
  assert.equal(byId("l6").categoryId, "mooe-cloud-computing", "(a) Cloud Computing maps");
  const json = JSON.stringify(migrated.part4);
  assert.ok(!json.includes("uacsCode") && !json.includes("uacsLabel"), "(a) legacy uacs fields are stripped from the stored shape");

  const again = migrateLegacyDoc(structuredClone(migrated));
  assert.deepEqual(again, migrated, "(a) the migration is idempotent");
}

// ─── (b) the part4/categories review flag is conditional on uncategorized lines ──
{
  const partial = baseDoc();
  partial.part4.year1.officeProductivity.mooe = [legacyLine("l1", "5021404000")]; // unmapped
  const migratedPartial = migrateLegacyDoc(partial);
  assert.ok(hasUncategorizedPart4Lines(migratedPartial), "(b) unmigrated-code doc has uncategorized lines");
  assert.ok(
    migratedPartial.migrationReview?.pendingSectionIds.includes("part4/categories"),
    "(b) review banner points at Part IV when codes could not be mapped"
  );
  assert.ok(
    getRequiredMigrationReviewSectionIdsForDoc(13, migratedPartial).includes("part4/categories"),
    "(b) doc-aware review helper agrees"
  );

  const clean = baseDoc();
  clean.part4.year1.officeProductivity.capitalOutlay = [legacyLine("l1", "5060405003")];
  clean.part4.year1.officeProductivity.mooe = [legacyLine("l2", "5029907001")];
  const migratedClean = migrateLegacyDoc(clean);
  assert.ok(!hasUncategorizedPart4Lines(migratedClean), "(b) fully-mapped doc has no uncategorized lines");
  assert.ok(
    !migratedClean.migrationReview?.pendingSectionIds.includes("part4/categories"),
    "(b) no Part IV review banner when every code mapped"
  );
}

// ─── (c) B.4 rows follow handout order, with uncategorized money kept visible ──
{
  const doc = baseDoc();
  doc.part4.year1.officeProductivity.capitalOutlay = [legacyLine("l1", "5060405003")];  // order 1 (CO)
  doc.part4.year2.officeProductivity.mooe = [
    legacyLine("l2", "5020201002"),   // ICT Training, handout order 14
    legacyLine("l3", "5029907003"),   // Cloud Computing, handout order 18
  ];
  doc.part4.year3.continuingCosts.mooe = [legacyLine("l4", "5021404000")]; // uncategorized
  const migrated = migrateLegacyDoc(doc);
  const rows = buildB4([migrated.part4.year1, migrated.part4.year2, migrated.part4.year3]);
  assert.deepEqual(
    rows.map((r) => [r.categoryId, r.name, r.total]),
    [
      ["co-ict-machinery-equipment", "ICT Machinery and Equipment", 1000],
      ["mooe-ict-training", "ICT Training", 1000],
      ["mooe-cloud-computing", "Cloud Computing Services", 1000],
      ["", "Uncategorized", 1000],
    ],
    "(c) B.4 lists one row per category in handout order, Uncategorized last"
  );
  const grand = rows.reduce((s, r) => s + r.total, 0);
  assert.equal(grand, 4000, "(c) B.4 grand total still covers uncategorized money (matches B.1–B.3)");
}

// ─── (d) moving a row across the CO/MOOE divide clears its category ──────────
{
  const doc = baseDoc();
  doc.part4.year1.officeProductivity.capitalOutlay = [legacyLine("l1", "5060405003")];
  const migrated = migrateLegacyDoc(doc);
  const [row] = groupLineItemsAcrossCycle(migrated.part4, [OP_GROUP]);
  assert.equal(row.categoryId, "co-ict-machinery-equipment", "(d) row starts categorized");

  const sameClass = reassignRow(migrated.part4, row, OP_GROUP, "capitalOutlay");
  assert.equal(
    sameClass.part4.year1.officeProductivity.capitalOutlay[0].categoryId,
    "co-ict-machinery-equipment",
    "(d) reassigning within the same class keeps the category"
  );

  const crossClass = reassignRow(migrated.part4, row, OP_GROUP, "mooe");
  assert.equal(
    crossClass.part4.year1.officeProductivity.mooe[0].categoryId,
    "",
    "(d) reassigning across classes clears the category (it belongs to one class)"
  );
}

console.log("✓ expense-category verification passed");
