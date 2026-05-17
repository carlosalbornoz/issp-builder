"use client";

import { useState, useCallback, useRef } from "react";

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface UseAutoSaveOptions {
  url: string;
  method?: "PUT" | "PATCH";
  debounceMs?: number;
}

export function useAutoSave({ url, method = "PUT", debounceMs = 1500 }: UseAutoSaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDataRef = useRef<unknown>(null);

  const save = useCallback(
    async (data: unknown) => {
      setStatus("saving");
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Save failed");
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    },
    [url, method]
  );

  const debouncedSave = useCallback(
    (data: unknown) => {
      pendingDataRef.current = data;
      setStatus("unsaved");

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        save(pendingDataRef.current);
      }, debounceMs);
    },
    [save, debounceMs]
  );

  const saveNow = useCallback(async (data: unknown) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await save(data);
  }, [save]);

  return { status, debouncedSave, saveNow };
}
