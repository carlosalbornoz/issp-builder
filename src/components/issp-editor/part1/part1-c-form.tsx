"use client";

import { Fragment, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Trash2, Pencil, Table2, LayoutList, LayoutGrid, ChevronDown } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { SectionShell } from "@/components/editor/section-shell";
import { revealNewItem } from "@/lib/reveal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StakeholderService {
  id: string;
  name: string;
  complexity: "Simple" | "Complex" | "Highly Technical";
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
  return { id: generateId(), name: "", complexity: "Simple" };
}

function makeStakeholder(): Stakeholder {
  return { id: generateId(), name: "", services: [makeService()] };
}

// ─── Stakeholder Drawer (Cards mode) ─────────────────────────────────────────

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
  const [services, setServices] = useState<StakeholderService[]>(
    () => stakeholder?.services?.length ? stakeholder.services : [makeService()]
  );

  // Re-initialize from props each time the drawer opens (or the target changes
  // while open). Adjusting state during render avoids an extra effect pass.
  const [prevSession, setPrevSession] = useState<{ open: boolean; stakeholder: Stakeholder | null }>({ open, stakeholder });
  if (open !== prevSession.open || stakeholder !== prevSession.stakeholder) {
    setPrevSession({ open, stakeholder });
    if (open) {
      setName(stakeholder?.name ?? "");
      setServices(stakeholder?.services?.length ? stakeholder.services : [makeService()]);
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
            {services.map((sv, idx) => (
              <div key={sv.id} className="rounded-md border bg-muted/20 p-3 space-y-2">
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
                    disabled={services.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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

// ─── View mode toggle ─────────────────────────────────────────────────────────

const LS_KEY = "issp-part1c-view";

type ViewMode = "table" | "cards" | "summary";

const VIEW_OPTIONS: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
  { mode: "table",   label: "Table",   icon: <Table2      className="h-3 w-3" /> },
  { mode: "cards",   label: "Cards",   icon: <LayoutGrid  className="h-3 w-3" /> },
  { mode: "summary", label: "Summary", icon: <LayoutList  className="h-3 w-3" /> },
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

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(LS_KEY) as ViewMode) ?? "table"; } catch { return "table"; }
  });

  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(initialData.map((s) => s.id).filter(Boolean))
  );

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
    setOpenIds((prev) => new Set([...prev, s.id]));
    revealNewItem(s.id);
  }

  function removeStakeholder(id: string) {
    update(stakeholders.filter((s) => s.id !== id));
  }

  function updateStakeholderName(id: string, name: string) {
    update(stakeholders.map((s) => (s.id === id ? { ...s, name } : s)));
  }

  function addService(stakeholderId: string) {
    update(
      stakeholders.map((s) =>
        s.id === stakeholderId ? { ...s, services: [...s.services, makeService()] } : s
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

  // ── Cards mode (drawer) actions ─────────────────────────────────────────────

  const drawerIsNew = drawer.id === "new";
  const drawerStakeholder = drawerIsNew ? null : stakeholders.find((s) => s.id === drawer.id) ?? null;

  function openDrawerNew() { setDrawer({ open: true, id: "new" }); }
  function openDrawerEdit(id: string) { setDrawer({ open: true, id }); }
  function closeDrawer() { setDrawer({ open: false, id: null }); }

  function handleDrawerSave(s: Stakeholder) {
    if (drawerIsNew) {
      update([...stakeholders, s]);
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
              <Button
                variant="outline"
                size="sm"
                onClick={viewMode === "summary" ? openDrawerNew : addStakeholder}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Stakeholder
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* ── Table mode (desktop only) ─────────────────────────────────── */}
          {viewMode === "table" && (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border px-3 py-2 text-left font-semibold w-52">
                      Stakeholder / Client
                    </th>
                    <th className="border px-3 py-2 text-left font-semibold">
                      Transaction / Service
                    </th>
                    <th className="border px-3 py-2 text-left font-semibold w-44">
                      Complexity
                    </th>
                    <th className="border px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {stakeholders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="border px-3 py-8 text-center text-muted-foreground text-sm">
                        No stakeholders added yet.{" "}
                        <button
                          type="button"
                          onClick={addStakeholder}
                          className="font-medium text-primary hover:underline"
                        >
                          Add the first one.
                        </button>
                      </td>
                    </tr>
                  )}
                  {stakeholders.map((s, sIdx) => {
                    const hasServices = s.services.length > 0;
                    const rowSpan = s.services.length + 1;

                    const nameCell = (span: number) => (
                      <td rowSpan={span} data-reveal-id={s.id} className="border px-2 py-2 align-top w-52">
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
                      </td>
                    );

                    return (
                      <Fragment key={s.id}>
                        {!hasServices ? (
                          <tr className={sIdx > 0 ? "border-t-2 border-t-border/60" : ""}>
                            {nameCell(1)}
                            <td colSpan={3} className="border px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => addService(s.id)}
                                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 mx-auto"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add first service
                              </button>
                            </td>
                          </tr>
                        ) : (
                          <>
                            {s.services.map((sv, svIdx) => (
                              <tr
                                key={sv.id}
                                className={svIdx === 0 && sIdx > 0 ? "border-t-2 border-t-border/60" : ""}
                              >
                                {svIdx === 0 && nameCell(rowSpan)}
                                <td className="border px-2 py-1">
                                  <input
                                    type="text"
                                    className="w-full rounded px-2 py-1.5 text-sm bg-card/70 hover:bg-card focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                                    placeholder="Describe transaction / service..."
                                    value={sv.name}
                                    onChange={(e) => updateService(s.id, sv.id, "name", e.target.value)}
                                  />
                                </td>
                                <td className="border px-2 py-1">
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
                                </td>
                                <td className="border px-2 py-2 text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Remove service"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeService(s.id, sv.id)}
                                    disabled={s.services.length <= 1}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                            <tr>
                              <td colSpan={3} className="border px-3 py-1.5 bg-muted/20">
                                <button
                                  type="button"
                                  onClick={() => addService(s.id)}
                                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add service
                                </button>
                              </td>
                            </tr>
                          </>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Cards mode (all screens) + mobile fallback ────────────────── */}
          {/* Shows when: viewMode === "cards" on any screen, OR on mobile for any mode */}
          <div className={viewMode === "cards" ? "block" : "md:hidden"}>
            <div className="space-y-2">
              {stakeholders.length === 0 && (
                <div className="rounded-lg border border-dashed bg-muted/30 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No stakeholders yet.{" "}
                    <button
                      type="button"
                      onClick={addStakeholder}
                      className="font-medium text-primary hover:underline"
                    >
                      Add one.
                    </button>
                  </p>
                </div>
              )}
              {stakeholders.map((s, sIdx) => {
                const isOpen = openIds.has(s.id);
                return (
                  <div key={s.id} data-reveal-id={s.id} className="rounded-lg border overflow-hidden">
                    {/* Accordion header */}
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20">
                      <span className="text-xs text-muted-foreground shrink-0 w-5 tabular-nums">
                        {sIdx + 1}
                      </span>
                      <Input
                        placeholder="e.g., Citizens, Businesses"
                        value={s.name}
                        className="flex-1 h-8 text-sm"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateStakeholderName(s.id, e.target.value)}
                      />
                      {/* Collapsed summary badges */}
                      {!isOpen && s.services.length > 0 && (
                        <div className="hidden sm:flex gap-1 shrink-0">
                          {s.services.slice(0, 2).map((sv) => (
                            <span
                              key={sv.id}
                              className={`text-xs rounded px-1.5 py-0.5 font-medium ${COMPLEXITY_COLORS[sv.complexity]}`}
                            >
                              {sv.complexity === "Highly Technical" ? "H.Tech" : sv.complexity}
                            </span>
                          ))}
                          {s.services.length > 2 && (
                            <span className="text-xs rounded px-1.5 py-0.5 font-medium bg-muted text-muted-foreground">
                              +{s.services.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                      {!isOpen && (
                        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                          {s.services.length} svc
                        </span>
                      )}
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
                      <ConfirmDeleteButton
                        ariaLabel="Remove stakeholder"
                        confirmText="Delete?"
                        onDelete={() => removeStakeholder(s.id)}
                      />
                    </div>

                    {/* Accordion body */}
                    <div
                      className={`grid transition-all duration-200 ease-in-out ${
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-3 pt-3 pb-3 space-y-2 border-t">
                          <Label className="text-xs font-medium text-muted-foreground">
                            Transactions / Services
                          </Label>
                          {s.services.map((sv) => (
                            <div key={sv.id} className="rounded-md border bg-muted/20 p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  className="flex-1 text-sm"
                                  placeholder="Describe transaction or service..."
                                  value={sv.name}
                                  onChange={(e) => updateService(s.id, sv.id, "name", e.target.value)}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeService(s.id, sv.id)}
                                  disabled={s.services.length <= 1}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <Select
                                items={COMPLEXITY_OPTIONS}
                                value={sv.complexity}
                                onValueChange={(v: string | null) =>
                                  v && updateService(s.id, sv.id, "complexity", v)
                                }
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {COMPLEXITY_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addService(s.id)}
                            className="w-full gap-1.5 text-xs text-muted-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add service
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Summary mode (desktop only) ────────────────────────────────── */}
          {viewMode === "summary" && (
            <div className="hidden md:block">
              {stakeholders.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/30 py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No stakeholders yet.{" "}
                    <button
                      type="button"
                      onClick={openDrawerNew}
                      className="font-medium text-primary hover:underline"
                    >
                      Add the first one.
                    </button>
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <div className="divide-y">
                    {stakeholders.map((s, sIdx) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 group cursor-pointer transition-colors"
                        onClick={() => openDrawerEdit(s.id)}
                      >
                        <span className="text-xs text-muted-foreground w-5 shrink-0 tabular-nums">
                          {sIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2 break-words">
                            {s.name || (
                              <span className="italic text-muted-foreground/60">
                                Unnamed stakeholder
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {s.services.length} service{s.services.length !== 1 ? "s" : ""}
                            {s.services[0]?.name ? ` · ${s.services[0].name}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0 flex-wrap justify-end max-w-40">
                          {s.services.slice(0, 3).map((sv) => (
                            <span
                              key={sv.id}
                              className={`text-xs rounded px-1.5 py-0.5 font-medium ${COMPLEXITY_COLORS[sv.complexity]}`}
                            >
                              {sv.complexity === "Highly Technical" ? "H.Tech" : sv.complexity}
                            </span>
                          ))}
                          {s.services.length > 3 && (
                            <span className="text-xs rounded px-1.5 py-0.5 font-medium bg-muted text-muted-foreground">
                              +{s.services.length - 3}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label="Edit stakeholder"
                          className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
                          onClick={(e) => { e.stopPropagation(); openDrawerEdit(s.id); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer — only used in Summary mode */}
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
