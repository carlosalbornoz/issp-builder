"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { MITHI_ADVISORIES } from "@/lib/mithi-advisories";

// Slow rotation — this sits in the header chrome, so calm beats attention-grabbing.
const ROTATE_MS = 8000;

export function MithiTicker() {
  const items = MITHI_ADVISORIES;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (items.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [items.length, paused]);

  if (items.length === 0) return null;
  const current = items[idx % items.length];

  return (
    <a
      href={current.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`MITHI ${current.label} — ${current.title} (${current.date}). Opens the DBM website.`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="group flex min-w-0 max-w-[20rem] items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <Megaphone className="h-3 w-3 shrink-0 text-primary" />
      <span className="shrink-0 font-semibold text-foreground/80">MITHI</span>
      <span className="truncate">{current.title}</span>
    </a>
  );
}
