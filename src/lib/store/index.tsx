"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { IsspDocument, Part1Data, Part2Data, Part3Data, Part4Data, SectionMeta, HumanCapital, CyberControls, EgpChecklist, YearBudget, HCRow, StakeholderService, IsClassification, PiaProcessAnswer, MigrationReview } from "./types";
import { createEmptyDocument, makeDefaultPart1, makeDefaultPart2, makeDefaultPart3, makeDefaultPart4, type NewDocOptions } from "./defaults";
import { idbClear, idbLoad, idbSave } from "./idb";
import { CURRENT_SCHEMA_VERSION, getRequiredMigrationReviewSectionIds } from "@/lib/migration-review";
import { recordIsspUsage } from "@/lib/record-usage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type StoreActionResult = { success: true; migrationReview?: MigrationReview } | { success: false; error: string };
export interface LoadFromFileOptions { recordUsage?: boolean }

export interface IsspStoreValue {
  doc: IsspDocument | null;
  loading: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  /** ISO timestamp of the last explicit "Save to File" in this session; null if never saved. */
  fileSavedAt: string | null;
  /** In-memory snapshot of the doc at the last saveToFile/loadFromFile. Null on fresh page load. */
  savedSnapshot: IsspDocument | null;
  /** True when the doc has been edited since the last file save (or since creation for new docs). */
  unsavedToFile: boolean;
  /** Migration notice opened only for an explicit legacy-file load in this session. */
  migrationNotice: MigrationReview | null;
  acknowledgeMigrationNotice: () => void;
  /** Apply a transformation to the current document. Schedules an IDB write. */
  update: (patcher: (prev: IsspDocument) => IsspDocument) => void;
  /** Convenience updaters — shallow-merge a patch into the given part. */
  updatePart1: (patch: Partial<Part1Data>) => void;
  updatePart2: (patch: Partial<Part2Data>) => void;
  updatePart3: (patch: Partial<Part3Data>) => void;
  updatePart4: (patch: Partial<Part4Data>) => void;
  /** Update per-section metadata (userMarkedDone, lastEditedAt). */
  updateSectionMeta: (sectionId: string, patch: Partial<SectionMeta>) => void;
  /** Create a new blank document and load it into the store. */
  createNew: (opts: NewDocOptions) => void;
  /** Delete the current document from IDB and clear state. */
  clearDoc: () => Promise<StoreActionResult>;
  /** Download the current document as a .issp file. */
  saveToFile: () => Promise<StoreActionResult>;
  /** Parse a .issp file and load it into the store. */
  loadFromFile: (file: File, options?: LoadFromFileOptions) => Promise<StoreActionResult>;
}

const MAX_ISSP_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 35 * 1024 * 1024;

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return "Browser storage is full. Save a .issp file, then remove large diagrams or clear space before continuing.";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function arrayValue<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function objectValue<T extends object>(value: unknown): Partial<T> {
  return isRecord(value) ? value as Partial<T> : {};
}

function normalizeCyberControls(value: unknown): CyberControls {
  const defaults = makeDefaultPart2().cybersecurityControls;
  const raw = objectValue<Record<keyof CyberControls, unknown>>(value);
  return Object.fromEntries(
    Object.entries(defaults).map(([group, controls]) => [
      group,
      { ...controls, ...objectValue<Record<string, unknown>>(raw[group as keyof CyberControls]) },
    ])
  ) as CyberControls;
}

function normalizeYearBudget(value: unknown): YearBudget {
  const defaults = makeDefaultPart4().year1;
  const raw = objectValue<YearBudget>(value);
  const officeProductivity = objectValue<YearBudget["officeProductivity"]>(raw.officeProductivity);
  const continuingCosts = objectValue<YearBudget["continuingCosts"]>(raw.continuingCosts);
  return {
    ...defaults,
    ...raw,
    officeProductivity: {
      capitalOutlay: arrayValue(officeProductivity.capitalOutlay),
      mooe: arrayValue(officeProductivity.mooe),
    },
    internalProjects: isRecord(raw.internalProjects) ? raw.internalProjects as YearBudget["internalProjects"] : {},
    crossAgencyProjects: isRecord(raw.crossAgencyProjects) ? raw.crossAgencyProjects as YearBudget["crossAgencyProjects"] : {},
    continuingCosts: { mooe: arrayValue(continuingCosts.mooe) },
  };
}

