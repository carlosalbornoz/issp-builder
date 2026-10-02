import type { EgpChecklist, EgpProgram, InformationSystem, PiaProcessAnswer, ProposedSystem } from "@/lib/store/types";

/**
 * Visible values — what the editor shows for a gated field.
 *
 * Forms hide a dependent field when its gate is off (an unticked checkbox, the
 * other Yes/No answer, a different status) but KEEP the stored value, so
 * re-ticking brings the text back. Anything that prints or reports the
 * document (the PDF above all) must read through these helpers, never the raw
 * fields — otherwise it prints values the user can no longer see or edit.
 * Audit: docs/audit-pdf-hidden-values-2026-10-02.md.
 */

type Interoperability = InformationSystem["interoperability"];

/** II-C / III-D: the Internal/External System names belong to "Integration with another system". */
export function visibleInteroperability(i: Interoperability): Interoperability {
  return i.integrated ? i : { ...i, internalSystems: "", externalSystems: "" };
}

/**
 * II-C: "If Yes, did the system undergo PIA?" — answered only under Yes.
 * `null` = not asked (the PDF ticks neither box).
 */
export function visiblePiaCompleted(pia: { processesPersonalInfo: PiaProcessAnswer; piaCompleted: boolean }): boolean | null {
  return pia.processesPersonalInfo === "yes" ? pia.piaCompleted : null;
}

/** III-D: Enhancement Details belong to "For Enhancement" systems only. */
export function visibleEnhancementDetails(sys: Pick<ProposedSystem, "status" | "enhancementDetails">): string {
  return sys.status === "FOR_ENHANCEMENT" ? sys.enhancementDetails : "";
}

type EgpEntry = EgpProgram & {
  adoptionPercentage?: number;
  channels?: string;
  mechanisms?: EgpChecklist["onlinePortal"]["mechanisms"];
  connectedToPortal?: EgpChecklist["onlinePortal"]["connectedToPortal"];
};

/** Rows whose `equivalentName` answers the If-Yes branch (all others: If No → Using equivalent system). */
const EQUIVALENT_ON_YES = new Set<string>(["recordsMgmt"]);

/**
 * II-D: one EGP checklist row as the form shows it.
 * - eLGU exists only for LGU agencies (the form hides the row otherwise).
 * - If-Yes details (eLGU URL, records system name) need the answer Yes.
 * - If-No ticks need the answer No; the equivalent IS name/URL also need
 *   "Using equivalent system" ticked.
 * - The Online Portal row has no URL field.
 * Unconditional template items (PNPKI adoption %, portal mechanisms) pass through.
 */
export function visibleEgpProgram<T extends EgpEntry>(key: string, p: T, agencyType: string): T {
  if (key === "elgu" && agencyType !== "LGU") return { status: "" } as T;
  const yes = p.status === "yes";
  const no = p.status === "no";
  const out: T = { ...p };
  if (key === "onlinePortal" || !yes) delete out.url;
  if (!no) delete out.ifNo;
  if (EQUIVALENT_ON_YES.has(key)) {
    if (!yes) delete out.equivalentName;
  } else if (!(no && p.ifNo?.usingEquivalent)) {
    delete out.equivalentName;
    delete out.equivalentUrl;
  }
  return out;
}
