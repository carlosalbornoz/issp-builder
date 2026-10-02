"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { php } from "@/lib/utils";
import type { ProjectCasualties } from "@/lib/project-delete";

const CLASS_LABEL = { capitalOutlay: "Capital Outlay", mooe: "MOOE" } as const;

/**
 * Hard confirmation for deleting a III-E project (usability principle 5:
 * destruction sized to the loss, casualties named). Lists every III-F KPI row
 * and Part IV budget line that goes with the project; when there are any, the
 * delete button stays disabled until the user acknowledges them.
 */
export function DeleteProjectDialog({
  open,
  onOpenChange,
  projectTitle,
  casualties,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTitle: string;
  casualties: ProjectCasualties;
  onConfirm: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const { kpiRows, budgetLines, budgetTotal } = casualties;
  const hasCasualties = kpiRows.length > 0 || budgetLines.length > 0;
  const title = projectTitle.trim() || "Untitled Project";

  function setOpen(next: boolean) {
    if (!next) setAcknowledged(false);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete project?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{title}</span> will be removed from Part III-E
            {hasCasualties ? ", together with everything listed below." : "."} This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {hasCasualties ? (
          <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-3 text-xs">
            {kpiRows.length > 0 && (
              <section className="space-y-1">
                <p className="font-semibold text-foreground">
                  Part III-F Performance Framework — {kpiRows.length} KPI row{kpiRows.length === 1 ? "" : "s"}
                </p>
                <ul className="space-y-0.5 pl-3">
                  {kpiRows.map((r) => (
                    <li key={r.id} className="break-words">
                      <span className="text-muted-foreground">{r.hierarchy || "—"}:</span>{" "}
                      {r.indicator || <span className="italic text-muted-foreground">No indicator</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {budgetLines.length > 0 && (
              <section className="space-y-1">
                <p className="font-semibold text-foreground">
                  Part IV Resource Requirements — {budgetLines.length} line item{budgetLines.length === 1 ? "" : "s"},{" "}
                  {php(budgetTotal)}
                </p>
                <ul className="space-y-0.5 pl-3">
                  {budgetLines.map(({ year, expenseClass, line }) => (
                    <li key={line.id} className="flex flex-col sm:flex-row sm:gap-2">
                      <span className="min-w-0 flex-1 break-words">
                        <span className="text-muted-foreground">{year} · {CLASS_LABEL[expenseClass]}:</span>{" "}
                        {line.item || <span className="italic text-muted-foreground">Unnamed item</span>}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground sm:text-foreground">
                        {line.qty} × {php(line.unitCost)} = {php(line.qty * line.unitCost)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No III-F KPIs or Part IV budget lines are linked to this project.</p>
        )}

        {hasCasualties && (
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <Checkbox checked={acknowledged} onCheckedChange={(v) => setAcknowledged(v === true)} className="mt-0.5" />
            <span>I understand that these KPIs and budget lines will also be deleted.</span>
          </label>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={hasCasualties && !acknowledged}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Delete project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
