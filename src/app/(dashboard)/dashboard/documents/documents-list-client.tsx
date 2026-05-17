"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateDocumentDialog } from "@/components/documents/create-document-dialog";
import { FileText, Clock, User, ChevronRight, Inbox, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

type DocStatus = "DRAFT" | "REVIEW" | "SUBMITTED" | "APPROVED";

interface DocSummary {
  id: string;
  title: string;
  startYear: number;
  endYear: number;
  status: DocStatus;
  amendmentNumber: number;
  scope: string;
  createdAt: string;
  updatedAt: string;
  creatorName: string;
}

interface UserInfo {
  name: string;
  email: string;
  role: string;
  agencyName: string;
}

const STATUS_CONFIG: Record<DocStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; color: string }> = {
  DRAFT:     { label: "Draft",       variant: "secondary", color: "bg-slate-100 text-slate-700 border-slate-200" },
  REVIEW:    { label: "Under Review", variant: "outline",  color: "bg-amber-50  text-amber-700  border-amber-200" },
  SUBMITTED: { label: "Submitted",   variant: "default",   color: "bg-blue-50   text-blue-700   border-blue-200"  },
  APPROVED:  { label: "Approved",    variant: "default",   color: "bg-green-50  text-green-700  border-green-200" },
};

function scopeLabel(scope: string) {
  return scope.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

interface DocumentsListClientProps {
  initialDocs: DocSummary[];
  user: UserInfo;
}

export function DocumentsListClient({ initialDocs, user }: DocumentsListClientProps) {
  const [docs, setDocs] = useState<DocSummary[]>(initialDocs);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/issp/documents");
    if (res.ok) {
      const data = await res.json();
      setDocs(data);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/60 flex flex-col">
      {/* ── Top Navbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          {/* Branding */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold tracking-tight text-sm">ISSP Builder</span>
            <span className="text-muted-foreground/50 text-sm hidden sm:inline">·</span>
            <span className="text-muted-foreground text-xs hidden sm:inline">{user.agencyName}</span>
          </div>

          {/* User + Sign out */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-muted-foreground">{user.email}</span>
            <Badge variant="secondary" className="text-[11px]">{user.role}</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground h-8"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Page Content ───────────────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-10 space-y-8">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ISSP Documents</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your agency&apos;s Information Systems Strategic Plans.
            </p>
          </div>
          <CreateDocumentDialog onCreated={refresh} />
        </div>

        {/* Empty state */}
        {docs.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-white py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
              <Inbox className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="text-base font-semibold">No documents yet</h3>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
              Create your first ISSP document to start filling in your agency&apos;s 3-year ICT strategy.
            </p>
            <div className="mt-6">
              <CreateDocumentDialog onCreated={refresh} />
            </div>
          </div>
        )}

        {/* Document list */}
        {docs.length > 0 && (
          <div className="grid gap-3">
            {docs.map((doc) => {
              const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.DRAFT;
              return (
                <Link key={doc.id} href={`/dashboard/documents/${doc.id}`}>
                  <Card className="transition-all hover:shadow-md hover:border-primary/25 cursor-pointer group bg-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                              {doc.title}
                              {doc.amendmentNumber > 0 && (
                                <span className="ml-2 text-xs text-muted-foreground font-normal">
                                  (Amendment #{doc.amendmentNumber})
                                </span>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-0.5 text-xs">
                              {doc.startYear}–{doc.endYear} · {scopeLabel(doc.scope)}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {doc.creatorName}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Updated {formatDate(doc.updatedAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <footer className="mt-auto py-5 text-center text-xs text-muted-foreground/60 select-none">
        Crafted with ❤️ <em>para sa bayan</em> by Carlos Antonio Albornoz
      </footer>
    </div>
  );
}
