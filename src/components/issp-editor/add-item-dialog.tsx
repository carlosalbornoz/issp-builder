"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Focused create surface for container objects (usability principle 1: adds
 * never happen silently below the fold). The trigger button lives in the
 * parent; the parent owns the field state and appends + reveals on create.
 */
export function AddItemDialog({
  open,
  onOpenChange,
  title,
  description,
  createLabel = "Create",
  canCreate = true,
  onCreate,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  createLabel?: string;
  canCreate?: boolean;
  onCreate: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canCreate) onCreate();
          }}
          className="space-y-4"
        >
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canCreate}>
              {createLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Convenience hook for the open state + a draft string (the common case: name-first create). */
export function useAddItemDraft() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  function openDialog() {
    setDraft("");
    setOpen(true);
  }
  return { open, setOpen, draft, setDraft, openDialog };
}
