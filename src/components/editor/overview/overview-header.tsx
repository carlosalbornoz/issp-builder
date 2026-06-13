"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { IsspDocument } from "@/lib/store";
import { CompletionBar } from "@/components/ui/completion-bar";
import { Menu } from "lucide-react";
import { useEditorMobileSidebar } from "@/components/editor/editor-mobile-sidebar-context";

// Greetings from across the archipelago — typed out and cycled (see useTypewriter).
const GREETINGS = [
  "Hello there!",
  "Mabuhay, fellow public servant!",
  "Magandang araw!", // Tagalog
  "Maayong buntag!", // Cebuano
  "Naimbag nga aldaw!", // Ilocano
  "Maupay nga adlaw!", // Waray
  "Marhay na aldaw!", // Bikol
  "Mayap a aldo!", // Kapampangan
];

const TYPE_MS = 95;
const DELETE_MS = 45;
const HOLD_MS = 4200;
const CLEAR_MS = 900;

/** Type-then-erase cycle through `words`. Seeded with the first word fully shown
 *  so SSR/first paint never flashes empty. Pass enabled=false to freeze it. */
function useTypewriter(words: string[], enabled: boolean) {
  const [display, setDisplay] = useState(words[0]);
  const [wordIdx, setWordIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const word = words[wordIdx % words.length];
    let delay: number;
    if (!deleting && display === word) delay = HOLD_MS;
    else if (deleting && display === "") delay = CLEAR_MS;
    else delay = deleting ? DELETE_MS : TYPE_MS;

    const t = setTimeout(() => {
      if (!deleting && display === word) {
        setDeleting(true);
      } else if (deleting && display === "") {
        setDeleting(false);
        setWordIdx((i) => (i + 1) % words.length);
      } else {
        setDisplay(deleting ? word.slice(0, display.length - 1) : word.slice(0, display.length + 1));
      }
    }, delay);
    return () => clearTimeout(t);
  }, [display, deleting, wordIdx, words, enabled]);

  return display;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MOTION_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false, // server: assume motion is allowed
  );
}

function GreetingTyper({ srLabel }: { srLabel: string }) {
  const animate = !usePrefersReducedMotion();
  const display = useTypewriter(GREETINGS, animate);

  return (
    <h1 className="min-w-0 font-display text-3xl font-medium tracking-tight leading-tight min-h-[1.2em]">
      <span aria-hidden="true">{display}</span>
      {animate && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[0.85em] w-[2px] translate-y-[0.08em] bg-current animate-caret-blink"
        />
      )}
      <span className="sr-only">{srLabel}</span>
    </h1>
  );
}

export function OverviewHeader({
  doc,
  doneCount,
  totalCount,
}: {
  doc: IsspDocument;
  doneCount: number;
  totalCount: number;
}) {
  const mobileSidebar = useEditorMobileSidebar();
  const agencyName = doc.agency.name || doc.agency.acronym || "Your agency";
  const planLabel = `${agencyName}'s Information Systems Strategic Plan for ${doc.startYear}–${doc.endYear}`;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 items-start gap-2">
        <button
          type="button"
          aria-label="Open editor navigation"
          onClick={mobileSidebar?.openMobileSidebar}
          className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0 space-y-1">
          <GreetingTyper srLabel={planLabel} />
          <p className="text-sm text-muted-foreground">
            You&apos;re currently working on:{" "}
            <span className="font-medium text-foreground">{planLabel}.</span>
          </p>
        </div>
      </div>
      <div className="w-full shrink-0 pt-1.5 sm:w-52">
        <CompletionBar numerator={doneCount} denominator={totalCount} showLabel />
      </div>
    </div>
  );
}
