"use client";

import { Fragment, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useLocalSave } from "@/hooks/use-local-save";
import { Plus, Trash2, Pencil, Table2, LayoutList, ChevronDown, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { SectionShell } from "@/components/editor/section-shell";
import { revealNewItem } from "@/lib/reveal";

// ─── Types ────────────────────────────────────────────────────────────────────

type TransactionDirection = "INCOMING" | "OUTGOING" | "";

interface StakeholderService {
  id: string;
  name: string;
  complexity: "Simple" | "Complex" | "Highly Technical";
  direction: TransactionDirection;
}

interface Stakeholder {
  id: string;
  name: string;
  services: StakeholderService[];
}

interface Part1CFormProps {
  initialData: Stakeholder[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const COMPLEXITY_OPTIONS = [
  { value: "Simple", label: "Simple", hint: "Max 3 working days" },
  { value: "Complex", label: "Complex", hint: "Max 7 working days" },
  { value: "Highly Technical", label: "Highly Technical", hint: "Max 20 working days" },
];

const COMPLEXITY_COLORS: Record<string, string> = {
  Simple: "bg-success-bg text-success border border-success-border",
  Complex: "bg-warning-bg text-warning border border-warning-border",
  "Highly Technical": "bg-danger-bg text-destructive border border-danger-border",
};

function makeService(): StakeholderService {
  return { id: generateId(), name: "", complexity: "Simple", direction: "" };
}

function makeStakeholder(): Stakeholder {
  return { id: generateId(), name: "", services: [] };
}

// ─── Direction display (Incoming / Outgoing) ─────────────────────────────────

const DIRECTION_OPTIONS: { value: Exclude<TransactionDirection, "">; label: string; icon: React.ReactNode }[] = [
  { value: "INCOMING", label: "Incoming", icon: <ArrowDownToLine className="h-3 w-3" /> },
  { value: "OUTGOING", label: "Outgoing", icon: <ArrowUpFromLine className="h-3 w-3" /> },
];

function directionIcon(direction: TransactionDirection, className = "h-3 w-3") {
  if (direction === "INCOMING") return <ArrowDownToLine className={className} />;
  if (direction === "OUTGOING") return <ArrowUpFromLine className={className} />;
  return null;
}

/** Read-only rendering of a direction value — icon + word, no interactive chrome. */
function DirectionLabel({ direction }: { direction: TransactionDirection }) {
  if (!direction) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      {directionIcon(direction, "h-3.5 w-3.5 text-muted-foreground")}
      {direction === "INCOMING" ? "Incoming" : "Outgoing"}
    </span>
  );
}

/** Editable segmented Incoming/Outgoing control — used only inside edit surfaces. */
function DirectionToggle({
  value,
  onChange,
}: {
  value: TransactionDirection;
  onChange: (d: TransactionDirection) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border p-0.5 bg-muted/30" role="group" aria-label="Transaction direction">
      {DIRECTION_OPTIONS.map(({ value: v, label, icon }) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            value === v
              ? "bg-card shadow-sm font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Stakeholder Drawer — the one edit surface, used by List view ────────────
// Delete lives here, and only here: opening this drawer *is* "edit mode" for a
// stakeholder, so gating delete behind it is automatic, not a separate flag.

interface DrawerProps {
  open: boolean;
  stakeholder: Stakeholder | null;
  isNew: boolean;
  onSave: (s: Stakeholder) => void;
  onDelete: () => void;
  onClose: () => void;
}

function StakeholderDrawer({ open, stakeholder, isNew, onSave, onDelete, onClose }: DrawerProps) {
  const [name, setName] = useState(stakeholder?.name ?? "");
  const [services, setServices] = useState<StakeholderService[]>(() => stakeholder?.services ?? []);

  // Re-initialize from props each time the drawer opens (or the target changes
  // while open). Adjusting state during render avoids an extra effect pass.
  const [prevSession, setPrevSession] = useState<{ open: boolean; stakeholder: Stakeholder | null }>({ open, stakeholder });
  if (open !== prevSession.open || stakeholder !== prevSession.stakeholder) {
    setPrevSession({ open, stakeholder });
    if (open) {
      setName(stakeholder?.name ?? "");
      setServices(stakeholder?.services ?? []);
    }
  }

  function addSvc() { setServices((p) => [...p, makeService()]); }
  function removeSvc(id: string) { setServices((p) => p.filter((sv) => sv.id !== id)); }
  function updateSvc(id: string, field: keyof StakeholderService, value: string) {
    setServices((p) => p.map((sv) => sv.id === id ? { ...sv, [field]: value } : sv));
  }

  function handleSave() {
    onSave({ id: stakeholder?.id ?? generateId(), name, services });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        style={{ maxWidth: 520 }}
        className="flex flex-col p-0 gap-0"
      >
        <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <SheetTitle>{isNew ? "Add Stakeholder" : "Edit Stakeholder"}</SheetTitle>
          <SheetDescription>
            Define the stakeholder and all the transactions or services they engage with.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Stakeholder / Client</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Citizens, Businesses, Other NGAs"
            />
          </div>

          {/* Services */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Transactions / Services</label>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addSvc}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            <div className="rounded-md border divide-y">
              {services.map((sv, idx) => (
                <div key={sv.id} className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground shrink-0 mt-2.5 w-4">{idx + 1}.</span>
                    <Input
                      className="flex-1 text-sm"
                      placeholder="Describe transaction or service..."
                      value={sv.name}
                      onChange={(e) => updateSvc(sv.id, "name", e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSvc(sv.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pl-6">
                    <DirectionToggle
                      value={sv.direction}
                      onChange={(d) => updateSvc(sv.id, "direction", d)}
                    />
                  </div>
                  <Select
                    items={COMPLEXITY_OPTIONS}
                    value={sv.complexity}
                    onValueChange={(v: string | null) => v && updateSvc(sv.id, "complexity", v)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLEXITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex flex-col gap-0.5">
                            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${COMPLEXITY_COLORS[o.value]}`}>
                              {o.label}
                            </span>
                            <span className="text-xs text-muted-foreground">{o.hint}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t flex-row items-center justify-between gap-2 shrink-0">
          {!isNew ? (
            <ConfirmDeleteButton
              ariaLabel="Delete stakeholder"
              confirmText="Delete stakeholder + services?"
              onDelete={onDelete}
            />
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>
              {isNew ? "Add Stakeholder" : "Save Changes"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Read-only presentation of a stakeholder's services (principle 2) ────────

function StakeholderReadView({ stakeholder, onEdit }: { stakeholder: Stakeholder; onEdit: () => void }) {
  return (
    <div className="px-3 pb-3 pt-1 space-y-3">
      {stakeholder.services.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No transactions/services listed.</p>
      ) : (
        <div className="rounded-md border divide-y">
          {stakeholder.services.map((sv) => (
            <div key={sv.id} className="p-3 flex items-center gap-3 flex-wrap">
              <span className="flex-1 min-w-[10rem] text-sm">
                {sv.name || <span className="italic text-muted-foreground/60">Untitled transaction</span>}
              </span>
              <DirectionLabel direction={sv.direction} />
              <span className={`text-xs rounded px-1.5 py-0.5 font-medium shrink-0 ${COMPLEXITY_COLORS[sv.complexity]}`}>
                {sv.complexity}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Edit stakeholder
        </Button>
      </div>
    </div>
  );
}

// ─── View mode toggle ─────────────────────────────────────────────────────────

const LS_KEY = "issp-part1c-view";

type ViewMode = "table" | "list";

/** Old localStorage values ("cards" / "summary") fold into the merged "list" mode. */
function readStoredViewMode(): ViewMode {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw === "table") return "table";
    if (raw === "list" || raw === "cards" || raw === "summary") return "list";
    return "table";
  } catch {
    return "table";
  }
}

const VIEW_OPTIONS: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
  { mode: "table", label: "Table", icon: <Table2     className="h-3 w-3" /> },
  { mode: "list",  label: "List",  icon: <LayoutList className="h-3 w-3" /> },
];

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center rounded-md border p-0.5 bg-muted/30">
      {VIEW_OPTIONS.map(({ mode: m, label, icon }) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
            mode === m
              ? "bg-card shadow-sm font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function Part1CForm({ initialData }: Part1CFormProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(() =>
    initialData.map((s) => ({
      ...s,
      id: s.id || generateId(),
      services: (s.services ?? []).map((sv) => ({ ...sv, id: sv.id || generateId() })),
    }))
  );

  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);

  // Table view: one section-level switch. Defaults to read-only (principle 2:
  // "default to viewing") — the whole grid becomes editable together, since a
  // per-row toggle would fight the format's whole point (fast multi-row edits).
  const [tableEditing, setTableEditing] = useState(false);

  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  // List view: rows open collapsed by default (principle 2). Expanding shows a
  // read-only view; editing is the explicit "Edit stakeholder" action, which
  // opens the drawer above — that's the per-stakeholder "edit mode".
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const { debouncedSave } = useLocalSave("part1", "part1/c");

  const update = useCallback(
    (next: Stakeholder[]) => {
      setStakeholders(next);
      debouncedSave({ stakeholders: next });
    },
    [debouncedSave]
  );

  function switchMode(m: ViewMode) {
    setViewMode(m);
    try { localStorage.setItem(LS_KEY, m); } catch {}
  }

  // ── Table mode actions ──────────────────────────────────────────────────────

  function addStakeholder() {
    const s = makeStakeholder();
    update([...stakeholders, s]);
    revealNewItem(s.id);
  }

  function removeStakeholder(id: string) {
    update(stakeholders.filter((s) => s.id !== id));
  }

  function updateStakeholderName(id: string, name: string) {
    update(stakeholders.map((s) => (s.id === id ? { ...s, name } : s)));
  }

  function addService(stakeholderId: string, direction: TransactionDirection = "") {
    update(
      stakeholders.map((s) =>
        s.id === stakeholderId ? { ...s, services: [...s.services, { ...makeService(), direction }] } : s
      )
    );
  }

  function removeService(stakeholderId: string, serviceId: string) {
    update(
      stakeholders.map((s) =>
        s.id === stakeholderId
          ? { ...s, services: s.services.filter((sv) => sv.id !== serviceId) }
          : s
      )
    );
  }

  function updateService(
    stakeholderId: string,
    serviceId: string,
    field: keyof StakeholderService,
    value: string
  ) {
    update(
      stakeholders.map((s) =>
        s.id === stakeholderId
          ? { ...s, services: s.services.map((sv) => sv.id === serviceId ? { ...sv, [field]: value } : sv) }
          : s
      )
    );
  }

  // ── List mode (drawer) actions ──────────────────────────────────────────────

  const drawerIsNew = drawer.id === "new";
  const drawerStakeholder = drawerIsNew ? null : stakeholders.find((s) => s.id === drawer.id) ?? null;

  function openDrawerNew() { setDrawer({ open: true, id: "new" }); }
  function openDrawerEdit(id: string) { setDrawer({ open: true, id }); }
  function closeDrawer() { setDrawer({ open: false, id: null }); }

  function handleDrawerSave(s: Stakeholder) {
    if (drawerIsNew) {
      update([...stakeholders, s]);
      // Visible consequence: land on the new row, expanded, not off-screen.
      setOpenIds((prev) => new Set([...prev, s.id]));
      revealNewItem(s.id);
    } else {
      update(stakeholders.map((existing) => existing.id === s.id ? s : existing));
    }
    closeDrawer();
  }

  function handleDrawerDelete() {
    if (!drawer.id || drawerIsNew) return;
    update(stakeholders.filter((s) => s.id !== drawer.id));
    closeDrawer();
  }

  const canAddStakeholder = viewMode === "list" || tableEditing;

  return (
    <SectionShell
      sectionId="part1/c"
      title="Stakeholder Analysis"
      description="List the key stakeholders of your agency and the transactions/services they use."
    >
      {/* Guide */}
      <div className="rounded-lg border border-info-border bg-info-bg p-4 text-sm text-info">
        <p className="font-medium mb-1">Guidelines</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-info">
          <li>List all external stakeholders (citizens, businesses, other agencies).</li>
          <li>Each stakeholder can have multiple transactions or services — add as many as needed.</li>
          <li>
            Rate each transaction: <strong>Simple</strong> (routine), <strong>Complex</strong>{" "}
            (multi-step), or <strong>Highly Technical</strong> (specialized expertise required).
          </li>
        </ul>
      </div>

      {/* Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">Stakeholders</CardTitle>
              <CardDescription className="mt-1">
                {stakeholders.length} stakeholder{stakeholders.length !== 1 ? "s" : ""} added
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <ViewToggle mode={viewMode} onChange={switchMode} />
              </div>
              {viewMode === "table" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setTableEditing((e) => !e)}
                >
                  {tableEditing ? "Done editing" : (<><Pencil className="h-3.5 w-3.5" />Edit table</>)}
                </Button>
              )}
              {canAddStakeholder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={viewMode === "list" ? openDrawerNew : addStakeholder}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add Stakeholder
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* ── Table mode (desktop only) ─────────────────────────────────── */}
          {/* Grouped by direction per stakeholder, matching the PDF's INCOMING:/OUTGOING:
              layout — direction is a group label, not a per-row control, so it's set
              once per group (via the group's own "Add" button, or a one-click "move"
              for reclassifying) instead of repeating a 2-way toggle on every row. */}
          {viewMode === "table" && (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border px-3 py-2 text-left font-semibold w-52">
                      Stakeholder / Client
                    </th>
                    <th className="border px-3 py-2 text-left font-semibold">
                      Transaction Processed
                    </th>
                    <th className="border px-3 py-2 text-left font-semibold w-44">
                      Complexity
                    </th>
                    {tableEditing && <th className="border px-3 py-2 w-48" />}
                  </tr>
                </thead>
                <tbody>
                  {stakeholders.length === 0 && (
                    <tr>
                      <td colSpan={tableEditing ? 4 : 3} className="border px-3 py-8 text-center text-muted-foreground text-sm">
                        {tableEditing ? (
                          <>
                            No stakeholders added yet.{" "}
                            <button
                              type="button"
                              onClick={addStakeholder}
                              className="font-medium text-primary hover:underline"
                            >
                              Add the first one.
                            </button>
                          </>
                        ) : (
                          <>
                            No stakeholders added yet.{" "}
                            <button
                              type="button"
                              onClick={() => setTableEditing(true)}
                              className="font-medium text-primary hover:underline"
                            >
                              Turn on editing to add one.
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                  {stakeholders.map((s, sIdx) => {
                    const groups: { key: "INCOMING" | "OUTGOING" | "UNSPECIFIED"; label: string; items: StakeholderService[] }[] = [
                      { key: "INCOMING", label: "Incoming", items: s.services.filter((sv) => sv.direction === "INCOMING") },
                      { key: "OUTGOING", label: "Outgoing", items: s.services.filter((sv) => sv.direction === "OUTGOING") },
                      { key: "UNSPECIFIED", label: "Unspecified", items: s.services.filter((sv) => sv.direction !== "INCOMING" && sv.direction !== "OUTGOING") },
                    ];
                    // Edit mode always offers Incoming/Outgoing (even empty, so there's
                    // somewhere to add into); Unspecified only appears if it has content.
                    // Read mode shows only groups that actually have something to show.
                    const visibleGroups = groups.filter((g) =>
                      tableEditing ? g.key !== "UNSPECIFIED" || g.items.length > 0 : g.items.length > 0
                    );
                    const dataColSpan = tableEditing ? 3 : 2;
                    const totalRows = visibleGroups.reduce(
                      (n, g) => n + 1 + g.items.length + (tableEditing && g.key !== "UNSPECIFIED" ? 1 : 0),
                      0
                    );

                    const nameCell = (span: number) => (
                      <td rowSpan={span} data-reveal-id={s.id} className="border px-2 py-2 align-top w-52">
                        {tableEditing ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              className="w-full rounded px-2 py-1.5 text-sm bg-card/70 hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                              placeholder={`Stakeholder ${sIdx + 1}`}
                              value={s.name}
                              onChange={(e) => updateStakeholderName(s.id, e.target.value)}
                            />
                            <ConfirmDeleteButton
                              ariaLabel="Remove stakeholder"
                              confirmText="Delete stakeholder + services?"
                              onDelete={() => removeStakeholder(s.id)}
                              className="self-start"
                              iconClassName="h-3 w-3"
                            />
                          </div>
                        ) : (
                          <span className="text-sm">
                            {s.name || <span className="italic text-muted-foreground/60">Unnamed stakeholder</span>}
                          </span>
                        )}
                      </td>
                    );

                    if (visibleGroups.length === 0) {
                      // Read mode only — edit mode always has Incoming/Outgoing visible.
                      return (
                        <tr key={s.id} className={sIdx > 0 ? "border-t-2 border-t-border/60" : ""}>
                          {nameCell(1)}
                          <td colSpan={dataColSpan} className="border px-3 py-3 text-center">
                            <span className="text-xs italic text-muted-foreground">No services listed.</span>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <Fragment key={s.id}>
                        {visibleGroups.map((g, gi) => (
                          <Fragment key={g.key}>
                            <tr className={gi === 0 && sIdx > 0 ? "border-t-2 border-t-border/60" : ""}>
                              {gi === 0 && nameCell(totalRows)}
                              <td colSpan={dataColSpan} className="border px-3 py-1.5 bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {g.label}
                              </td>
                            </tr>
                            {g.items.map((sv) => (
                              <tr key={sv.id}>
                                <td className="border px-2 py-1">
                                  {tableEditing ? (
                                    <input
                                      type="text"
                                      className="w-full rounded px-2 py-1.5 text-sm bg-card/70 hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                                      placeholder="Describe transaction / service..."
                                      value={sv.name}
                                      onChange={(e) => updateService(s.id, sv.id, "name", e.target.value)}
                                    />
                                  ) : (
                                    <span className="px-2 py-1.5 block text-sm">
                                      {sv.name || <span className="italic text-muted-foreground/60">Untitled transaction</span>}
                                    </span>
                                  )}
                                </td>
                                <td className="border px-2 py-1">
                                  {tableEditing ? (
                                    <Select
                                      items={COMPLEXITY_OPTIONS}
                                      value={sv.complexity}
                                      onValueChange={(v: string | null) =>
                                        v && updateService(s.id, sv.id, "complexity", v)
                                      }
                                    >
                                      <SelectTrigger className="h-8 border-0 bg-card/70 shadow-none hover:bg-card focus:ring-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {COMPLEXITY_OPTIONS.map((o) => (
                                          <SelectItem key={o.value} value={o.value}>
                                            <span className="flex flex-col gap-0.5">
                                              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${COMPLEXITY_COLORS[o.value]}`}>
                                                {o.label}
                                              </span>
                                              <span className="text-xs text-muted-foreground">{o.hint}</span>
                                            </span>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className={`inline-block text-xs rounded px-1.5 py-0.5 font-medium ${COMPLEXITY_COLORS[sv.complexity]}`}>
                                      {sv.complexity}
                                    </span>
                                  )}
                                </td>
                                {tableEditing && (
                                  <td className="border px-2 py-1">
                                    <div className="flex items-center justify-center gap-1">
                                      {g.key === "UNSPECIFIED" ? (
                                        <DirectionToggle
                                          value={sv.direction}
                                          onChange={(d) => updateService(s.id, sv.id, "direction", d)}
                                        />
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          aria-label={g.key === "INCOMING" ? "Move to Outgoing" : "Move to Incoming"}
                                          title={g.key === "INCOMING" ? "Move to Outgoing" : "Move to Incoming"}
                                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                          onClick={() => updateService(s.id, sv.id, "direction", g.key === "INCOMING" ? "OUTGOING" : "INCOMING")}
                                        >
                                          {g.key === "INCOMING"
                                            ? <ArrowUpFromLine className="h-3.5 w-3.5" />
                                            : <ArrowDownToLine className="h-3.5 w-3.5" />}
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Remove service"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeService(s.id, sv.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                            {tableEditing && g.key !== "UNSPECIFIED" && (
                              <tr>
                                <td colSpan={dataColSpan} className="border px-3 py-1.5 bg-muted/20">
                                  <button
                                    type="button"
                                    onClick={() => addService(s.id, g.key as "INCOMING" | "OUTGOING")}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add {g.label.toLowerCase()} service
                                  </button>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── List mode (all screens) + mobile fallback for Table ─────────── */}
          {/* Shows when: viewMode === "list" on any screen, OR on mobile for Table mode */}
          <div className={viewMode === "list" ? "block" : "md:hidden"}>
            {stakeholders.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/30 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No stakeholders yet.{" "}
                  <button
                    type="button"
                    onClick={openDrawerNew}
                    className="font-medium text-primary hover:underline"
                  >
                    Add one.
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {stakeholders.map((s, sIdx) => {
                  const isOpen = openIds.has(s.id);
                  return (
                    <div key={s.id} data-reveal-id={s.id} className="rounded-lg border overflow-hidden">
                      {/* Row header — read-only identity + expand affordance (principle 2).
                          Deliberately no badges/chips here: same plain row on every screen
                          size, detail only appears once expanded. */}
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20">
                        <span className="text-xs text-muted-foreground shrink-0 w-5 tabular-nums">
                          {sIdx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleOpen(s.id)}
                          className="flex-1 min-w-0 flex items-center gap-2 text-left"
                        >
                          <span className="text-sm font-medium truncate">
                            {s.name || <span className="italic text-muted-foreground/60">Unnamed stakeholder</span>}
                          </span>
                        </button>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {s.services.length} service{s.services.length !== 1 ? "s" : ""}
                        </span>
                        <button
                          type="button"
                          aria-label="Edit stakeholder"
                          onClick={() => openDrawerEdit(s.id)}
                          className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={isOpen ? "Collapse" : "Expand"}
                          onClick={() => toggleOpen(s.id)}
                          className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>

                      {/* Expanded body — read view only; editing happens in the drawer */}
                      <div
                        className={`grid transition-all duration-200 ease-in-out ${
                          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="border-t">
                            <StakeholderReadView stakeholder={s} onEdit={() => openDrawerEdit(s.id)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Drawer — the single edit surface for List view */}
      <StakeholderDrawer
        open={drawer.open}
        stakeholder={drawerStakeholder}
        isNew={drawerIsNew}
        onSave={handleDrawerSave}
        onDelete={handleDrawerDelete}
        onClose={closeDrawer}
      />
    </SectionShell>
  );
}
