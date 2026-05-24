import type { IsspDocument } from "@/lib/store/types";

export interface SectionField {
  key: string;
  label: string;
}

export interface SectionFieldDef {
  partKey: "part1" | "part2" | "part3" | "part4";
  fields: SectionField[];
}

export const SECTION_FIELDS: Record<string, SectionFieldDef> = {
  "part1/a": {
    partKey: "part1",
    fields: [
      { key: "legalBasis",       label: "Legal Basis" },
      { key: "mandateFunction",  label: "Mandate / Function" },
      { key: "visionStatement",  label: "Vision Statement" },
      { key: "missionStatement", label: "Mission Statement" },
      { key: "orgOutcomes",      label: "Organizational Outcomes" },
    ],
  },
  "part1/b": {
    partKey: "part1",
    fields: [
      { key: "cioName",        label: "CIO Name" },
      { key: "cioPosition",    label: "CIO Position" },
      { key: "cioUnit",        label: "CIO Unit" },
      { key: "cioEmail",       label: "CIO Email" },
      { key: "cioContact",     label: "CIO Contact" },
      { key: "focalSameAsCio", label: "Focal Person (same as CIO)" },
      { key: "focalName",      label: "Focal Name" },
      { key: "focalPosition",  label: "Focal Position" },
      { key: "focalUnit",      label: "Focal Unit" },
      { key: "focalEmail",     label: "Focal Email" },
      { key: "focalContact",   label: "Focal Contact" },
      { key: "humanCapital",   label: "Human Capital Summary" },
    ],
  },
  "part1/c": {
    partKey: "part1",
    fields: [
      { key: "stakeholders", label: "Stakeholders" },
    ],
  },
  "part2/a": {
    partKey: "part2",
    fields: [
      { key: "strategicConcerns", label: "Strategic Concerns" },
    ],
  },
  "part2/b": {
    partKey: "part2",
    fields: [
      { key: "networkDiagrams",       label: "Network Diagrams" },
      { key: "networkDescription",    label: "Network Description" },
      { key: "cybersecurityControls", label: "Cybersecurity Controls" },
    ],
  },
  "part2/c": {
    partKey: "part2",
    fields: [
      { key: "informationSystems", label: "IS Inventory" },
    ],
  },
  "part2/d": {
    partKey: "part2",
    fields: [
      { key: "egpChecklist", label: "E-Government Programs" },
    ],
  },
  "part3/a": {
    partKey: "part3",
    fields: [
      { key: "proposedNetworkDataUrl",   label: "Proposed Network Diagram" },
      { key: "proposedNetworkDesc",      label: "Proposed Network Description" },
      { key: "proposedCybersecControls", label: "Proposed Cybersecurity Controls" },
    ],
  },
  "part3/b": {
    partKey: "part3",
    fields: [
      { key: "enterpriseArchDataUrl", label: "Enterprise Architecture Diagram" },
    ],
  },
  "part3/c": {
    partKey: "part3",
    fields: [
      { key: "proposedHumanCapital", label: "Proposed Human Capital" },
    ],
  },
  "part3/d": {
    partKey: "part3",
    fields: [
      { key: "proposedSystems", label: "Proposed Information Systems" },
    ],
  },
  "part3/e1": {
    partKey: "part3",
    fields: [
      { key: "internalProjects", label: "Internal ICT Projects" },
    ],
  },
  "part3/e2": {
    partKey: "part3",
    fields: [
      { key: "crossAgencyProjects", label: "Cross-Agency ICT Projects" },
    ],
  },
  "part3/f": {
    partKey: "part3",
    fields: [
      { key: "performanceFramework", label: "Performance Framework" },
    ],
  },
  "part4/year1": {
    partKey: "part4",
    fields: [{ key: "year1", label: "Year 1 Budget" }],
  },
  "part4/year2": {
    partKey: "part4",
    fields: [{ key: "year2", label: "Year 2 Budget" }],
  },
  "part4/year3": {
    partKey: "part4",
    fields: [{ key: "year3", label: "Year 3 Budget" }],
  },
  "part4/summary": {
    partKey: "part4",
    fields: [], // read-only computed view; no writable fields
  },
};

export function getChangedFields(
  sectionId: string,
  current: IsspDocument,
  snapshot: IsspDocument
): SectionField[] {
  const def = SECTION_FIELDS[sectionId];
  if (!def || def.fields.length === 0) return [];

  const currentPart = current[def.partKey] as unknown as Record<string, unknown>;
  const snapshotPart = snapshot[def.partKey] as unknown as Record<string, unknown>;

  return def.fields.filter(
    (f) => JSON.stringify(currentPart[f.key]) !== JSON.stringify(snapshotPart[f.key])
  );
}
