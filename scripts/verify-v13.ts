// Verify schema v13 migration: Plantilla (Unfilled) counts (Part I-B) and
// per-KPI-row targeted-result statements (Part III-F) are additive — old docs
// gain zeros/empty strings, existing values survive a re-migration untouched.
// Later bumps chain on top, so a migrated doc lands on CURRENT_SCHEMA_VERSION,
// not 13 — the v13 fields are what this script pins.
// Run: npx tsx scripts/verify-v13.ts   (expect: ALL CHECKS PASSED)
import assert from "node:assert";
import { migrateLegacyDoc } from "../src/lib/store/index";
import { CURRENT_SCHEMA_VERSION } from "../src/lib/migration-review";
import { createEmptyDocument } from "../src/lib/store/defaults";
import type { IsspDocument } from "../src/lib/store/types";

function makeLegacyV12(): IsspDocument {
  const doc = createEmptyDocument({
    title: "v13 verify fixture",
    startYear: 2028,
    endYear: 2030,
    amendmentNumber: 0,
    scope: "AGENCY_WIDE",
    agencyHeadName: "Fixture Head",
    agency: { name: "Fixture Agency", acronym: "FX", type: "NGA", websiteUrl: "", logoBase64: null },
  });
  doc.schemaVersion = 12;
  // createEmptyDocument seeds no performanceFramework entries (the III-F form
  // creates them per project) — seed one project + row so the row-level
  // assertions below exercise real rows instead of a vacuous empty map.
  doc.part3.internalProjects = [{
    id: "proj-fx", title: "Fixture Project", description: "", objectives: "",
    projectType: "IS_DRIVEN", linkedSystemIds: [], strategicAlignment: [],
    harmonizationFramework: [], implementingUnit: "", fundingSource: "",
    year1Deliverables: "", year2Deliverables: "", year3Deliverables: "", duration: "2028",
  }];
  doc.part3.performanceFramework["proj-fx"] = {
    projectTitle: "Fixture Project", projectCategory: "internal",
    rows: [{
      id: "kpi-fx-1", hierarchy: "Output", targetedResult: "", indicator: "Queue monitoring",
      baseline: "", year1Target: "", year2Target: "", year3Target: "",
      dataCollectionMethod: "", responsibleUnit: "",
    }],
  };
  // Simulate a pre-v13 doc: no plantillaUnfilled, no targetedResult anywhere.
  delete (doc.part1.humanCapital as unknown as Record<string, unknown>).plantillaUnfilled;
  for (const entry of Object.values(doc.part3.performanceFramework)) {
    for (const row of entry.rows) delete (row as unknown as Record<string, unknown>).targetedResult;
  }
  return doc;
}

// 1. v12 → current backfills the v13 defaults
const migrated = migrateLegacyDoc(makeLegacyV12());
assert.strictEqual(migrated.schemaVersion, CURRENT_SCHEMA_VERSION, "a v12 doc migrates to the current schema");
assert.deepStrictEqual(migrated.part1.humanCapital.plantillaUnfilled, { it: 0, nonIt: 0 });
assert.ok(Object.values(migrated.part3.performanceFramework).every(e =>
  e.rows.every(r => r.targetedResult === "")
), "every KPI row gains targetedResult: \"\"");

// 2. Existing v13 values survive untouched (idempotent re-migration)
const modern = makeLegacyV12();
modern.schemaVersion = 13;
modern.part1.humanCapital.plantillaUnfilled = { it: 4, nonIt: 12 };
for (const entry of Object.values(modern.part3.performanceFramework)) {
  entry.rows[0].targetedResult = "Consolidated queue monitoring capability";
}
const remigrated = migrateLegacyDoc(modern);
assert.deepStrictEqual(remigrated.part1.humanCapital.plantillaUnfilled, { it: 4, nonIt: 12 });
assert.strictEqual(
  Object.values(remigrated.part3.performanceFramework)[0].rows[0].targetedResult,
  "Consolidated queue monitoring capability"
);

// 3. A v13-shaped doc with a PARTIAL plantillaUnfilled ({it} only, no nonIt key —
// hand-edited/tool-generated .issp) is field-level coerced: survives with both
// keys numeric, never with nonIt: undefined.
const partial = makeLegacyV12();
partial.schemaVersion = 13;
(partial.part1.humanCapital as unknown as Record<string, unknown>).plantillaUnfilled = { it: 4 };
const coerced = migrateLegacyDoc(partial);
assert.deepStrictEqual(coerced.part1.humanCapital.plantillaUnfilled, { it: 4, nonIt: 0 });

// 4. New documents are born at the current schema
assert.strictEqual(createEmptyDocument({
  title: "t", startYear: 2028, endYear: 2030, amendmentNumber: 0, scope: "AGENCY_WIDE",
  agencyHeadName: "h",
  agency: { name: "n", acronym: "a", type: "NGA", websiteUrl: "", logoBase64: null },
}).schemaVersion, CURRENT_SCHEMA_VERSION);

// 5. v12 -> v13 flags part1/b for migration review (Plantilla Filled/Unfilled
// split is a semantic change to existing "Plantilla" data, not just an
// additive field) -- and a newly created doc never gets flagged.
const flaggedDoc = migrateLegacyDoc(makeLegacyV12());
assert.ok(
  flaggedDoc.migrationReview?.pendingSectionIds.includes("part1/b"),
  "part1/b must be in pendingSectionIds when migrating from v12"
);
const freshDoc = createEmptyDocument({
  title: "t", startYear: 2028, endYear: 2030, amendmentNumber: 0, scope: "AGENCY_WIDE",
  agencyHeadName: "h",
  agency: { name: "n", acronym: "a", type: "NGA", websiteUrl: "", logoBase64: null },
});
assert.strictEqual(freshDoc.migrationReview, undefined, "a newly created doc must not carry a migrationReview flag");

console.log("ALL CHECKS PASSED");
