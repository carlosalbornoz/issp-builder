import "server-only";

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const USAGE_EVENT_TYPES = ["created", "loaded", "restored"] as const;

export type UsageEventType = (typeof USAGE_EVENT_TYPES)[number];

export interface UsageLogInput {
  event: UsageEventType;
  agencyName: string;
  agencyAcronym: string;
}

export interface UsageLogEntry extends UsageLogInput {
  timestamp: string;
}

type ParseResult =
  | { success: true; data: UsageLogInput }
  | { success: false; error: string };

const MAX_AGENCY_NAME_LENGTH = 200;
const MAX_AGENCY_ACRONYM_LENGTH = 50;
const DEFAULT_USAGE_LOG_PATH = path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "issp-usage.jsonl");
const ALLOWED_KEYS = new Set(["event", "agencyName", "agencyAcronym"]);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

let appendQueue: Promise<void> = Promise.resolve();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTextField(value: unknown, label: string, maxLength: number): ParseResult | string {
  if (typeof value !== "string") {
    return { success: false, error: `${label} must be a string.` };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { success: false, error: `${label} is required.` };
  }
  if (trimmed.length > maxLength) {
    return { success: false, error: `${label} is too long.` };
  }
  if (CONTROL_CHARACTER_PATTERN.test(trimmed)) {
    return { success: false, error: `${label} contains invalid characters.` };
  }

  return trimmed;
}

export function parseUsageLogInput(value: unknown): ParseResult {
  if (!isRecord(value)) {
    return { success: false, error: "Request body must be an object." };
  }

  if (Object.keys(value).some((key) => !ALLOWED_KEYS.has(key))) {
    return { success: false, error: "Request body contains unsupported fields." };
  }

  if (!USAGE_EVENT_TYPES.includes(value.event as UsageEventType)) {
    return { success: false, error: "Event must be created, loaded, or restored." };
  }

  const agencyName = parseTextField(value.agencyName, "Agency name", MAX_AGENCY_NAME_LENGTH);
  if (typeof agencyName !== "string") return agencyName;

  const agencyAcronym = parseTextField(value.agencyAcronym, "Agency acronym", MAX_AGENCY_ACRONYM_LENGTH);
  if (typeof agencyAcronym !== "string") return agencyAcronym;

  return {
    success: true,
    data: {
      event: value.event as UsageEventType,
      agencyName,
      agencyAcronym,
    },
  };
}

function getUsageLogPath(): string {
  const configuredPath = process.env.ISSP_USAGE_LOG_PATH?.trim();
  if (!configuredPath) return DEFAULT_USAGE_LOG_PATH;
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), configuredPath);
}

async function writeUsageLogEntry(entry: UsageLogEntry): Promise<void> {
  const logPath = getUsageLogPath();
  await mkdir(path.dirname(logPath), { recursive: true, mode: 0o700 });
  await appendFile(logPath, `${JSON.stringify(entry)}\n`, {
    encoding: "utf8",
    flag: "a",
    mode: 0o600,
  });
}

export function appendUsageLogEntry(input: UsageLogInput): Promise<UsageLogEntry> {
  const entry: UsageLogEntry = {
    timestamp: new Date().toISOString(),
    ...input,
  };

  const write = appendQueue.then(() => writeUsageLogEntry(entry));
  appendQueue = write.catch(() => undefined);
  return write.then(() => entry);
}
