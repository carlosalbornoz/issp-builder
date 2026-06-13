"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { IsspDocument } from "@/lib/store";
import { CompletionBar } from "@/components/ui/completion-bar";
import { Menu } from "lucide-react";
import { useEditorMobileSidebar } from "@/components/editor/editor-mobile-sidebar-context";

// Greetings from across the archipelago, keyed to the time of day. Typed out and cycled
// (see useTypewriter). Order per bucket: Tagalog, Cebuano, Ilocano, Hiligaynon, Bicol,
// Waray, Kapampangan, Pangasinan, Chavacano, Kinaray-a, Ibatan, Tausug, Ibanag.
type Bucket = "morning" | "afternoon" | "evening";

const GREETINGS_BY_BUCKET: Record<Bucket, string[]> = {
  morning: [
    "Magandang umaga!",
    "Maayong buntag!",
    "Naimbag a bigat!",
    "Maayo nga aga!",
    "Marhay na aga!",
    "Maupay nga aga!",
    "Mayap a abak!",
    "Masantos ya kabwasan!",
    "Buenas dias!",
    "Mayad nga aga!",
    "Mayad nga agahon!",
    "Marayaw maynaat!",
    "Mapia nga umma nikau!",
  ],
  afternoon: [
    "Magandang hapon!",
    "Maayong hapon!",
    "Naimbag a malem!",
    "Maayo nga hapon!",
    "Marhay na hapon!",
    "Maupay nga kulop!",
    "Mayap a gatpanapun!",
    "Masantos ya ngarem!",
    "Buenas tardes!",
    "Mayad nga hapun!",
    "Mayad nga hapon!",
    "Marayaw mahapun!",
    "Makasta nga aggaw!",
  ],
  evening: [
    "Magandang gabi!",
    "Maayong gabii!",
    "Naimbag a rabii!",
    "Maayo nga gab-i!",
    "Marhay na banggi!",
    "Maupay nga gab-i!",
    "Mayap a bengi!",
    "Masantos ya labi!",
    "Buenas noches!",
    "Mayad nga gabi-i!",
    "Mayad nga gabi-i!",
    "Marayaw dum!",
    "Mapia nga gabi nikau!",
  ],
};

function bucketForHour(hour: number): Bucket {
  if (hour >= 5 && hour < 12) return "morning"; // dawn → just before noon
  if (hour >= 12 && hour < 18) return "afternoon"; // late noon → dusk
  return "evening"; // sunset → late night
}

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

function useGreetingBucket(): Bucket {
  return useSyncExternalStore(
    () => () => {},
    () => bucketForHour(new Date().getHours()),
    () => "morning", // server default; resolves to the user's local time on mount
  );
}

function GreetingTyper({ words, srLabel }: { words: string[]; srLabel: string }) {
  const animate = !usePrefersReducedMotion();
  const display = useTypewriter(words, animate);

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
  const bucket = useGreetingBucket();
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
          <GreetingTyper key={bucket} words={GREETINGS_BY_BUCKET[bucket]} srLabel={planLabel} />
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
