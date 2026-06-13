/**
 * Latest MITHI (Medium-Term ICT Harmonization Initiative) issuances, shown in the
 * overview advisory ticker. Newest first.
 *
 * This is a **curated** list, not a live scrape: DBM's site isn't an API, a local-first
 * client can't fetch it cross-origin, and the page HTML is brittle. Each entry links to
 * the real DBM page/PDF so the user always lands on the authoritative source. To refresh,
 * check the MITHI landing page (MITHI_INDEX_URL) and prepend new issuances here.
 *
 * Last reviewed: 2026-06-13.
 */

export interface MithiAdvisory {
  /** Short issuance label, e.g. "Resolution No. 2026-01". */
  label: string;
  /** One-line plain-language summary. */
  title: string;
  /** Display date (as published by DBM). */
  date: string;
  /** Canonical DBM URL (article page or PDF). */
  url: string;
}

/** DBM MITHI landing page — "view all" target. */
export const MITHI_INDEX_URL =
  "https://www.dbm.gov.ph/index.php/181-news-updates/292-medium-term-information-and-communication-technology-harmonization-initiative";

export const MITHI_ADVISORIES: MithiAdvisory[] = [
  {
    label: "Resolution No. 2026-01",
    title: "Guidelines for preparing, evaluating, and endorsing FY ICT budget proposals",
    date: "2026",
    url: "https://www.dbm.gov.ph/wp-content/uploads/Issuances/2026/Resolution/MITHI-RESOLUTION-NO-2026-01.pdf",
  },
  {
    label: "Advisory No. 2025-02",
    title: "DICT endorsement of the ISSP no longer required in the budget process",
    date: "May 6, 2025",
    url: "https://www.dbm.gov.ph/wp-content/uploads/Issuances/2025/Resolution/MITHI-ADVISORY-NO.-2025-02-DATED-MAY-06,-2025.pdf",
  },
  {
    label: "Resolution No. 2025-01",
    title: "Revised ISSP template and ICT harmonization guidelines",
    date: "2025",
    url: "https://www.dbm.gov.ph/wp-content/uploads/Issuances/2025/Resolution/MITHI-RESOLUTION-NO.-2025-01.pdf",
  },
  {
    label: "JMC No. 2024-01",
    title: "Revival of MITHI and reconstitution of the Steering Committee (DBM-DICT-NEDA)",
    date: "2024",
    url: "https://www.dbm.gov.ph/wp-content/uploads/Issuances/2024/Joint-Memorandum-Circular/JOINT-MEMORANDUM-CIRCULAR-NO-2024-01-S-2024.pdf",
  },
];
