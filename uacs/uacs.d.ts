/**
 * UACS (Unified Accounts Code Structure) - Philippine Government Chart of Accounts
 * Source: List_of_Sub-Object_Code_20260515
 * 1,262 active entries | 28 inactive entries
 */

export type UACSClassification =
  | "Assets"
  | "Liabilities"
  | "Equity"
  | "Revenue/Income"
  | "Expenses";

export interface UACSEntry {
  /** 10-digit UACS code (string to preserve leading structure) */
  uacs: string;
  /** Most specific display name — best field for labels/dropdowns */
  label: string;
  classification: UACSClassification;
  /** 2nd-level grouping (e.g. "Cash and Cash Equivalents") */
  sub_class: string;
  /** 3rd-level grouping (e.g. "Cash on Hand") */
  group: string;
  /** 4th-level (e.g. "Cash - Collecting Officers") */
  object_code: string;
  /** Most granular level — often same as object_code for leaf nodes */
  sub_object_code: string;
  /** true = Active, false = Inactive. Only present in uacs_full.json */
  active?: boolean;
}

/** Build a lookup map from a UACS entries array */
export type UACSLookup = Record<string, UACSEntry>;

// Usage examples:
//
// import uacs from './uacs_active.json';
// const lookup: UACSLookup = Object.fromEntries(uacs.map(e => [e.uacs, e]));
//
// // Lookup by code
// const entry = lookup['5020101000'];
// console.log(entry.label); // "Basic Salary"
//
// // Filter by classification
// const expenses = uacs.filter(e => e.classification === 'Expenses');
//
// // Search by label
// const results = uacs.filter(e => e.label.toLowerCase().includes('salary'));
//
// // Get all PS codes (starts with 501)
// const ps = uacs.filter(e => e.uacs.startsWith('501'));
