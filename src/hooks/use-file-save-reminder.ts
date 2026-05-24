"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const REMINDER_DELAY_MS = 10 * 60 * 1000; // 10 minutes

export function useFileSaveReminder(unsavedToFile: boolean) {
  const [reminderDue, setReminderDue] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReminderTimer = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const startReminderTimer = useCallback(() => {
    clearReminderTimer();
    timerRef.current = setTimeout(() => {
      setReminderDue(true);
      timerRef.current = null;
    }, REMINDER_DELAY_MS);
  }, [clearReminderTimer]);

  useEffect(() => {
    if (!unsavedToFile) {
      clearReminderTimer();
      // Reset immediately when the file is saved so a prior reminder cannot flash on the next edit cycle.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReminderDue(false);
      return undefined;
    }

    // Hide any prior reminder while starting a fresh 10-minute unsaved-change window.
    setReminderDue(false);
    startReminderTimer();

    return () => {
      clearReminderTimer();
    };
  }, [clearReminderTimer, startReminderTimer, unsavedToFile]);

  const snoozeReminder = () => {
    if (!unsavedToFile) return;
    setReminderDue(false);
    startReminderTimer();
  };

  return { reminderDue: unsavedToFile && reminderDue, snoozeReminder };
}
