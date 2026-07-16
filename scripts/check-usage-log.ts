import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendUsageLogEntry, parseUsageLogInput } from "../src/lib/usage-log";

const valid = parseUsageLogInput({
  event: "created",
  agencyName: " Department of Example ",
  agencyAcronym: " DOE ",
});
assert.deepEqual(valid, {
  success: true,
  data: {
    event: "created",
    agencyName: "Department of Example",
    agencyAcronym: "DOE",
  },
});

assert.equal(parseUsageLogInput({
  event: "opened",
  agencyName: "Department of Example",
  agencyAcronym: "DOE",
}).success, false);

assert.equal(parseUsageLogInput({
  event: "loaded",
  agencyName: "Department of Example",
  agencyAcronym: "DOE",
  userAgent: "should-not-be-accepted",
}).success, false);

assert.equal(parseUsageLogInput({
  event: "loaded",
  agencyName: "Department of Example\nInjected line",
  agencyAcronym: "DOE",
}).success, false);

const tempDir = await mkdtemp(path.join(os.tmpdir(), "issp-usage-log-"));
process.env.ISSP_USAGE_LOG_PATH = path.join(tempDir, "usage.jsonl");

const before = Date.now();
await Promise.all([
  appendUsageLogEntry({ event: "created", agencyName: "Agency One", agencyAcronym: "A1" }),
  appendUsageLogEntry({ event: "loaded", agencyName: "Agency Two", agencyAcronym: "A2" }),
  appendUsageLogEntry({ event: "restored", agencyName: "Agency Three", agencyAcronym: "A3" }),
]);
const after = Date.now();

const lines = (await readFile(process.env.ISSP_USAGE_LOG_PATH, "utf8"))
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line) as Record<string, unknown>);

assert.equal(lines.length, 3);
for (const line of lines) {
  assert.deepEqual(Object.keys(line).sort(), ["agencyAcronym", "agencyName", "event", "timestamp"]);
  const timestamp = Date.parse(String(line.timestamp));
  assert.ok(timestamp >= before && timestamp <= after, "timestamp must be generated during the server write");
}

console.log("Usage log checks passed.");
