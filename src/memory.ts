// Per-caller memory keyed by E.164 phone number. A JSON file stands in
// for a database — a deliberate hackathon simplification.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface CallerProfile {
  phone: string;
  name?: string;
  firstSeen: string;
  lastSeen: string;
  notes: string[];
}

const MAX_NOTES = 8;

const storePath = (): string => process.env.MEMORY_FILE ?? "data/profiles.json";

function readStore(): Record<string, CallerProfile> {
  const path = storePath();
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<
      string,
      CallerProfile
    >;
  } catch {
    return {}; // corrupt store must never crash a call turn
  }
}

function writeStore(store: Record<string, CallerProfile>): void {
  const path = storePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(store, null, 2));
}

export function loadProfile(phone: string | null): CallerProfile | null {
  if (!phone) return null;
  return readStore()[phone] ?? null;
}

const NAME_PATTERNS = [/\bmy name is (\w+)/i, /\bcall me (\w+)/i];

export function extractName(utterance: string): string | null {
  for (const re of NAME_PATTERNS) {
    const match = re.exec(utterance);
    const raw = match?.[1];
    if (raw) return raw[0]!.toUpperCase() + raw.slice(1).toLowerCase();
  }
  return null;
}

export function rememberTurn(
  phone: string | null,
  utterance: string,
  reply: string,
): void {
  if (!phone) return;
  const store = readStore();
  const now = new Date().toISOString();
  const profile: CallerProfile = store[phone] ?? {
    phone,
    firstSeen: now,
    lastSeen: now,
    notes: [],
  };
  profile.lastSeen = now;
  const name = extractName(utterance);
  if (name && !profile.name) profile.name = name;
  const day = now.slice(0, 10);
  profile.notes.push(`${day} caller: ${utterance.slice(0, 140)}`);
  profile.notes.push(`${day} clara: ${reply.slice(0, 140)}`);
  profile.notes = profile.notes.slice(-MAX_NOTES);
  store[phone] = profile;
  writeStore(store);
}
