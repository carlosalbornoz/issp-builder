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
import type { IsspDocument, Part1Data, Part2Data, Part3Data, Part4Data } from "./types";
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
  /** True when the doc has been edited since the last file save (or since creation for new docs). */
  unsavedToFile: boolean;
  /** Apply a transformation to the current document. Schedules an IDB write. */
  update: (patcher: (prev: IsspDocument) => IsspDocument) => void;
  /** Convenience updaters — shallow-merge a patch into the given part. */
  updatePart1: (patch: Partial<Part1Data>) => void;
  updatePart2: (patch: Partial<Part2Data>) => void;
  updatePart3: (patch: Partial<Part3Data>) => void;
  updatePart4: (patch: Partial<Part4Data>) => void;
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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    idbLoad()
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
    },
    [scheduleSave]
  );

  const clearDoc = useCallback(async () => {
    await idbClear();
    setDoc(null);
    setSaveStatus("idle");
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
        replace(parsed);
        // Treat the file's exportedAt as the last known file save
        setFileSavedAt(parsed.exportedAt);
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

  const unsavedToFile = !!doc && doc.updatedAt > (fileSavedAt ?? doc.createdAt);

  return (
    <IsspStoreContext.Provider
      value={{
        doc,
        loading,
        saveStatus,
        fileSavedAt,
        unsavedToFile,
        update,
        updatePart1,
        updatePart2,
        updatePart3,
        updatePart4,
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

export type { IsspDocument, Part1Data, Part2Data, Part3Data, Part4Data, AgencyType, IsspScope, CyberControls, NetworkDiagram } from "./types";
export type { NewDocOptions } from "./defaults";