function normalizeImportShape(raw: unknown): { success: true; doc: IsspDocument } | { success: false; error: string } {
  if (!isRecord(raw)) return { success: false, error: "This file does not contain a valid ISSP document." };
  if (raw.fileType !== "issp-main") {
    return {
      success: false,
      error: "This file is not a main ISSP document. Make sure you are loading a .issp file created by this tool.",
    };
  }

  const schemaVersion = numberValue(raw.schemaVersion, 1);
  if (schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      success: false,
      error: "This .issp file was created by a newer version of the tool. Update the app before loading it.",
    };
  }

  if (!isRecord(raw.agency) || !isRecord(raw.part1) || !isRecord(raw.part2) || !isRecord(raw.part3) || !isRecord(raw.part4)) {
    return { success: false, error: "This .issp file is missing required ISSP sections." };
  }

  const now = new Date().toISOString();
  const part1Defaults = makeDefaultPart1();
  const part2Defaults = makeDefaultPart2();
  const part3Defaults = makeDefaultPart3();
  const part4Defaults = makeDefaultPart4();
  const part1Raw = objectValue<Part1Data>(raw.part1);
  const part2Raw = objectValue<Part2Data>(raw.part2);
  const part3Raw = objectValue<Part3Data>(raw.part3);
  const part4Raw = objectValue<Part4Data>(raw.part4);
  const agencyRaw = objectValue<IsspDocument["agency"]>(raw.agency);

  const doc = {
    ...raw,
    version: "1.0",
    fileType: "issp-main",
    tool: "issp-platform",
    exportedAt: stringValue(raw.exportedAt, now),
    schemaVersion,
    title: stringValue(raw.title, "Untitled ISSP"),
    startYear: numberValue(raw.startYear, new Date().getFullYear()),
    endYear: numberValue(raw.endYear, new Date().getFullYear() + 2),
    amendmentNumber: numberValue(raw.amendmentNumber, 0),
    scope: stringValue(raw.scope, "AGENCY_WIDE") as IsspDocument["scope"],
    agencyHeadName: stringValue(raw.agencyHeadName),
    agency: {
      name: stringValue(agencyRaw.name),
      acronym: stringValue(agencyRaw.acronym),
      type: stringValue(agencyRaw.type, "NGA") as IsspDocument["agency"]["type"],
      websiteUrl: stringValue(agencyRaw.websiteUrl),
      logoBase64: typeof agencyRaw.logoBase64 === "string" ? agencyRaw.logoBase64 : null,
    },
    planStatus: stringValue(raw.planStatus, "draft") as IsspDocument["planStatus"],
    submissionTarget: isRecord(raw.submissionTarget)
      ? raw.submissionTarget as IsspDocument["submissionTarget"]
      : { agency: "DICT", deadline: null },
    sectionMeta: isRecord(raw.sectionMeta) ? raw.sectionMeta as Record<string, SectionMeta> : {},
    definitions: Array.isArray(raw.definitions) ? raw.definitions as IsspDocument["definitions"] : undefined,
    part1: {
      ...part1Defaults,
      ...part1Raw,
      orgOutcomes: arrayValue(part1Raw.orgOutcomes),
      stakeholders: arrayValue(part1Raw.stakeholders),
      humanCapital: isRecord(part1Raw.humanCapital) ? part1Raw.humanCapital as HumanCapital : part1Defaults.humanCapital,
    },
    part2: {
      ...part2Defaults,
      ...part2Raw,
      strategicConcerns: arrayValue(part2Raw.strategicConcerns),
      networkDiagrams: arrayValue(part2Raw.networkDiagrams),
      cybersecurityControls: normalizeCyberControls(part2Raw.cybersecurityControls),
      informationSystems: arrayValue(part2Raw.informationSystems),
      egpChecklist: isRecord(part2Raw.egpChecklist) ? { ...part2Defaults.egpChecklist, ...part2Raw.egpChecklist } : part2Defaults.egpChecklist,
    },
    part3: {
      ...part3Defaults,
      ...part3Raw,
      proposedCybersecControls: normalizeCyberControls(part3Raw.proposedCybersecControls),
      proposedHumanCapital: arrayValue(part3Raw.proposedHumanCapital),
      proposedSystems: arrayValue(part3Raw.proposedSystems),
      internalProjects: arrayValue(part3Raw.internalProjects),
      crossAgencyProjects: arrayValue(part3Raw.crossAgencyProjects),
      performanceFramework: isRecord(part3Raw.performanceFramework) ? part3Raw.performanceFramework as Part3Data["performanceFramework"] : {},
    },
    part4: {
      ...part4Defaults,
      ...part4Raw,
      year1: normalizeYearBudget(part4Raw.year1),
      year2: normalizeYearBudget(part4Raw.year2),
      year3: normalizeYearBudget(part4Raw.year3),
    },
    createdAt: stringValue(raw.createdAt, now),
    updatedAt: stringValue(raw.updatedAt, now),
  } as IsspDocument;

  return { success: true, doc };
}

function estimateBase64Bytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function validateImageDataUrl(value: string | null | undefined, label: string, maxBytes: number): StoreActionResult & { bytes?: number } {
  if (!value) return { success: true, bytes: 0 };
  if (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,/i.test(value)) {
    return { success: false, error: `${label} must be a PNG, JPG, WebP, or SVG data URL.` };
  }
  const bytes = estimateBase64Bytes(value);
  if (bytes > maxBytes) {
    return { success: false, error: `${label} is too large. Remove or compress it, then try again.` };
  }
  return { success: true, bytes };
}

