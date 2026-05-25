"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useIsspStore } from "@/lib/store";
import type { NewDocOptions } from "@/lib/store";
import {
  type IsspForm,
  IsspFormFields,
  BLANK_FORM,
  SCOPE_LABELS,
  AMENDMENT_LABELS,
  ISSP_END_YEAR,
} from "@/components/editor/issp-properties-dialog";

export function NewIsspDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const { createNew } = useIsspStore();
  const [form, setForm] = useState<IsspForm>(BLANK_FORM);

  const endYear = ISSP_END_YEAR;
  const title = `${form.agencyAcronym || form.agencyName ? (form.agencyAcronym || form.agencyName) + " " : ""}Information Systems Strategic Plan ${form.startYear}–${endYear}`;

  function set<K extends keyof IsspForm>(key: K, value: IsspForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreate() {
    if (!isValid) return;
    const opts: NewDocOptions = {
      title,
      startYear: form.startYear,
      endYear,
      amendmentNumber: form.amendmentNumber,
      scope: form.scope,
      agencyHeadName: form.agencyHeadName.trim(),
      agency: {
        name: form.agencyName.trim(),
        acronym: form.agencyAcronym.trim().toUpperCase(),
        type: form.agencyType,
        websiteUrl: form.agencyWebsite.trim(),
        logoBase64: null,
      },
    };
    createNew(opts);
    onClose();
    onCreated?.();
  }

  const isValid =
    form.agencyName.trim().length > 0 &&
    form.agencyAcronym.trim().length > 0 &&
    form.agencyHeadName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New ISSP</DialogTitle>
        </DialogHeader>

        <IsspFormFields form={form} set={set} endYear={endYear} idPrefix="new-" />

        {isValid && (
          <div className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground space-y-0.5">
            <p className="font-medium text-foreground text-sm leading-snug">{title}</p>
            <p>
              {form.startYear}–{endYear} · {SCOPE_LABELS[form.scope]} ·{" "}
              {AMENDMENT_LABELS[form.amendmentNumber]}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!isValid}>Create ISSP</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
