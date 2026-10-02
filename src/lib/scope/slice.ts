import { linkedSystemIdsOf } from "@/lib/visible-values";
import type { IsspDocument } from "@/lib/store/types";
import type { EditPath, EditScope, OfficeIdentity } from "@/lib/scope/types";
import { resolveScope, SHARED_TABLE_PATHS } from "@/lib/scope/paths";
import { SECTION_FIELDS } from "@/lib/section-fields";
import { createEmptyDocument, type NewDocOptions } from "@/lib/store/defaults";

export interface DistributeSpec {
  office: OfficeIdentity;
  /** Editable paths at any level (area / section / field). */
  editable: EditPath[];
  /** Master provenance, for idempotent re-merge in consolidate(). */
  sourceDocId?: string;
  /**
   * Project-row filter. Absent = all projects. Present = only these project
   * ids travel in the project-bearing fields (empty = start-empty).
   */
  projectIds?: string[];
}

/**
 * Produce a scoped .issp from a master. The slice carries the agency header
 * and the office's OWNED data only. Shared tables (`part1/c.stakeholders`,
 * `annexes/annex1`) are emptied — the office re-adds its own rows. Every
 * non-owned field is left at the {@link createEmptyDocument} defaults, so no
 * other office's data leaks through.
 *
 * Per-field (not per-section) ownership is enforced: a path like
 * `part1/b.cioName` copies ONLY `cioName`, never its sibling `cioEmail`.
 */
export function sliceScopedDoc(master: IsspDocument, spec: DistributeSpec): IsspDocument {
  const resolved = resolveScope(spec.editable);

  // Start from a blank doc of identical header shape, then overlay owned data.
  const header: NewDocOptions = {
    title: master.title,
    startYear: master.startYear,
    endYear: master.endYear,
    amendmentNumber: master.amendmentNumber,
    scope: master.scope,
    agencyHeadName: master.agencyHeadName,
    agency: master.agency,
  };
  const sliced = createEmptyDocument(header);

  // Part fields — iterate SECTION_FIELDS so each (sectionId, fieldKey) lands on
  // its correct partKey. Copy a field ONLY when its full path is owned; shared
  // tables are emptied even when owned (the office re-adds rows on edit).
  for (const [sectionId, def] of Object.entries(SECTION_FIELDS)) {
    const srcPart = master[def.partKey] as unknown as Record<string, unknown>;
    const dstPart = sliced[def.partKey] as unknown as Record<string, unknown>;
    for (const f of def.fields) {
      const path = `${sectionId}.${f.key}`;
      if (!resolved.editableFields.has(path)) continue; // not owned → leave at default
      dstPart[f.key] = SHARED_TABLE_PATHS.has(path) ? [] : srcPart[f.key];
    }
  }

  // Front-matter definitions: copy only if owned.
  if (resolved.editableFields.has("definitions.definitions")) {
    sliced.definitions = master.definitions;
  }

  // Annex 1 (shared table at doc root) — always emptied in the slice.
  sliced.annexedOffices = [];

  // ── Per-project filter (editScope.projectIds) ─────────────────────────────
  //
  // Filters the project-bearing fields to the selected ids. Project DETAIL
  // rows are carried even when III-E1/E2 are unowned: the III-F and Part IV
  // forms render from the Part III project lists, so a Part-IV-only office
  // needs the rows as read-only context (they are not in `editable`, so the
  // sections stay hidden and consolidate ignores them). Linked systems of
  // carried projects ride along the same way — the III-E form can then show
  // the links and cannot silently wipe linkedSystemIds via an empty picker.
  // officeProductivity / continuingCosts are agency-wide budget, not the
  // office's to edit: they stay at the empty default (consolidate treats a
  // filtered file as contributing nothing to them — a naive copy would also
  // wipe the master's data on merge).
  if (spec.projectIds) {
    const ids = new Set(spec.projectIds);
    const pick = <T extends { id: string }>(rows: T[]): T[] =>
      rows.filter((r) => ids.has(r.id));

    sliced.part3.internalProjects = pick(master.part3.internalProjects);
    sliced.part3.crossAgencyProjects = pick(master.part3.crossAgencyProjects);

    if (resolved.editableFields.has("part3/f.performanceFramework")) {
      sliced.part3.performanceFramework = Object.fromEntries(
        Object.entries(master.part3.performanceFramework).filter(([id]) => ids.has(id))
      );
    }

    for (const y of ["year1", "year2", "year3"] as const) {
      if (!resolved.editableFields.has(`part4/${y}.${y}`)) continue;
      sliced.part4[y] = {
        officeProductivity: { capitalOutlay: [], mooe: [] },
        internalProjects: Object.fromEntries(
          Object.entries(master.part4[y].internalProjects).filter(([id]) => ids.has(id))
        ),
        crossAgencyProjects: Object.fromEntries(
          Object.entries(master.part4[y].crossAgencyProjects).filter(([id]) => ids.has(id))
        ),
        continuingCosts: { mooe: [] },
      };
    }

    // Linked systems of carried projects are the ONLY systems in the file —
    // owned III-D included. Systems the office adds ride the owned field.
    const carried = [...sliced.part3.internalProjects, ...sliced.part3.crossAgencyProjects];
    const linked = new Set(carried.flatMap(linkedSystemIdsOf));
    sliced.part3.proposedSystems = master.part3.proposedSystems.filter((s) =>
      linked.has(s.id)
    );
  }

  const now = new Date().toISOString();
  const editScope: EditScope = {
    office: spec.office,
    editable: spec.editable,
    generatedAt: now,
    sourceDocId: spec.sourceDocId,
    ...(spec.projectIds ? { projectIds: spec.projectIds } : {}),
  };
  // Deep-clone so the returned doc shares NO references with the live master.
  // IsspDocument is plain JSON-serializable data (ISO strings, numbers, arrays,
  // plain objects — no functions or Date instances), and the runtime already
  // requires a modern baseline (crypto.randomUUID is used elsewhere), so
  // structuredClone is safe here and the cheapest correct option.
  return structuredClone({ ...sliced, editScope, exportedAt: now });
}