function validateEmbeddedImages(doc: IsspDocument): StoreActionResult {
  let totalBytes = 0;
  const check = (value: string | null | undefined, label: string, maxBytes = MAX_IMAGE_BYTES): StoreActionResult => {
    const result = validateImageDataUrl(value, label, maxBytes);
    if (!result.success) return result;
    totalBytes += result.bytes ?? 0;
    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
      return { success: false, error: "Embedded images are too large overall. Remove or compress diagrams before loading this file." };
    }
    return { success: true };
  };

  let result = check(doc.agency.logoBase64, "Agency logo", MAX_LOGO_BYTES);
  if (!result.success) return result;
  for (const [index, diagram] of doc.part2.networkDiagrams.entries()) {
    result = check(diagram.dataUrl, `Network diagram ${index + 1}`);
    if (!result.success) return result;
  }
  result = check(doc.part3.proposedNetworkDataUrl, "Proposed network diagram");
  if (!result.success) return result;
  result = check(doc.part3.enterpriseArchDataUrl, "Enterprise architecture diagram");
  if (!result.success) return result;
  return { success: true };
}

// ─── Migration ────────────────────────────────────────────────────────────────

function hasHeadcount(hc: HumanCapital): boolean {
  return [hc.plantilla, hc.contractual, hc.outsourced].some(
    (r) => r.it.male + r.it.female + r.nonIt.male + r.nonIt.female > 0
  );
}

function hasCyberContent(c: CyberControls): boolean {
  return Object.values(c).some((group) =>
    Object.values(group as Record<string, boolean>).some(Boolean)
  );
}

function hasEgpContent(egp: EgpChecklist): boolean {
  return Object.values(egp).some((p) => p.status !== "");
}

function hasYearContent(year: YearBudget): boolean {
  return (
    year.officeProductivity.capitalOutlay.length > 0 ||
    year.officeProductivity.mooe.length > 0 ||
    Object.keys(year.internalProjects).length > 0 ||
    Object.keys(year.crossAgencyProjects).length > 0 ||
    year.continuingCosts.mooe.length > 0
  );
}

/** Infer in_progress status from content for sections with no lastEditedAt yet. */
function deriveMetaFromContent(doc: IsspDocument): Record<string, SectionMeta> {
  const ts = doc.updatedAt;
  const existing = doc.sectionMeta ?? {};
  const result: Record<string, SectionMeta> = { ...existing };

  function maybeSet(id: string, hasContent: boolean) {
    if (hasContent && !existing[id]?.lastEditedAt) {
      result[id] = { userMarkedDone: existing[id]?.userMarkedDone ?? false, lastEditedAt: ts };
    }
  }

  const p1 = doc.part1;
  const p2 = doc.part2;
  const p3 = doc.part3;
  const p4 = doc.part4;

  maybeSet("part1/a", !!(p1.mandateFunction || p1.visionStatement || p1.missionStatement || p1.legalBasis));
  maybeSet("part1/b", !!(p1.cioName || hasHeadcount(p1.humanCapital)));
  maybeSet("part1/c", p1.stakeholders.length > 0);

  maybeSet("part2/a", p2.strategicConcerns.length > 0);
  maybeSet("part2/b", !!(p2.networkDiagrams.length > 0 || p2.networkDescription || hasCyberContent(p2.cybersecurityControls)));
  maybeSet("part2/c", p2.informationSystems.length > 0);
  maybeSet("part2/d", hasEgpContent(p2.egpChecklist));

  maybeSet("part3/a", !!(p3.proposedNetworkDataUrl || p3.proposedNetworkDesc || hasCyberContent(p3.proposedCybersecControls)));
  maybeSet("part3/b", p3.enterpriseArchDataUrl !== null);
  maybeSet("part3/c", p3.proposedHumanCapital.length > 0);
  maybeSet("part3/d", p3.proposedSystems.length > 0);
  maybeSet("part3/e1", p3.internalProjects.length > 0);
  maybeSet("part3/e2", p3.crossAgencyProjects.length > 0);
  maybeSet("part3/f", Object.keys(p3.performanceFramework).length > 0);

  const anyYear = hasYearContent(p4.year1) || hasYearContent(p4.year2) || hasYearContent(p4.year3);
  maybeSet("part4/year1", hasYearContent(p4.year1));
  maybeSet("part4/year2", hasYearContent(p4.year2));
  maybeSet("part4/year3", hasYearContent(p4.year3));
  maybeSet("part4/summary", anyYear);

  return result;
}

