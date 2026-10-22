/**
 * The data standard's capability matrix: which dashboard views today's ISSP
 * form already feeds, and which wait on one form refinement or the execution
 * link. Shared by the data-standard page and the dashboard's Home card.
 */

export const CAPABILITY_MATRIX = [
  {
    tier: "Extracted from the current form, today",
    rows: [
      { view: "B.1–B.4 summaries, by-year / category / fund charts, rankings, drill-down, CSV export", needs: "Part IV line items (item, office, qty, unit cost, category, fund source)" },
      { view: "Whole-of-government posture grid: cyber controls, cloud share, continuing share (per PDP sector)", needs: "Part II-B checklist · II-C/III-D storage fields · Part IV buckets" },
      { view: "Domain spend roll-ups (devices · networks · cloud & software · people)", needs: "the 30 DICT expense categories, grouped" },
      { view: "Duplication watch, cross-agency programs, alignment share", needs: "Part II-C systems · Part III-D/III-E links and tags" },
      { view: "Unit-price sanity across agencies", needs: "item + qty + unitCost (no new fields)" },
      { view: "Plan-quality checks (KPI completeness, category coverage)", needs: "Parts III-E / III-F / IV" },
    ],
  },
  {
    tier: "Unlocked by one form refinement each (v15 candidates)",
    rows: [
      { view: "AI & compute domain view (own-build vs shared)", needs: "AI / compute tag per project" },
      { view: "Cybersecurity spend column (what the security budget buys)", needs: "Security tag per project or line item" },
      { view: "Fleet exposure and advisory blast-radius answers", needs: "Annex 1 asset inventory as structured fields" },
      { view: "ICT posture per functional sector, PDP-aligned (mock lens today)", needs: "PDP sector code per agency" },
      { view: "Exact agency match, no name guessing", needs: "UACS organization code" },
    ],
  },
  {
    tier: "Unlocked by the execution loop (agency portal + COMPASS link)",
    rows: [
      { view: "Follow-the-peso funnels, absorptive capacity, request vs allotment", needs: "UACS PAP code per project + a COMPASS feed" },
      { view: "Procurement pulse (has funded work started?)", needs: "Procurement stage per project (agency portal / PhilGEPS)" },
      { view: "Results against targets (actuals vs baselines)", needs: "KPI actuals per year + DIME" },
    ],
  },
] as const;

/** Refinements proposed beyond today's form (every tier after the first). */
export const PROPOSED_REFINEMENT_COUNT = CAPABILITY_MATRIX.slice(1).reduce((n, tier) => n + tier.rows.length, 0);
