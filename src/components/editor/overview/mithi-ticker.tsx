"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { MITHI_ADVISORIES } from "@/lib/mithi-advisories";

const ROTATE_MS = 5000;
const SLIDE_MS = 600;
const LINE_REM = 1.25; // matches h-5 / leading-5

/** A vertical news ticker: each advisory line slides up to reveal the next. An appended
 *  clone of the first item lets the wrap from last→first keep moving up seamlessly. */
export function MithiTicker() {
  const items = MITHI_ADVISORIES;
  const n = items.length;
  const [idx, setIdx] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (n < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIdx((i) => i + 1), ROTATE_MS);
    return () => clearInterval(t);
  }, [n, paused]);

  // Landed on the appended clone — snap back to the real first item without a transition.
  useEffect(() => {
    if (idx !== n) return;
    const t = setTimeout(() => {
      setAnimating(false);
      setIdx(0);
    }, SLIDE_MS);
    return () => clearTimeout(t);
  }, [idx, n]);

  // Re-enable the slide on the frame after a snap.
  useEffect(() => {
    if (animating) return;
    const r = requestAnimationFrame(() => setAnimating(true));
    return () => cancelAnimationFrame(r);
  }, [animating]);

  if (n === 0) return null;
  const current = items[idx % n];
  const rendered = [...items, items[0]];

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xs">
      <Megaphone className="h-3 w-3 shrink-0 text-primary" />
      <span className="shrink-0 font-semibold uppercase tracking-wide text-foreground/55">Advisory:</span>
      <a
        href={current.url}
        target="_blank"
        rel="noopener noreferrer"
        title={`MITHI ${current.label} — ${current.title} (${current.date}). Opens the DBM website.`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        className="block h-5 max-w-[24rem] min-w-0 overflow-hidden text-muted-foreground hover:text-foreground"
      >
        <div
          style={{
            transform: `translateY(-${idx * LINE_REM}rem)`,
            transition: animating ? `transform ${SLIDE_MS}ms ease` : "none",
          }}
        >
          {rendered.map((item, i) => (
            <div key={i} className="flex h-5 items-center gap-1.5 leading-5">
              <span className="shrink-0 font-semibold text-foreground/80">MITHI {item.label}</span>
              <span className="min-w-0 truncate">{item.title}</span>
            </div>
          ))}
        </div>
      </a>
    </div>
  );
}