const genId = () => Math.random().toString(36).slice(2, 10);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProjectType<T extends { projectType?: any; linkedSystemIds?: string[] }>(p: T): T {
  let t: string = p.projectType ?? "";
  if (t === "IS-Driven") t = "IS_DRIVEN";
  else if (t === "Infrastructure" || t === "Standalone") t = "STANDALONE";
  if (!t && (p.linkedSystemIds?.length ?? 0) > 0) t = "IS_DRIVEN";
  return { ...p, projectType: t, linkedSystemIds: p.linkedSystemIds ?? [] };
}

export function migrateLegacyDoc(doc: IsspDocument): IsspDocument {
  const sourceSchemaVersion = doc.schemaVersion ?? 1;
  // v1 → v2: planStatus, submissionTarget, sectionMeta
  let base: IsspDocument = (doc.schemaVersion ?? 1) >= 2 ? doc : {
    ...doc,
    schemaVersion: 2,
    planStatus: doc.planStatus ?? "draft",
    submissionTarget: doc.submissionTarget ?? { agency: "DICT", deadline: null },
    sectionMeta: doc.sectionMeta ?? {},
  };

  // v2 → v3: Stakeholder `transactions`+`complexity` fields → `services` array
  if ((base.schemaVersion ?? 1) < 3) {
    base = {
      ...base,
      schemaVersion: 3,
      part1: {
        ...base.part1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stakeholders: base.part1.stakeholders.map((s: any) => ({
          id: s.id || genId(),
          name: s.name ?? "",
          services: Array.isArray(s.services) ? s.services
            : [{ id: genId(), name: s.transactions ?? "", complexity: s.complexity ?? "Simple" }],
        })),
      },
    };
  }

  // v3 → v4: template-taxonomy classification + users-as-text (2026 template alignment)
  if ((base.schemaVersion ?? 1) < 4) {
    const mapClassification = (c: string): IsClassification => {
      if (c === "G2C" || c === "G2B" || c === "G2G") return "OPERATIONS";
      if (c === "G2E" || c === "INTERNAL") return "GENERAL_ADMIN";
      // Freeform strings from the pre-enum demo file
      if (c === "Operations Support System") return "SUPPORT_TO_OPERATIONS";
      if (c === "Frontline Service System") return "OPERATIONS";
      if (c === "Administrative System") return "GENERAL_ADMIN";
      if (c === "SUPPORT_TO_OPERATIONS" || c === "GENERAL_ADMIN" || c === "OPERATIONS") return c;
      return "";
    };
    const mapUsers = (u: unknown): string => {
      if (typeof u === "number") return u === 0 ? "" : String(u);
      return typeof u === "string" ? u : "";
    };
    base = {
      ...base,
      schemaVersion: 4,
      part2: {
        ...base.part2,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        informationSystems: base.part2.informationSystems.map((sys: any) => ({
          ...sys,
          classification: mapClassification(sys.classification ?? ""),
          internalUsers: mapUsers(sys.internalUsers),
          externalUsers: mapUsers(sys.externalUsers),
        })),
      },
      part3: {
        ...base.part3,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        proposedSystems: base.part3.proposedSystems.map((sys: any) => ({
          ...sys,
          classification: mapClassification(sys.classification ?? ""),
          internalUsers: mapUsers(sys.internalUsers),
          externalUsers: mapUsers(sys.externalUsers),
        })),
      },
    };
  }

  // v4 -> v5: explicit PIA Yes/No, proposed IS description/interoperability dimensions,
  // and new-document EGP statuses can remain unanswered.
  if ((base.schemaVersion ?? 1) < 5) {
    const mapPiaAnswer = (value: unknown): PiaProcessAnswer => {
      if (value === true || value === "yes") return "yes";
      if (value === "no") return "no";
      return "";
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInterop = (raw: any) => {
      if (raw?.integrated !== undefined) {
        return {
          integrated: raw.integrated ?? false,
          internalSystems: raw.internalSystems ?? "",
          externalSystems: raw.externalSystems ?? "",
          generatesData: raw.generatesData ?? false,
          processesExternalData: raw.processesExternalData ?? false,
          sharedPlatform: raw.sharedPlatform ?? false,
        };
      }
      const systems: { name?: string; type?: string }[] = Array.isArray(raw?.systems) ? raw.systems : [];
      return {
        integrated: !!raw?.hasInteroperability || systems.length > 0,
        internalSystems: systems.filter((s) => s.type === "Internal").map((s) => s.name).join(", "),
        externalSystems: systems.filter((s) => s.type === "External").map((s) => s.name).join(", "),
        generatesData: false,
        processesExternalData: systems.some((s) => s.type === "External"),
        sharedPlatform: false,
      };
    };
    base = {
      ...base,
      schemaVersion: 5,
      part2: {
        ...base.part2,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        informationSystems: base.part2.informationSystems.map((sys: any) => ({
          ...sys,
          interoperability: mapInterop(sys.interoperability),
          pia: {
            ...sys.pia,
            processesPersonalInfo: mapPiaAnswer(sys.pia?.processesPersonalInfo),
            piaCompleted: sys.pia?.piaCompleted ?? sys.pia?.piaConducted ?? false,
          },
        })),
      },
      part3: {
        ...base.part3,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        proposedSystems: base.part3.proposedSystems.map((sys: any) => ({
          ...sys,
          description: sys.description ?? sys.enhancementDetails ?? "",
          interoperability: mapInterop(sys.interoperability),
          pia: {
            ...sys.pia,
            processesPersonalInfo: mapPiaAnswer(sys.pia?.processesPersonalInfo),
            piaRequired: sys.pia?.piaRequired ?? sys.pia?.piaCompleted ?? sys.pia?.piaConducted ?? false,
          },
        })),
      },
    };
  }

  // v5 -> v6: Total Project Cost is derived from Part IV resource requirements
  // (computeProjectCosts), never stored on the project — drop stale copies.
  if ((base.schemaVersion ?? 1) < 6) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripCost = (projects: any[]) =>
      projects.map((p) => {
        const rest = { ...p };
        delete rest.totalProjectCost;
        return rest;
      });
    base = {
      ...base,
      schemaVersion: 6,
      part3: {
        ...base.part3,
        internalProjects: stripCost(base.part3.internalProjects),
        crossAgencyProjects: stripCost(base.part3.crossAgencyProjects),
      },
    };
  }

  // v6 -> v7: EGP checklist status simplified to plain Yes/No, matching the DICT
  // template exactly — the template's checklist has no "Proposed" or "Not Applicable"
  // box for any of the 9 programs, only a Yes/No question per row.
  if ((base.schemaVersion ?? 1) < 7) {
    // Rows whose template "If No" follow-up includes a "Proposed development of
    // equivalent system" checkbox — migrating "proposed" preserves that signal there.
    const PROPOSED_DEV_KEYS = new Set(["eGovPay", "hcmis", "ifmis", "procurement"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const migrateEgpProgram = (key: string, p: any) => {
      if (!p) return p;
      switch (p.status) {
        case "utilizing":
          return { ...p, status: "yes" };
        case "not_utilizing":
          return { ...p, status: "no" };
        case "proposed":
          return {
            ...p,
            status: "no",
            ifNo: PROPOSED_DEV_KEYS.has(key) ? { ...p.ifNo, proposedDevelopment: true } : p.ifNo,
          };
        case "not_applicable":
          return { ...p, status: "" };
        default:
          return p; // already "yes" | "no" | ""
      }
    };
    const egp = base.part2.egpChecklist;
    base = {
      ...base,
      schemaVersion: 7,
      part2: {
        ...base.part2,
        egpChecklist: {
          ...egp,
          elgu: egp.elgu ? migrateEgpProgram("elgu", egp.elgu) : undefined,
          eGovPay: migrateEgpProgram("eGovPay", egp.eGovPay),
          pnpki: migrateEgpProgram("pnpki", egp.pnpki),
          hcmis: migrateEgpProgram("hcmis", egp.hcmis),
          ifmis: migrateEgpProgram("ifmis", egp.ifmis),
          onlinePortal: migrateEgpProgram("onlinePortal", egp.onlinePortal),
          procurement: migrateEgpProgram("procurement", egp.procurement),
          recordsMgmt: migrateEgpProgram("recordsMgmt", egp.recordsMgmt),
          pscp: migrateEgpProgram("pscp", egp.pscp),
        },
      },
    };
  }

  // v7 -> v8: EGP checklist "Notes" field removed — not part of the DICT template,
  // which has no free-text notes cell anywhere in the 9-row checklist.
  if ((base.schemaVersion ?? 1) < 8) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripNotes = (p: any) => {
      if (!p) return p;
      const rest = { ...p };
      delete rest.notes;
      return rest;
    };
    const egp = base.part2.egpChecklist;
    base = {
      ...base,
      schemaVersion: 8,
      part2: {
        ...base.part2,
        egpChecklist: {
          ...egp,
          elgu: egp.elgu ? stripNotes(egp.elgu) : undefined,
          eGovPay: stripNotes(egp.eGovPay),
          pnpki: stripNotes(egp.pnpki),
          hcmis: stripNotes(egp.hcmis),
          ifmis: stripNotes(egp.ifmis),
          onlinePortal: stripNotes(egp.onlinePortal),
          procurement: stripNotes(egp.procurement),
          recordsMgmt: stripNotes(egp.recordsMgmt),
          pscp: stripNotes(egp.pscp),
        },
      },
    };
  }

  // v8 -> v9: retire the generic deploymentType field; introduce frontlineAccessType,
  // the template's Frontline "Identify if: Online/On-premise/Hybrid". The old
  // deploymentType only carried real meaning for frontline systems; on non-frontline
  // systems it duplicated the separate Data Storage field, so those values are dropped.
  if ((base.schemaVersion ?? 1) < 9) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const migrateSystem = (s: any) => {
      const rest = { ...s };
      const dt = rest.deploymentType;
      delete rest.deploymentType;
      // Only frontline systems get a frontlineAccessType; everything else resets to "".
      let fat = "";
      if (rest.frontline === true) {
        if (dt === "CLOUD" || dt === "HOSTED") fat = "ONLINE";
        else if (dt === "ON_PREMISE") fat = "ON_PREMISE";
        else if (dt === "HYBRID") fat = "HYBRID";
      }
      // Proposed systems never stored url before v9; backfill so the new required field exists.
      return { ...rest, frontlineAccessType: fat, url: rest.url ?? "" };
    };
    base = {
      ...base,
      schemaVersion: 9,
      part2: { ...base.part2, informationSystems: base.part2.informationSystems.map(migrateSystem) },
      part3: { ...base.part3, proposedSystems: base.part3.proposedSystems.map(migrateSystem) },
    };
  }

  // v9 -> v10: Stakeholder services now require a direction (Incoming/Outgoing),
  // matching the 2026-06-12 v2 template's Stakeholder Analysis table. No legacy
  // data implies a direction, so every existing service defaults to "" (unset)
  // and part1/c is flagged for migration review (see migration-review.ts).
  if ((base.schemaVersion ?? 1) < 10) {
    base = {
      ...base,
      schemaVersion: 10,
      part1: {
        ...base.part1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stakeholders: base.part1.stakeholders.map((s: any) => ({
          ...s,
          services: (s.services ?? []).map((sv: any) => ({ ...sv, direction: sv.direction ?? "" })),
        })),
      },
    };
  }

  // Idempotent normalizations — keep stored data in sync with what forms write on mount,
  // so that editing a field and reverting it produces a hash equal to the snapshot.
  let normalized: IsspDocument = {
    ...base,
    part1: {
      ...base.part1,
      // Fill missing IDs on stakeholders and their services; default missing direction to "" —
      // mirrors the form's own init normalization (see part1-c-form.tsx), required per the
      // "Form init normalization" trap in the schema-change skill so edit+revert doesn't
      // produce a permanent false "unsaved changes".
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stakeholders: base.part1.stakeholders.map((s: any) => ({
        ...s,
        id: s.id || genId(),
        services: (s.services ?? []).map((sv: Partial<StakeholderService>) => ({
          ...sv,
          id: sv.id || genId(),
          direction: sv.direction ?? "",
        })),
      })),
    },
    part2: {
      ...base.part2,
      // Migrate old single outcomeId → outcomeIds array (form does this on mount)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      strategicConcerns: base.part2.strategicConcerns.map((c: any) => ({
        ...c,
        outcomeIds: Array.isArray(c.outcomeIds) ? c.outcomeIds : (c.outcomeId ? [c.outcomeId] : []),
      })),
    },
    part3: {
      ...base.part3,
      // Normalize HCRow: add id, uppercase employmentStatus, rename physicalCount→quantity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      proposedHumanCapital: base.part3.proposedHumanCapital.map((r: any): HCRow => ({
        id: r.id || genId(),
        position: r.position ?? "",
        employmentStatus: (r.employmentStatus?.toUpperCase() ?? "") as HCRow["employmentStatus"],
        quantity: r.quantity ?? r.physicalCount ?? 1,
      })),
      // Normalize projectType: freeform pre-enum values → enum; derive IS_DRIVEN from
      // existing links so the gated "Linked Proposed Systems" picker isn't hidden on old docs
      internalProjects: base.part3.internalProjects.map(normalizeProjectType),
      crossAgencyProjects: base.part3.crossAgencyProjects.map(normalizeProjectType),
    },
  };

  const existingReview = normalized.migrationReview;
  const reviewIds = existingReview
    ? existingReview.pendingSectionIds
    : getRequiredMigrationReviewSectionIds(sourceSchemaVersion);
  const pendingSectionIds = [...new Set(reviewIds)];
  if (pendingSectionIds.length > 0) {
    const sectionMeta = { ...(normalized.sectionMeta ?? {}) };
    for (const sectionId of pendingSectionIds) {
      const meta = sectionMeta[sectionId];
      sectionMeta[sectionId] = {
        userMarkedDone: false,
        lastEditedAt: meta?.lastEditedAt ?? null,
      };
    }
    normalized = {
      ...normalized,
      sectionMeta,
      migrationReview: existingReview ?? {
        sourceSchemaVersion,
        migratedToSchemaVersion: CURRENT_SCHEMA_VERSION,
        pendingSectionIds,
        noticeAcknowledgedAt: null,
      },
    };
  }

  return { ...normalized, sectionMeta: deriveMetaFromContent(normalized) };
}

