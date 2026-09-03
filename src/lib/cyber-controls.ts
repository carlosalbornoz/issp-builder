import type { CyberControls } from "@/lib/store/types";

export type CyberGroupKey = keyof CyberControls;

export interface CyberControlItem {
  key: string;
  label: string;
  mandatory: boolean;
}

export interface CyberControlGroup {
  key: CyberGroupKey;
  label: string;
  items: CyberControlItem[];
}

export const CYBER_GROUPS: CyberControlGroup[] = [
  {
    key: "physical",
    label: "Physical Security",
    items: [
      { key: "perimeterProtection", label: "Perimeter protection (fences, barriers)", mandatory: true },
      { key: "accessControl", label: "Physical access control (key cards, locks)", mandatory: true },
      { key: "surveillance", label: "CCTV / surveillance cameras", mandatory: true },
      { key: "detection", label: "Motion / intrusion detection systems", mandatory: false },
    ],
  },
  {
    key: "perimeter",
    label: "Perimeter Security",
    items: [
      { key: "ngfw", label: "Next-Generation Firewall (NGFW)", mandatory: true },
      { key: "idsIps", label: "Intrusion Detection / Prevention System (IDS/IPS)", mandatory: true },
      { key: "waf", label: "Web Application Firewall (WAF)", mandatory: true },
      { key: "dmz", label: "Demilitarized Zone (DMZ)", mandatory: false },
    ],
  },
  {
    key: "network",
    label: "Network Security",
    items: [
      { key: "dataEncryption", label: "Data encryption in transit (TLS/SSL)", mandatory: true },
      { key: "networkSegmentation", label: "Network segmentation / VLANs", mandatory: false },
    ],
  },
  {
    key: "endpoint",
    label: "Endpoint Security",
    items: [
      { key: "antivirus", label: "Antivirus / Anti-malware", mandatory: true },
      { key: "appControl", label: "Application whitelisting / control", mandatory: true },
      { key: "byod", label: "BYOD policy and management", mandatory: true },
      { key: "xdr", label: "Extended Detection & Response (XDR/EDR)", mandatory: false },
    ],
  },
  {
    key: "data",
    label: "Data Security",
    items: [
      { key: "dataClassification", label: "Data classification and labeling", mandatory: true },
      { key: "dlp", label: "Data Loss Prevention (DLP)", mandatory: true },
      { key: "backupRecovery", label: "Regular backup and disaster recovery", mandatory: true },
    ],
  },
  {
    key: "application",
    label: "Application Security",
    items: [
      { key: "securityScanning", label: "Security scanning / code review", mandatory: true },
    ],
  },
  {
    key: "other",
    label: "Other Security Measures",
    items: [
      { key: "vulnAssessment", label: "Vulnerability assessment & management", mandatory: false },
      { key: "patchMgmt", label: "Patch management program", mandatory: false },
      { key: "strongPasswords", label: "Password policy (complexity, rotation)", mandatory: false },
      { key: "mfa", label: "Multi-Factor Authentication (MFA)", mandatory: false },
      { key: "accessReviews", label: "Periodic access reviews / recertification", mandatory: false },
      { key: "securityLogs", label: "Security event logging", mandatory: false },
      { key: "logAnalysis", label: "Log monitoring & analysis", mandatory: false },
      { key: "incidentResponse", label: "Incident response plan", mandatory: false },
      { key: "siem", label: "Security Information & Event Management (SIEM)", mandatory: false },
      { key: "penTesting", label: "Penetration testing / red team exercises", mandatory: false },
      { key: "secureSdlc", label: "Secure Software Development Lifecycle (SSDLC)", mandatory: false },
    ],
  },
];
