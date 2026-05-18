"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const REMINDER_DELAY_MS = 10 * 60 * 1000; // 10 minutes

export function useFileSaveReminder(unsavedToFile: boolean, onSave: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!unsavedToFile) {
      toast.dismiss("file-save-reminder");
      return;
    }

    timerRef.current = setTimeout(() => {
      toast("Save your work to a file", {
        id: "file-save-reminder",
        description:
          "Your edits are stored in this browser, but download a .issp file to keep a permanent backup.",
        action: {
          label: "Save to File",
          onClick: () => onSaveRef.current(),
        },
        duration: Infinity,
      });
    }, REMINDER_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [unsavedToFile]);
}