// ─── Content hash (for unsaved-changes detection) ────────────────────────────

/**
 * Strips implementation timestamps from the doc before comparing.
 * Keeps affirmative userMarkedDone state but drops lastEditedAt / updatedAt / exportedAt
 * and default-false metadata entries created by transient edits.
 */
function docContentHash(doc: IsspDocument): string {
  const { sectionMeta } = doc;
  const metaStripped = sectionMeta
    ? Object.fromEntries(
        Object.entries(sectionMeta)
          .filter(([, v]) => v.userMarkedDone)
          .map(([k, v]) => [k, { userMarkedDone: v.userMarkedDone }])
      )
    : {};
  return JSON.stringify({ ...doc, updatedAt: undefined, exportedAt: undefined, sectionMeta: metaStripped });
}

// ─── Context ──────────────────────────────────────────────────────────────────

const IsspStoreContext = createContext<IsspStoreValue | null>(null);

const SAVE_DEBOUNCE_MS = 1500;
const SAVED_FLASH_MS = 2000;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function IsspStoreProvider({ children }: { children: ReactNode }) {
  const [doc, setDoc] = useState<IsspDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fileSavedAt, setFileSavedAt] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<IsspDocument | null>(null);
  const [migrationNotice, setMigrationNotice] = useState<MigrationReview | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveGenerationRef = useRef(0);

  const clearSaveTimers = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    saveTimerRef.current = null;
    flashTimerRef.current = null;
  }, []);

  const markSaveError = useCallback((error: unknown, fallback: string) => {
    setSaveStatus("error");
    setSaveError(errorMessage(error, fallback));
  }, []);

  useEffect(() => {
    idbLoad()
      .then(async (doc) => {
        if (!doc) return doc;
        const migrated = migrateLegacyDoc(doc);
        if (docContentHash(migrated) !== docContentHash(doc)) await idbSave(migrated);
        recordIsspUsage("restored", migrated.agency);
        return migrated;
      })
      .then(setDoc)
      .catch((err) => markSaveError(err, "Could not load the browser-saved ISSP draft."))
      .finally(() => setLoading(false));
    return () => {
      clearSaveTimers();
    };
  }, [clearSaveTimers, markSaveError]);

  const scheduleSave = useCallback((next: IsspDocument) => {
    const generation = ++saveGenerationRef.current;
    setSaveStatus("saving");
    setSaveError(null);
    clearSaveTimers();
    saveTimerRef.current = setTimeout(async () => {
      try {
        await idbSave(next);
        if (saveGenerationRef.current !== generation) return;
        setSaveStatus("saved");
        flashTimerRef.current = setTimeout(() => setSaveStatus("idle"), SAVED_FLASH_MS);
      } catch (err) {
        if (saveGenerationRef.current === generation) {
          markSaveError(err, "Could not save the ISSP draft in this browser.");
        }
      }
    }, SAVE_DEBOUNCE_MS);
  }, [clearSaveTimers, markSaveError]);

  const update = useCallback(
    (patcher: (prev: IsspDocument) => IsspDocument) => {
      setDoc((prev) => {
        if (!prev) return prev;
        const next = patcher({ ...prev, updatedAt: new Date().toISOString() });
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const updatePart1 = useCallback(
    (patch: Partial<Part1Data>) =>
      update((prev) => ({ ...prev, part1: { ...prev.part1, ...patch } })),
    [update]
  );

  const updatePart2 = useCallback(
    (patch: Partial<Part2Data>) =>
      update((prev) => ({ ...prev, part2: { ...prev.part2, ...patch } })),
    [update]
  );

  const updatePart3 = useCallback(
    (patch: Partial<Part3Data>) =>
      update((prev) => ({ ...prev, part3: { ...prev.part3, ...patch } })),
    [update]
  );

  const updatePart4 = useCallback(
    (patch: Partial<Part4Data>) =>
      update((prev) => ({ ...prev, part4: { ...prev.part4, ...patch } })),
    [update]
  );

  const updateSectionMeta = useCallback(
    (sectionId: string, patch: Partial<SectionMeta>) =>
      update((prev) => {
        const migrationReview = patch.userMarkedDone === true && prev.migrationReview?.pendingSectionIds.includes(sectionId)
          ? {
              ...prev.migrationReview,
              pendingSectionIds: prev.migrationReview.pendingSectionIds.filter((id) => id !== sectionId),
            }
          : prev.migrationReview;
        return {
          ...prev,
          sectionMeta: {
            ...prev.sectionMeta,
            [sectionId]: { userMarkedDone: false, lastEditedAt: null, ...prev.sectionMeta?.[sectionId], ...patch },
          },
          migrationReview: migrationReview?.pendingSectionIds.length ? migrationReview : undefined,
        };
      }),
    [update]
  );

  const createNew = useCallback(
    (opts: NewDocOptions) => {
      const newDoc = createEmptyDocument(opts);
      setDoc(newDoc);
      scheduleSave(newDoc);
      setSavedSnapshot(structuredClone(newDoc));
      recordIsspUsage("created", newDoc.agency);
    },
    [scheduleSave]
  );

  const clearDoc = useCallback(async (): Promise<StoreActionResult> => {
    ++saveGenerationRef.current;
    clearSaveTimers();
    setSaveError(null);
    try {
      await idbClear();
      setDoc(null);
      setSaveStatus("idle");
      setSavedSnapshot(null);
      setFileSavedAt(null);
      setMigrationNotice(null);
      return { success: true };
    } catch (err) {
      const error = errorMessage(err, "Could not clear the browser-saved ISSP draft.");
      setSaveStatus("error");
      setSaveError(error);
      return { success: false, error };
    }
  }, [clearSaveTimers]);

  const saveToFile = useCallback(async (): Promise<StoreActionResult> => {
    if (!doc) return { success: false, error: "No ISSP document is loaded." };
    const generation = ++saveGenerationRef.current;
    clearSaveTimers();
    setSaveStatus("saving");
    setSaveError(null);
    const now = new Date().toISOString();
    const exported: IsspDocument = { ...doc, exportedAt: now };
    const json = JSON.stringify(exported, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = doc.agency.acronym
      ? `${doc.agency.acronym}-ISSP-${doc.startYear}-${doc.endYear}`
      : `ISSP-${doc.startYear}-${doc.endYear}`;
    a.href = url;
    a.download = `${slug}.issp`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    // Sync in-memory state so unsavedToFile resets immediately
    setDoc(exported);
    setFileSavedAt(now);
    setSavedSnapshot(structuredClone(exported));
    try {
      await idbSave(exported);
      if (saveGenerationRef.current === generation) {
        setSaveStatus("saved");
        flashTimerRef.current = setTimeout(() => setSaveStatus("idle"), SAVED_FLASH_MS);
      }
      return { success: true };
    } catch (err) {
      const error = errorMessage(err, "The .issp file was downloaded, but the browser backup could not be updated.");
      if (saveGenerationRef.current === generation) {
        setSaveStatus("error");
        setSaveError(error);
      }
      return { success: false, error };
    }
  }, [clearSaveTimers, doc]);

  const loadFromFile = useCallback(
    async (file: File, options?: LoadFromFileOptions): Promise<StoreActionResult> => {
      try {
        if (file.size > MAX_ISSP_FILE_SIZE_BYTES) {
          return { success: false, error: "This .issp file is too large to load safely. Remove embedded diagrams or use a smaller file." };
        }
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;
        const normalized = normalizeImportShape(parsed);
        if (!normalized.success) return normalized;
        const imageValidation = validateEmbeddedImages(normalized.doc);
        if (!imageValidation.success) return imageValidation;
        const migrated = migrateLegacyDoc(normalized.doc);
        const migrationReview = migrated.migrationReview;
        setDoc(migrated);
        // Treat the file's exportedAt as the last known file save
        setFileSavedAt(migrated.exportedAt);
        setSavedSnapshot(structuredClone(migrated));
        await idbSave(migrated);
        setMigrationNotice(migrationReview?.pendingSectionIds.length ? migrationReview : null);
        if (options?.recordUsage !== false) recordIsspUsage("loaded", migrated.agency);
        return { success: true, migrationReview };
      } catch {
        return {
          success: false,
          error: "Could not read the file. Make sure it is a valid .issp file.",
        };
      }
    },
    []
  );

  const acknowledgeMigrationNotice = useCallback(() => {
    setMigrationNotice(null);
    update((prev) => prev.migrationReview
      ? {
          ...prev,
          migrationReview: {
            ...prev.migrationReview,
            noticeAcknowledgedAt: new Date().toISOString(),
          },
        }
      : prev
    );
  }, [update]);

  const unsavedToFile = !doc
    ? false
    : savedSnapshot
    ? docContentHash(doc) !== docContentHash(savedSnapshot)
    : doc.updatedAt > (fileSavedAt ?? doc.createdAt); // fallback on fresh browser load (no snapshot yet)

  return (
    <IsspStoreContext.Provider
      value={{
        doc,
        loading,
        saveStatus,
        saveError,
        fileSavedAt,
        savedSnapshot,
        unsavedToFile,
        migrationNotice,
        acknowledgeMigrationNotice,
        update,
        updatePart1,
        updatePart2,
        updatePart3,
        updatePart4,
        updateSectionMeta,
        createNew,
        clearDoc,
        saveToFile,
        loadFromFile,
      }}
    >
      {children}
    </IsspStoreContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIsspStore(): IsspStoreValue {
  const ctx = useContext(IsspStoreContext);
  if (!ctx) throw new Error("useIsspStore must be used inside <IsspStoreProvider>");
  return ctx;
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export type { IsspDocument, Part1Data, Part2Data, Part3Data, Part4Data, AgencyType, IsspScope, CyberControls, NetworkDiagram, SectionMeta, SectionStatus, MigrationReview } from "./types";
export type { NewDocOptions } from "./defaults";
