"use client";

import { useCallback } from "react";
import { useIsspStore } from "@/lib/store";
import type { Part1Data, Part2Data, Part3Data, Part4Data } from "@/lib/store/types";

type PartKey = "part1" | "part2" | "part3" | "part4";

type PartData<K extends PartKey> =
  K extends "part1" ? Part1Data :
  K extends "part2" ? Part2Data :
  K extends "part3" ? Part3Data :
  Part4Data;

/**
 * Drop-in replacement for useAutoSave for local-first forms.
 * Instead of POSTing to an API, it merges the patch into the given part
 * in the IndexedDB store.
 *
 * Usage (swap useAutoSave for useLocalSave in any form):
 *   const { status, debouncedSave } = useLocalSave("part1", "part1/a");
 *
 * Passing sectionId updates lastEditedAt on each save so status dots and
 * the Overview completion count only advance when content actually changes.
 */
export function useLocalSave<K extends PartKey>(part: K, sectionId?: string) {
  const { updatePart1, updatePart2, updatePart3, updatePart4, saveStatus, updateSectionMeta } = useIsspStore();

  const debouncedSave = useCallback(
    (data: Partial<PartData<K>>) => {
      if (part === "part1") updatePart1(data as Partial<Part1Data>);
      else if (part === "part2") updatePart2(data as Partial<Part2Data>);
      else if (part === "part3") updatePart3(data as Partial<Part3Data>);
      else updatePart4(data as Partial<Part4Data>);

      if (sectionId) {
        updateSectionMeta(sectionId, { lastEditedAt: new Date().toISOString() });
      }
    },
    [part, sectionId, updatePart1, updatePart2, updatePart3, updatePart4, updateSectionMeta]
  );

  // Map store saveStatus to the legacy SaveStatus shape forms expect
  const status: "saved" | "saving" | "unsaved" | "error" =
    saveStatus === "error" ? "error" : saveStatus === "saving" ? "saving" : "saved";

  return { status, debouncedSave, saveNow: debouncedSave };
}
