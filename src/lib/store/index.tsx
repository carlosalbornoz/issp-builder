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
import type { IsspDocument, Part1Data, Part2Data, Part3Data, Part4Data, SectionMeta, HumanCapital, CyberControls, EgpChecklist, YearBudget, HCRow } from "./types";
import { createEmptyDocument, type NewDocOptions } from "./defaults";
import { idbClear, idbLoad, idbSave } from "./idb";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SaveStatus = "idle" | "saving" | "saved";

export interface IsspStoreValue {
  doc: IsspDocument | null;
  loading: boolean;
  saveStatus: SaveStatus;
  /** ISO timestamp of the last explicit "Save to File" in this session; null if never saved. */
  fileSavedAt: string | null;
  /** In-memory snapshot of the doc at the last saveToFile/loadFromFile. Null on fresh page load. */
  savedSnapshot: IsspDocument | null;
  /** True when the doc has been edited since the last file save (or since creation for new docs). */
  unsavedToFile: boolean;
  /** Apply a transformation to the current document. Schedules an IDB write. */
  update: (patcher: (prev: IsspDocument) => IsspDocument) => void;
  /** Convenience updaters — shallow-merge a patch into the given part. */
  updatePart1: (patch: Partial<Part1Data>) => void;
  updatePart2: (patch: Partial<Part2Data>) => void;
  updatePart3: (patch: Partial<Part3Data>) => void;
  updatePart4: (patch: Partial<Part4Data>) => void;
  /** Update per-section metadata (userMarkedDone, lastEditedAt). */
  updateSectionMeta: (sectionId: string, patch: Partial<SectionMeta>) => void;
  /** Replace the entire document (used by loadFromFile). */
  replace: (doc: IsspDocument) => void;
  /** Create a new blank document and load it into the store. */
  createNew: (opts: NewDocOptions) => void;
  /** Delete the current document from IDB and clear state. */
  clearDoc: () => Promise<void>;
  /** Download the current document as a .issp file. */
  saveToFile: () => void;
  /** Parse a .issp file and load it into the store. */
  loadFromFile: (file: File) => Promise<{ success: boolean; error?: string }>;
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
  return Object.values(egp).some((p) => p.status !== "not_utilizing");
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

function migrateLegacyDoc(doc: IsspDocument): IsspDocument {
  // v1 → v2: planStatus, submissionTarget, sectionMeta
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let base: IsspDocument = (doc.schemaVersion ?? 1) >= 2 ? doc : {
    ...doc,
    schemaVersion: 2,
    planStatus: (doc as any).planStatus ?? "draft",
    submissionTarget: (doc as any).submissionTarget ?? { agency: "DICT", deadline: null },
    sectionMeta: (doc as any).sectionMeta ?? {},
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

  // Idempotent normalizations — keep stored data in sync with what forms write on mount,
  // so that editing a field and reverting it produces a hash equal to the snapshot.
  const normalized: IsspDocument = {
    ...base,
    part1: {
      ...base.part1,
      // Fill missing IDs on stakeholders and their services
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stakeholders: base.part1.stakeholders.map((s: any) => ({
        ...s,
        id: s.id || genId(),
        services: (s.services ?? []).map((sv: any) => ({ ...sv, id: sv.id || genId() })),
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
    },
  };

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
  const [fileSavedAt, setFileSavedAt] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<IsspDocument | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    idbLoad()
      .then((doc) => doc ? migrateLegacyDoc(doc) : doc)
      .then(setDoc)
      .finally(() => setLoading(false));
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const scheduleSave = useCallback((next: IsspDocument) => {
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await idbSave(next);
      setSaveStatus("saved");
      flashTimerRef.current = setTimeout(() => setSaveStatus("idle"), SAVED_FLASH_MS);
    }, SAVE_DEBOUNCE_MS);
  }, []);

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
      update((prev) => ({
        ...prev,
        sectionMeta: {
          ...prev.sectionMeta,
          [sectionId]: { userMarkedDone: false, lastEditedAt: null, ...prev.sectionMeta?.[sectionId], ...patch },
        },
      })),
    [update]
  );

  const replace = useCallback(
    (newDoc: IsspDocument) => {
      setDoc(newDoc);
      scheduleSave(newDoc);
    },
    [scheduleSave]
  );

  const createNew = useCallback(
    (opts: NewDocOptions) => {
      const newDoc = createEmptyDocument(opts);
      setDoc(newDoc);
      scheduleSave(newDoc);
      setSavedSnapshot(structuredClone(newDoc));
    },
    [scheduleSave]
  );

  const clearDoc = useCallback(async () => {
    await idbClear();
    setDoc(null);
    setSaveStatus("idle");
    setSavedSnapshot(null);
  }, []);

  const saveToFile = useCallback(() => {
    if (!doc) return;
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
    a.click();
    URL.revokeObjectURL(url);
    // Sync in-memory state so unsavedToFile resets immediately
    setDoc(exported);
    idbSave(exported);
    setFileSavedAt(now);
    setSavedSnapshot(structuredClone(exported));
  }, [doc]);

  const loadFromFile = useCallback(
    async (file: File): Promise<{ success: boolean; error?: string }> => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as IsspDocument;
        if (parsed.fileType !== "issp-main") {
          return {
            success: false,
            error: "This file is not a main ISSP document. Make sure you are loading a .issp file created by this tool.",
          };
        }
        const migrated = migrateLegacyDoc(parsed);
        replace(migrated);
        // Treat the file's exportedAt as the last known file save
        setFileSavedAt(parsed.exportedAt);
        setSavedSnapshot(structuredClone(migrated));
        return { success: true };
      } catch {
        return {
          success: false,
          error: "Could not read the file. Make sure it is a valid .issp file.",
        };
      }
    },
    [replace]
  );

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
        fileSavedAt,
        savedSnapshot,
        unsavedToFile,
        update,
        updatePart1,
        updatePart2,
        updatePart3,
        updatePart4,
        updateSectionMeta,
        replace,
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

export type { IsspDocument, Part1Data, Part2Data, Part3Data, Part4Data, AgencyType, IsspScope, CyberControls, NetworkDiagram, SectionMeta, SectionStatus } from "./types";
export type { NewDocOptions } from "./defaults";
