// Verify v11→v12 migration: programs string[] → {id,name}[], concern programIds backfill.
// (Later bumps raised CURRENT_SCHEMA_VERSION; the chain still carries v11 docs to current.)
// Run: npx tsx scripts/verify-ii-a-schema.ts   (expect: ALL CHECKS PASSED)
import assert from "node:assert";
import { migrateLegacyDoc } from "../src/lib/store/index";
import { CURRENT_SCHEMA_VERSION } from "../src/lib/migration-review";
import { createEmptyDocument, makeDefaultPart1, makeDefaultPart2 } from "../src/lib/store/defaults";
import type { IsspDocument } from "../src/lib/store/types";

assert.ok(CURRENT_SCHEMA_VERSION >= 12, "the programs-as-objects shape needs schema v12 or later");

// Synthetic v11 doc: programs are plain strings; concerns lack programIds.
// Built on real part defaults: migrateLegacyDoc's idempotent normalization
// (stakeholders/HCRow maps + deriveMetaFromContent) assumes a fully-formed
// doc — normalizeImportShape always fills defaults before migrating, so a
// bare {part1:{orgOutcomes}} stub would crash before reaching v12 logic.
const legacy = {
  ...createEmptyDocument({
    title: "T",
    startYear: 2026,
    endYear: 2028,
    amendmentNumber: 0,
    scope: "AGENCY_WIDE",
    agencyHeadName: "X",
    agency: { name: "N", acronym: "N", type: "NGA", websiteUrl: "", logoBase64: null },
  }),
  schemaVersion: 11,
  part1: {
    ...makeDefaultPart1(),
    orgOutcomes: [
      { id: "oo-1", name: "Outcome One", programs: ["Alpha Program", "Beta Program"] },
      { id: "oo-2", name: "Outcome Two", programs: [] },
    ],
  },
  part2: {
    ...makeDefaultPart2(),
    strategicConcerns: [
      { id: "sc-1", outcomeIds: ["oo-1"], criticalSystem: "x", concern: "y", desiredStrategy: "z" },
    ],
  },
} as unknown as IsspDocument;

const migrated = migrateLegacyDoc(legacy);

// programs became objects with deterministic, stable ids
assert.equal(migrated.part1.orgOutcomes[0].programs[0].id, "oo-1-pg-1");
assert.equal(migrated.part1.orgOutcomes[0].programs[0].name, "Alpha Program");
assert.equal(migrated.part1.orgOutcomes[0].programs[1].name, "Beta Program");
// concerns gained programIds
assert.deepEqual(migrated.part2.strategicConcerns[0].programIds, []);
assert.equal(migrated.schemaVersion, CURRENT_SCHEMA_VERSION);

// Idempotent: migrating again changes nothing
const again = migrateLegacyDoc(migrated);
assert.deepEqual(again, migrated, "migration must be idempotent");

console.log("ALL CHECKS PASSED");
