"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

const SCOPE_OPTIONS = [
  { value: "DEPARTMENT_WIDE", label: "Department-Wide" },
  { value: "DEPARTMENT_CENTRAL_ONLY", label: "Department (Central Only)" },
  { value: "CENTRAL_ONLY", label: "Central Office Only" },
  { value: "WITH_REGIONAL", label: "With Regional Offices" },
  { value: "WITH_BUREAUS", label: "With Bureaus" },
  { value: "AGENCY_WIDE", label: "Agency-Wide" },
  { value: "AGENCY_CENTRAL_ONLY", label: "Agency (Central Only)" },
  { value: "AGENCY_WITH_REGIONAL", label: "Agency With Regional" },
  { value: "OTHER_GOVERNMENT_ENTITY", label: "Other Government Entity" },
  { value: "LGU_SCOPE", label: "LGU" },
];

const CURRENT_YEAR = new Date().getFullYear();

interface CreateDocumentDialogProps {
  onCreated?: () => void;
}

export function CreateDocumentDialog({ onCreated }: CreateDocumentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    startYear: String(CURRENT_YEAR),
    endYear: String(CURRENT_YEAR + 2),
    scope: "DEPARTMENT_WIDE",
    amendmentNumber: "0",
  });

  function handleChange(key: string, value: string) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      // Auto-update title if not manually changed
      if (key === "startYear" || key === "endYear") {
        const sy = key === "startYear" ? value : prev.startYear;
        const ey = key === "endYear" ? value : prev.endYear;
        if (!prev.title || prev.title.match(/ISSP \d{4}-\d{4}/)) {
          updated.title = `ISSP ${sy}-${ey}`;
        }
      }
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/issp/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create document");
      }

      const doc = await res.json();
      setOpen(false);
      onCreated?.();
      router.push(`/dashboard/documents/${doc.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" />New ISSP Document</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New ISSP Document</DialogTitle>
          <DialogDescription>
            Start a new Information Systems Strategic Plan for your agency.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-doc-title">Document Title</Label>
            <Input
              id="new-doc-title"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g. ISSP 2026-2028"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-doc-start">Start Year</Label>
              <Input
                id="new-doc-start"
                type="number"
                min={2020}
                max={2040}
                value={form.startYear}
                onChange={(e) => handleChange("startYear", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-doc-end">End Year</Label>
              <Input
                id="new-doc-end"
                type="number"
                min={2020}
                max={2040}
                value={form.endYear}
                onChange={(e) => handleChange("endYear", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-doc-scope">ISSP Scope</Label>
            <Select
              value={form.scope}
              onValueChange={(v) => v && handleChange("scope", v)}
            >
              <SelectTrigger id="new-doc-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-doc-amendment">Amendment Number</Label>
            <Select
              value={form.amendmentNumber}
              onValueChange={(v) => v && handleChange("amendmentNumber", v)}
            >
              <SelectTrigger id="new-doc-amendment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Regular ISSP (0)</SelectItem>
                <SelectItem value="1">1st Amendment</SelectItem>
                <SelectItem value="2">2nd Amendment</SelectItem>
                <SelectItem value="3">3rd Amendment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
