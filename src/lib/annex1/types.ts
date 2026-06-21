// ─── Office Identity ──────────────────────────────────────────────────────────

export type OfficeType = "central" | "regional" | "field";

export const PHILIPPINE_REGIONS = [
  { code: "NCR",         name: "National Capital Region" },
  { code: "CAR",         name: "Cordillera Administrative Region" },
  { code: "Region I",    name: "Ilocos Region" },
  { code: "Region II",   name: "Cagayan Valley" },
  { code: "Region III",  name: "Central Luzon" },
  { code: "Region IV-A", name: "CALABARZON" },
  { code: "Region IV-B", name: "MIMAROPA" },
  { code: "Region V",    name: "Bicol Region" },
  { code: "Region VI",   name: "Western Visayas" },
  { code: "Region VII",  name: "Central Visayas" },
  { code: "Region VIII", name: "Eastern Visayas" },
  { code: "Region IX",   name: "Zamboanga Peninsula" },
  { code: "Region X",    name: "Northern Mindanao" },
  { code: "Region XI",   name: "Davao Region" },
  { code: "Region XII",  name: "SOCCSKSARGEN" },
  { code: "Region XIII", name: "Caraga" },
  { code: "BARMM",       name: "Bangsamoro Autonomous Region in Muslim Mindanao" },
] as const;

export type PhilippineRegionCode = typeof PHILIPPINE_REGIONS[number]["code"];

export interface OfficeIdentity {
  type: OfficeType;
  region?: PhilippineRegionCode;
  /** Descriptive name — required for field offices, auto-set for others. */
  name: string;
  displayLabel: string;
}

export function buildDisplayLabel(
  type: OfficeType,
  region: PhilippineRegionCode | undefined,
  name: string
): string {
  if (type === "central") return "Central Office";
  if (type === "regional") return `Regional Office — ${region ?? ""}`;
  return `Field Office — ${name}`;
}

// ─── Inventory rows ───────────────────────────────────────────────────────────

export interface EquipmentCounts {
  operational: number;
  endOfLife: number;
  backup: number;
}

export interface EquipmentRow {
  id: string;
  type: string;
  isCustom: boolean;
  centralOffice: EquipmentCounts;
  fieldOffice: EquipmentCounts;
}

export interface SoftwareCounts {
  perpetual: number;
  subscription: number;
}

export interface SoftwareRow {
  id: string;
  type: string;
  isCustom: boolean;
  centralOffice: SoftwareCounts;
  fieldOffice: SoftwareCounts;
}

// ─── Annex 1 document ─────────────────────────────────────────────────────────

export interface Annex1Data {
  equipment: EquipmentRow[];
  software: SoftwareRow[];
}

export interface Annex1FilePayload {
  version: "1.0";
  fileType: "annex1";
  exportedAt: string;
  tool: "issp-platform";
  office: OfficeIdentity;
  annex1: Annex1Data;
}

// ─── Default rows ─────────────────────────────────────────────────────────────

const ZERO_EQUIP: EquipmentCounts = { operational: 0, endOfLife: 0, backup: 0 };
const ZERO_SW: SoftwareCounts = { perpetual: 0, subscription: 0 };

const FIXED_EQUIPMENT_TYPES = [
  "Servers",
  "Desktop",
  "Laptop",
  "Mobile Phone",
  "Tablet",
  "Printer",
  "Network Switch",
];

const FIXED_SOFTWARE_TYPES = [
  "Office Productivity Tool",
  "Grammar checker",
  "Graphics and Simulation Software",
  "Antivirus",
  "IT Help Desk Tool",
  "Photo and Video Editing Software",
  "Web Application Firewall",
];

export function defaultEquipmentRows(): EquipmentRow[] {
  return [
    ...FIXED_EQUIPMENT_TYPES.map((type, i) => ({
      id: `equip-fixed-${i}`,
      type,
      isCustom: false,
      centralOffice: { ...ZERO_EQUIP },
      fieldOffice: { ...ZERO_EQUIP },
    })),
    {
      id: "equip-others",
      type: "Others, please specify",
      isCustom: true,
      centralOffice: { ...ZERO_EQUIP },
      fieldOffice: { ...ZERO_EQUIP },
    },
  ];
}

export function defaultSoftwareRows(): SoftwareRow[] {
  return [
    ...FIXED_SOFTWARE_TYPES.map((type, i) => ({
      id: `sw-fixed-${i}`,
      type,
      isCustom: false,
      centralOffice: { ...ZERO_SW },
      fieldOffice: { ...ZERO_SW },
    })),
    {
      id: "sw-others",
      type: "Others, please specify",
      isCustom: true,
      centralOffice: { ...ZERO_SW },
      fieldOffice: { ...ZERO_SW },
    },
  ];
}
