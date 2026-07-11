# Clara Care Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A TypeScript server exposing an OpenAI-compatible `/chat/completions` SSE endpoint that Vapi uses as its custom LLM, giving callers a guardrail-first, grounded, personalized voice care line named Clara.

**Architecture:** Vapi owns all audio (STT/TTS/turn-taking) and POSTs each turn to our Fastify server. Every turn runs: profile load → deterministic guardrail (care-API triage, keyword fail-safe) → LLM turn via a provider-agnostic gateway with a care-API tool loop → profile save. The emergency path streams a fixed script and never touches the LLM.

**Tech Stack:** Bun runtime + test runner, TypeScript strict, Fastify 5, raw `fetch` for both the care API and model providers (no SDK deps).

## Global Constraints

- Package manager/runtime: **bun** (`bun install`, `bun test`, `bun run`). No npm/npx.
- TypeScript strict; no `any`, no `@ts-ignore`.
- Persona/product name is **Clara**; the upstream is referred to ONLY as the generic "care API". Its real name, branding, and base URL never appear in code, docs, tests, or commits — the base URL exists only in gitignored `.env` as `CARE_API_BASE_URL`.
- Secrets only via `.env` (gitignored). `.env.example` carries placeholders only.
- Commits: plain conventional messages, **no AI attribution or Co-Authored-By footers**.
- Fail-safe, never fail-open: if the care API is unreachable, the local keyword screen still guards the turn.
- `CARE_API_MOCK=1` must keep the entire pipeline working end-to-end with zero external credentials (LLM key excepted for live LLM turns).
- Before every commit: `bun run typecheck && bun test` green, and the hygiene grep from Task 9 Step 4 returns nothing.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Modify: `.gitignore` (add `data/`)
- Modify: `.env.example` (add care API / gateway / Vapi keys)

**Interfaces:**
- Consumes: nothing.
- Produces: `bun run typecheck`, `bun test`, `bun run dev`, `bun run smoke` scripts; strict TS config all later tasks compile under.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "clara-care-line",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/server.ts",
    "start": "bun src/server.ts",
    "smoke": "bun scripts/smoke.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "fastify": "^5.0.0"
  },
  "devDependencies": {
    "@types/bun": "^1.1.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Preserve",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["bun"]
  },
  "include": ["src", "scripts", "tests"]
}
```

- [ ] **Step 3: Append to `.gitignore`**

```
# Caller-profile store (may hold phone numbers)
data/
```

- [ ] **Step 4: Replace `.env.example` with**

```
# Twilio (required for sponsor prizes)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Care API (upstream health-data platform; token minted in its operator portal)
CARE_API_BASE_URL=
CARE_API_TOKEN=
CARE_API_MOCK=1

# Model gateway
MODEL_PROVIDER=anthropic   # anthropic | openai
MODEL_NAME=                # optional override (defaults: claude-fable-5 / gpt-4o)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OPENAI_BASE_URL=           # optional OpenAI-compatible base (e.g. a router), default api.openai.com/v1

# Vapi (voice pipeline; assistant's custom LLM URL -> PUBLIC_URL)
VAPI_API_KEY=

# App
PORT=3000
PUBLIC_URL=   # public tunnel URL for Vapi -> this server
```

- [ ] **Step 5: Install and verify**

Run: `bun install && bun run typecheck`
Expected: installs fastify + dev deps; typecheck exits 0 (no source files yet is fine).

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json bun.lock .gitignore .env.example
git commit -m "chore: scaffold bun + strict TypeScript project"
```

---

### Task 2: Care-API client with mock mode (`src/careApi.ts`)

**Files:**
- Create: `src/careApi.ts`
- Test: `tests/careApi.test.ts`

**Interfaces:**
- Consumes: env `CARE_API_BASE_URL`, `CARE_API_TOKEN`, `CARE_API_MOCK`.
- Produces (used by guardrail/tools):
  - `type TriageBand = 'crisis' | 'emergency' | 'urgent' | 'primary' | 'self_care'`
  - `interface Triage { band: TriageBand; confidence: number; hardEscalate: '911' | '988' | null }`
  - `medPrice(q: { symptoms?: string; drug?: string }): Promise<MedPriceResult>` — `MedPriceResult = { suggestion: string; price: { cash: number | null; goodrx: number | null }; ground: { rxcui?: string; purpose?: string; warnings?: string }; triage: Triage }`
  - `findClinics(q: { lat: number; lng: number }): Promise<Clinic[]>` — `Clinic = { name: string; address: string; distanceMiles: number; slidingScale: boolean }`
  - `careInfo(q: { question: string }): Promise<{ answer: string; sources: string[] }>`
  - `housingCheck(q: { address: string }): Promise<{ violations: number; complaints311: number; summary: string }>`

Real-mode response mapping for clinics/care/housing follows the upstream OpenAPI (`GET <base>/openapi.yaml`) — re-check field names there when the real token lands; mock shapes above are the contract the rest of Clara compiles against.

- [ ] **Step 1: Write the failing test `tests/careApi.test.ts`**

```ts
import { describe, expect, test } from 'bun:test';

process.env.CARE_API_MOCK = '1';

import { careInfo, findClinics, housingCheck, medPrice } from '../src/careApi';

describe('careApi mock mode', () => {
  test('medPrice: sore throat -> self_care band, priced OTC suggestion', async () => {
    const r = await medPrice({ symptoms: 'I have a sore throat' });
    expect(r.triage.band).toBe('self_care');
    expect(r.triage.hardEscalate).toBeNull();
    expect(r.price.cash).toBeGreaterThan(0);
    expect(r.suggestion.toLowerCase()).toContain('acetaminophen');
  });

  test('medPrice: chest pain -> emergency with hardEscalate 911', async () => {
    const r = await medPrice({ symptoms: 'crushing chest pain and my arm is numb' });
    expect(r.triage.band).toBe('emergency');
    expect(r.triage.hardEscalate).toBe('911');
  });

  test('medPrice: suicidal ideation -> crisis with hardEscalate 988', async () => {
    const r = await medPrice({ symptoms: 'I want to end my life' });
    expect(r.triage.band).toBe('crisis');
    expect(r.triage.hardEscalate).toBe('988');
  });

  test('findClinics returns sliding-scale clinics', async () => {
    const clinics = await findClinics({ lat: 40.75, lng: -73.99 });
    expect(clinics.length).toBeGreaterThan(0);
    expect(clinics[0]?.slidingScale).toBe(true);
    expect(clinics[0]?.address.length).toBeGreaterThan(5);
  });

  test('careInfo and housingCheck respond with fixtures', async () => {
    expect((await careInfo({ question: 'sore throat care' })).answer.length).toBeGreaterThan(10);
    const h = await housingCheck({ address: '100 Example St' });
    expect(h.violations).toBeGreaterThanOrEqual(0);
    expect(h.summary.length).toBeGreaterThan(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/careApi.test.ts`
Expected: FAIL — cannot resolve `../src/careApi`.

- [ ] **Step 3: Write `src/careApi.ts`**

```ts
// Typed client for the upstream care API (read-only integration).
// CARE_API_MOCK=1 serves realistic fixtures so the whole pipeline runs
// end-to-end with no token; the real token hot-swaps in via .env.

export type TriageBand = 'crisis' | 'emergency' | 'urgent' | 'primary' | 'self_care';

export interface Triage {
  band: TriageBand;
  confidence: number;
  hardEscalate: '911' | '988' | null;
}

export interface MedPriceResult {
  suggestion: string;
  price: { cash: number | null; goodrx: number | null };
  ground: { rxcui?: string; purpose?: string; warnings?: string };
  triage: Triage;
}

export interface Clinic {
  name: string;
  address: string;
  distanceMiles: number;
  slidingScale: boolean;
}

export interface CareInfo {
  answer: string;
  sources: string[];
}

export interface HousingCheck {
  violations: number;
  complaints311: number;
  summary: string;
}

const mockEnabled = (): boolean => process.env.CARE_API_MOCK === '1';

function baseUrl(): string {
  const url = process.env.CARE_API_BASE_URL;
  if (!url) throw new Error('CARE_API_BASE_URL not set');
  return url.replace(/\/$/, '');
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${baseUrl()}${path}${qs ? `?${qs}` : ''}`;
  const headers = { Authorization: `Bearer ${process.env.CARE_API_TOKEN ?? ''}` };
  let res = await fetch(url, { headers });
  if (res.status === 429) {
    // Care API rate limits fail fast with a retry_after; retry exactly once.
    const body = (await res.json().catch(() => ({}))) as { retry_after?: number };
    const waitMs = Math.min((body.retry_after ?? 1) * 1000, 3000);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    res = await fetch(url, { headers });
  }
  if (!res.ok) throw new Error(`care API ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

// Mock triage mirrors the upstream deterministic rule engine closely enough
// for demo + tests. The comprehensive fail-safe keyword screen lives in
// guardrail.ts; this list only makes mock mode behave realistically.
const MOCK_CRISIS = [/suicid/i, /kill myself/i, /end my life/i, /want to die/i, /self.?harm/i];
const MOCK_EMERGENCY = [
  /chest pain/i,
  /can'?t breathe/i,
  /trouble breathing/i,
  /short(ness)? of breath/i,
  /stroke/i,
  /face droop/i,
  /slurred speech/i,
  /overdose/i,
  /unconscious/i,
  /severe bleeding/i,
  /seizure/i,
  /arm is numb|numb arm/i,
];

function mockTriage(symptoms: string): Triage {
  if (MOCK_CRISIS.some((re) => re.test(symptoms))) {
    return { band: 'crisis', confidence: 0.92, hardEscalate: '988' };
  }
  if (MOCK_EMERGENCY.some((re) => re.test(symptoms))) {
    return { band: 'emergency', confidence: 0.88, hardEscalate: '911' };
  }
  if (/sore throat|cough|cold|headache|runny nose|congestion/i.test(symptoms)) {
    return { band: 'self_care', confidence: 0.74, hardEscalate: null };
  }
  return { band: 'primary', confidence: 0.55, hardEscalate: null };
}

export async function medPrice(q: { symptoms?: string; drug?: string }): Promise<MedPriceResult> {
  if (mockEnabled()) {
    const symptoms = q.symptoms ?? q.drug ?? '';
    return {
      suggestion: /sore throat/i.test(symptoms)
        ? 'acetaminophen (generic Tylenol) plus lozenges and warm salt-water gargles'
        : 'generic acetaminophen',
      price: { cash: 4.99, goodrx: 2.79 },
      ground: {
        rxcui: '161',
        purpose: 'pain reliever / fever reducer',
        warnings: 'do not exceed 3g per day; avoid with liver disease or heavy alcohol use',
      },
      triage: mockTriage(symptoms),
    };
  }
  const params: Record<string, string> = {};
  if (q.symptoms) params.symptoms = q.symptoms;
  if (q.drug) params.drug = q.drug;
  return get<MedPriceResult>('/med-price', params);
}

export async function findClinics(q: { lat: number; lng: number }): Promise<Clinic[]> {
  if (mockEnabled()) {
    return [
      {
        name: 'Ryan Health | Chelsea-Clinton',
        address: '645 10th Ave, New York, NY 10036',
        distanceMiles: 0.8,
        slidingScale: true,
      },
      {
        name: 'Callen-Lorde Community Health Center',
        address: '356 W 18th St, New York, NY 10011',
        distanceMiles: 1.6,
        slidingScale: true,
      },
    ];
  }
  return get<Clinic[]>('/care/clinics', { lat: String(q.lat), lng: String(q.lng) });
}

export async function careInfo(q: { question: string }): Promise<CareInfo> {
  if (mockEnabled()) {
    return {
      answer:
        'For a sore throat: rest, fluids, warm salt-water gargles, and OTC pain relief. ' +
        'See a clinician if fever over 101F lasts more than 48 hours, swallowing becomes hard, ' +
        'or symptoms last past a week.',
      sources: ['care-kb:sore-throat'],
    };
  }
  return get<CareInfo>('/care', { q: q.question });
}

export async function housingCheck(q: { address: string }): Promise<HousingCheck> {
  if (mockEnabled()) {
    return {
      violations: 3,
      complaints311: 7,
      summary:
        '3 open housing violations (2 for heat/hot water) and 7 recent 311 complaints at this address.',
    };
  }
  const [v, c] = await Promise.all([
    get<{ count: number }>('/housing/violations', { address: q.address }),
    get<{ count: number }>('/housing/complaints311', { address: q.address }),
  ]);
  return {
    violations: v.count,
    complaints311: c.count,
    summary: `${v.count} open violations and ${c.count} recent 311 complaints on file.`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/careApi.test.ts && bun run typecheck`
Expected: 5 pass, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/careApi.ts tests/careApi.test.ts
git commit -m "feat: typed care-API client with 429 retry and mock mode"
```

---

### Task 3: Guardrail pipeline (`src/guardrail.ts`)

**Files:**
- Create: `src/guardrail.ts`
- Test: `tests/guardrail.test.ts`

**Interfaces:**
- Consumes: `medPrice`, `TriageBand` from `./careApi`.
- Produces (used by server):
  - `SCRIPT_911: string`, `SCRIPT_988: string` (digits spaced for TTS: "9 1 1")
  - `keywordEscalation(text: string): '911' | '988' | null`
  - `checkGuardrail(utterance: string): Promise<GuardrailResult>` where
    `GuardrailResult = { escalate: true; code: '911' | '988'; script: string; source: 'triage' | 'keyword' } | { escalate: false; band: TriageBand | null }`

- [ ] **Step 1: Write the failing test `tests/guardrail.test.ts`**

```ts
import { describe, expect, test } from 'bun:test';

process.env.CARE_API_MOCK = '1';

import { SCRIPT_911, SCRIPT_988, checkGuardrail, keywordEscalation } from '../src/guardrail';

describe('keywordEscalation (local fail-safe screen)', () => {
  test('chest pain -> 911', () => {
    expect(keywordEscalation('I have chest pain and my arm is numb')).toBe('911');
  });
  test('suicidal language -> 988', () => {
    expect(keywordEscalation('I have been thinking about suicide')).toBe('988');
  });
  test('mild symptom -> null', () => {
    expect(keywordEscalation('I have a sore throat')).toBeNull();
  });
});

describe('checkGuardrail (deterministic triage first)', () => {
  test('emergency utterance -> scripted 911 escalation', async () => {
    const r = await checkGuardrail('chest pain and my arm is numb');
    expect(r.escalate).toBe(true);
    if (r.escalate) {
      expect(r.code).toBe('911');
      expect(r.script).toBe(SCRIPT_911);
      expect(r.source).toBe('triage');
    }
  });

  test('crisis utterance -> scripted 988 escalation', async () => {
    const r = await checkGuardrail('I want to end my life');
    expect(r.escalate).toBe(true);
    if (r.escalate) expect(r.script).toBe(SCRIPT_988);
  });

  test('mild utterance -> no escalation, triage band surfaced', async () => {
    const r = await checkGuardrail('I have a sore throat');
    expect(r.escalate).toBe(false);
    if (!r.escalate) expect(r.band).toBe('self_care');
  });

  test('care API unreachable -> keyword fail-safe still escalates (never fail-open)', async () => {
    process.env.CARE_API_MOCK = '0';
    process.env.CARE_API_BASE_URL = 'http://127.0.0.1:9'; // nothing listens here
    try {
      const r = await checkGuardrail('I think I am having a stroke, my speech is slurred');
      expect(r.escalate).toBe(true);
      if (r.escalate) expect(r.source).toBe('keyword');
    } finally {
      process.env.CARE_API_MOCK = '1';
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/guardrail.test.ts`
Expected: FAIL — cannot resolve `../src/guardrail`.

- [ ] **Step 3: Write `src/guardrail.ts`**

```ts
// Deterministic guardrail that runs BEFORE the LLM on every turn.
// Escalations stream a fixed script — the model is never consulted on
// that path. If the care API is unreachable, a local keyword screen
// still guards the turn: degraded operation is never unguarded operation.

import { medPrice, type TriageBand } from './careApi';

export const SCRIPT_911 =
  'What you are describing could be a medical emergency, so I want you to get help right now. ' +
  'Please hang up and call 9 1 1 immediately. ' +
  'If you cannot dial, ask someone near you to call for you. Please do that now.';

export const SCRIPT_988 =
  'I am really glad you told me, and I want you to talk to someone who can truly help right now. ' +
  'Please call or text 9 8 8 — the Suicide and Crisis Lifeline. ' +
  'It is free, confidential, and open twenty-four seven. You deserve support right now, so please reach out to them.';

export type GuardrailResult =
  | { escalate: true; code: '911' | '988'; script: string; source: 'triage' | 'keyword' }
  | { escalate: false; band: TriageBand | null };

const KEYWORDS_988: RegExp[] = [
  /suicid/i,
  /kill (?:myself|me)/i,
  /end (?:my|it) (?:life|all)/i,
  /want to die/i,
  /hurt(?:ing)? myself/i,
  /self.?harm/i,
];

const KEYWORDS_911: RegExp[] = [
  /chest pain/i,
  /heart attack/i,
  /can'?t breathe/i,
  /trouble breathing/i,
  /short(ness)? of breath/i,
  /stroke/i,
  /face droop/i,
  /slurred speech/i,
  /overdose/i,
  /unconscious/i,
  /not breathing/i,
  /severe bleeding/i,
  /seizure/i,
  /arm is numb|numb arm/i,
];

export function keywordEscalation(text: string): '911' | '988' | null {
  if (KEYWORDS_988.some((re) => re.test(text))) return '988';
  if (KEYWORDS_911.some((re) => re.test(text))) return '911';
  return null;
}

function scripted(code: '911' | '988', source: 'triage' | 'keyword'): GuardrailResult {
  return { escalate: true, code, script: code === '911' ? SCRIPT_911 : SCRIPT_988, source };
}

export async function checkGuardrail(utterance: string): Promise<GuardrailResult> {
  if (!utterance.trim()) return { escalate: false, band: null };
  try {
    const { triage } = await medPrice({ symptoms: utterance });
    if (triage.hardEscalate) return scripted(triage.hardEscalate, 'triage');
    return { escalate: false, band: triage.band };
  } catch {
    const code = keywordEscalation(utterance);
    if (code) return scripted(code, 'keyword');
    return { escalate: false, band: null };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/guardrail.test.ts && bun run typecheck`
Expected: 7 pass, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/guardrail.ts tests/guardrail.test.ts
git commit -m "feat: guardrail-first triage with scripted 911/988 and keyword fail-safe"
```

---

### Task 4: Caller memory (`src/memory.ts`)

**Files:**
- Create: `src/memory.ts`
- Test: `tests/memory.test.ts`

**Interfaces:**
- Consumes: env `MEMORY_FILE` (optional; default `data/profiles.json`).
- Produces (used by server/prompts):
  - `interface CallerProfile { phone: string; name?: string; firstSeen: string; lastSeen: string; notes: string[] }`
  - `loadProfile(phone: string | null): CallerProfile | null`
  - `rememberTurn(phone: string | null, utterance: string, reply: string): void`
  - `extractName(utterance: string): string | null`

- [ ] **Step 1: Write the failing test `tests/memory.test.ts`**

```ts
import { afterAll, beforeEach, expect, test } from 'bun:test';
import { rmSync } from 'node:fs';

const TEST_FILE = 'data/test-profiles.json';
process.env.MEMORY_FILE = TEST_FILE;

import { extractName, loadProfile, rememberTurn } from '../src/memory';

beforeEach(() => rmSync(TEST_FILE, { force: true }));
afterAll(() => rmSync(TEST_FILE, { force: true }));

test('unknown caller -> null profile', () => {
  expect(loadProfile('+15550000000')).toBeNull();
});

test('null phone never crashes and stores nothing', () => {
  rememberTurn(null, 'hello', 'hi there');
  expect(loadProfile(null)).toBeNull();
});

test('rememberTurn persists name and notes across loads', () => {
  rememberTurn('+15551234567', 'my name is sam and I have a sore throat', 'Nice to meet you, Sam.');
  const p = loadProfile('+15551234567');
  expect(p?.name).toBe('Sam');
  expect(p?.notes.some((n) => n.includes('sore throat'))).toBe(true);
  expect(p?.firstSeen).toBeTruthy();
});

test('notes are capped so profiles stay small', () => {
  for (let i = 0; i < 10; i++) rememberTurn('+15557777777', `utterance ${i}`, `reply ${i}`);
  const p = loadProfile('+15557777777');
  expect(p ? p.notes.length : 99).toBeLessThanOrEqual(8);
});

test('extractName', () => {
  expect(extractName('my name is sam')).toBe('Sam');
  expect(extractName('you can call me Jo')).toBe('Jo');
  expect(extractName('I have a headache')).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/memory.test.ts`
Expected: FAIL — cannot resolve `../src/memory`.

- [ ] **Step 3: Write `src/memory.ts`**

```ts
// Per-caller memory keyed by E.164 phone number. A JSON file stands in
// for a database — a deliberate hackathon simplification.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface CallerProfile {
  phone: string;
  name?: string;
  firstSeen: string;
  lastSeen: string;
  notes: string[];
}

const MAX_NOTES = 8;

const storePath = (): string => process.env.MEMORY_FILE ?? 'data/profiles.json';

function readStore(): Record<string, CallerProfile> {
  const path = storePath();
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, CallerProfile>;
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

export function rememberTurn(phone: string | null, utterance: string, reply: string): void {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/memory.test.ts && bun run typecheck`
Expected: 5 pass, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/memory.ts tests/memory.test.ts
git commit -m "feat: JSON-file caller profiles keyed by phone number"
```

---

### Task 5: Model gateway (`src/gateway.ts`)

**Files:**
- Create: `src/gateway.ts`
- Test: `tests/gateway.test.ts`

**Interfaces:**
- Consumes: env `MODEL_PROVIDER` (`anthropic` default | `openai`), `MODEL_NAME`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`.
- Produces (used by server/tools):
  - `interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }`
  - `interface ToolSpec { name: string; description: string; parameters: Record<string, unknown>; run: (args: Record<string, unknown>) => Promise<string> }`
  - `complete(messages: ChatMessage[], tools: ToolSpec[]): Promise<string>` — runs the provider tool loop internally, retries the whole turn once on provider error, throws on second failure.
  - `stats: { llmCalls: number }` — incremented on every provider HTTP call; smoke test asserts the emergency path leaves it untouched.
  - `toAnthropicPayload(messages: ChatMessage[]): { system: string; messages: AnthropicMessage[] }` — exported for tests.

- [ ] **Step 1: Write the failing test `tests/gateway.test.ts`**

```ts
import { expect, test } from 'bun:test';
import { toAnthropicPayload, type ChatMessage } from '../src/gateway';

test('system messages hoisted; assistant-first history gets a synthetic user turn', () => {
  const messages: ChatMessage[] = [
    { role: 'system', content: 'You are Clara.' },
    { role: 'assistant', content: "Hi, I'm Clara." },
    { role: 'user', content: 'hello' },
  ];
  const { system, messages: turns } = toAnthropicPayload(messages);
  expect(system).toBe('You are Clara.');
  expect(turns[0]).toEqual({ role: 'user', content: '(caller connected)' });
  expect(turns[1]?.role).toBe('assistant');
  expect(turns[2]).toEqual({ role: 'user', content: 'hello' });
});

test('consecutive same-role messages merge (provider requires alternation)', () => {
  const { messages: turns } = toAnthropicPayload([
    { role: 'user', content: 'one' },
    { role: 'user', content: 'two' },
  ]);
  expect(turns).toEqual([{ role: 'user', content: 'one\ntwo' }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/gateway.test.ts`
Expected: FAIL — cannot resolve `../src/gateway`.

- [ ] **Step 3: Write `src/gateway.ts`**

```ts
// Provider-agnostic model gateway. One complete() entry point; the
// provider (Claude default, OpenAI-compatible via env) is an .env choice,
// never a code change. Runs the tool-use loop internally.

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  run: (args: Record<string, unknown>) => Promise<string>;
}

export const stats = { llmCalls: 0 };

const MAX_TOOL_ROUNDS = 5;
const OUT_OF_ROUNDS = "I'm sorry, I'm having trouble pulling that up right now.";

export async function complete(messages: ChatMessage[], tools: ToolSpec[]): Promise<string> {
  const provider = process.env.MODEL_PROVIDER ?? 'anthropic';
  const attempt = (): Promise<string> =>
    provider === 'openai' ? completeOpenAI(messages, tools) : completeAnthropic(messages, tools);
  try {
    return await attempt();
  } catch {
    return await attempt(); // one retry; a second failure propagates to the server
  }
}

// ---------- Anthropic ----------

type AnthropicContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };

type AnthropicMessage = {
  role: 'user' | 'assistant';
  content:
    | string
    | Array<AnthropicContent | { type: 'tool_result'; tool_use_id: string; content: string }>;
};

export function toAnthropicPayload(messages: ChatMessage[]): {
  system: string;
  messages: AnthropicMessage[];
} {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const turns: AnthropicMessage[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    const last = turns[turns.length - 1];
    if (last && last.role === m.role && typeof last.content === 'string') {
      last.content = `${last.content}\n${m.content}`;
    } else {
      turns.push({ role: m.role, content: m.content });
    }
  }
  if (turns.length === 0 || turns[0]?.role !== 'user') {
    turns.unshift({ role: 'user', content: '(caller connected)' });
  }
  return { system, messages: turns };
}

async function runTool(tools: ToolSpec[], name: string, args: Record<string, unknown>): Promise<string> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return `unknown tool: ${name}`;
  try {
    return await tool.run(args);
  } catch (err) {
    return `tool error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function completeAnthropic(messages: ChatMessage[], tools: ToolSpec[]): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  const model = process.env.MODEL_NAME || 'claude-fable-5';
  const { system, messages: turns } = toAnthropicPayload(messages);
  const toolDefs = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    stats.llmCalls++;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system,
        messages: turns,
        ...(toolDefs.length ? { tools: toolDefs } : {}),
      }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content: AnthropicContent[]; stop_reason: string };
    if (data.stop_reason !== 'tool_use') {
      return data.content
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map((b) => b.text)
        .join('');
    }
    turns.push({ role: 'assistant', content: data.content });
    const results: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];
    for (const block of data.content) {
      if (block.type !== 'tool_use') continue;
      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: await runTool(tools, block.name, block.input),
      });
    }
    turns.push({ role: 'user', content: results });
  }
  return OUT_OF_ROUNDS;
}

// ---------- OpenAI-compatible (OpenAI, or any router via OPENAI_BASE_URL) ----------

type OpenAIToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
};

async function completeOpenAI(messages: ChatMessage[], tools: ToolSpec[]): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const base = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.MODEL_NAME || 'gpt-4o';
  const turns: OpenAIMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
  const toolDefs = tools.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    stats.llmCalls++;
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: turns,
        ...(toolDefs.length ? { tools: toolDefs } : {}),
      }),
    });
    if (!res.ok) throw new Error(`openai-compatible ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices: Array<{ message: OpenAIMessage }> };
    const msg = data.choices[0]?.message;
    if (!msg) throw new Error('openai-compatible: empty choices');
    if (!msg.tool_calls?.length) return msg.content ?? '';
    turns.push(msg);
    for (const call of msg.tool_calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
      } catch {
        // leave args empty; the tool reports what it got
      }
      turns.push({
        role: 'tool',
        content: await runTool(tools, call.function.name, args),
        tool_call_id: call.id,
      });
    }
  }
  return OUT_OF_ROUNDS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/gateway.test.ts && bun run typecheck`
Expected: 2 pass, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/gateway.ts tests/gateway.test.ts
git commit -m "feat: provider-agnostic model gateway with internal tool loop"
```

---

### Task 6: Care tools (`src/tools.ts`)

**Files:**
- Create: `src/tools.ts`
- Test: `tests/tools.test.ts`

**Interfaces:**
- Consumes: `careApi` functions (Task 2), `ToolSpec` from `./gateway` (Task 5).
- Produces (used by server): `claraTools: ToolSpec[]` — `med_price`, `find_clinics`, `care_info`, `housing_check`. Every `run` degrades to the string `"I can't reach that data right now."` on error (spec §6).

- [ ] **Step 1: Write the failing test `tests/tools.test.ts`**

```ts
import { expect, test } from 'bun:test';

process.env.CARE_API_MOCK = '1';

import { claraTools } from '../src/tools';

test('exposes exactly the four care tools', () => {
  expect(claraTools.map((t) => t.name).sort()).toEqual([
    'care_info',
    'find_clinics',
    'housing_check',
    'med_price',
  ]);
});

test('find_clinics dispatch returns clinic JSON', async () => {
  const tool = claraTools.find((t) => t.name === 'find_clinics');
  const out = await tool!.run({ lat: 40.75, lng: -73.99 });
  expect(out).toContain('slidingScale');
  expect(out).toContain('address');
});

test('med_price dispatch surfaces triage + price', async () => {
  const tool = claraTools.find((t) => t.name === 'med_price');
  const out = await tool!.run({ symptoms: 'sore throat' });
  expect(out).toContain('goodrx');
  expect(out).toContain('self_care');
});

test('tool failure degrades gracefully, never throws', async () => {
  process.env.CARE_API_MOCK = '0';
  process.env.CARE_API_BASE_URL = 'http://127.0.0.1:9';
  try {
    const tool = claraTools.find((t) => t.name === 'care_info');
    const out = await tool!.run({ question: 'flu shots' });
    expect(out).toContain("can't reach");
  } finally {
    process.env.CARE_API_MOCK = '1';
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/tools.test.ts`
Expected: FAIL — cannot resolve `../src/tools`.

- [ ] **Step 3: Write `src/tools.ts`**

```ts
// Tool schemas + dispatch: the model's only path to facts. Grounding
// lives here — prices, clinics, guidance, and housing all come from the
// care API, never from model memory.

import * as careApi from './careApi';
import type { ToolSpec } from './gateway';

const UNREACHABLE = "I can't reach that data right now.";

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function graceful(fn: () => Promise<string>): Promise<string> {
  return fn().catch(() => UNREACHABLE);
}

export const claraTools: ToolSpec[] = [
  {
    name: 'med_price',
    description:
      'Suggest an over-the-counter medication for symptoms (or look up a drug by name) with real cash and discount prices, grounded in FDA label data. Also returns a deterministic triage rating.',
    parameters: {
      type: 'object',
      properties: {
        symptoms: { type: 'string', description: "The caller's symptoms in their own words" },
        drug: { type: 'string', description: 'A specific drug name to price' },
      },
      required: [],
    },
    run: (args) =>
      graceful(async () =>
        JSON.stringify(
          await careApi.medPrice({ symptoms: asString(args.symptoms), drug: asString(args.drug) })
        )
      ),
  },
  {
    name: 'find_clinics',
    description:
      'Find the nearest low-cost, sliding-scale (FQHC) clinics. Pass approximate latitude/longitude for the caller\'s stated location (e.g. Midtown Manhattan is about 40.754, -73.984).',
    parameters: {
      type: 'object',
      properties: {
        lat: { type: 'number', description: 'Approximate latitude' },
        lng: { type: 'number', description: 'Approximate longitude' },
      },
      required: ['lat', 'lng'],
    },
    run: (args) =>
      graceful(async () =>
        JSON.stringify(
          await careApi.findClinics({
            lat: asNumber(args.lat, 40.754),
            lng: asNumber(args.lng, -73.984),
          })
        )
      ),
  },
  {
    name: 'care_info',
    description:
      'Look up grounded care guidance for a condition or question (what to do, when to see a clinician).',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The health question to ground' },
      },
      required: ['question'],
    },
    run: (args) =>
      graceful(async () =>
        JSON.stringify(await careApi.careInfo({ question: asString(args.question) ?? '' }))
      ),
  },
  {
    name: 'housing_check',
    description:
      'Check open housing violations and recent 311 complaints for an NYC address (social determinants of health, e.g. no heat, mold).',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Street address in NYC' },
      },
      required: ['address'],
    },
    run: (args) =>
      graceful(async () =>
        JSON.stringify(await careApi.housingCheck({ address: asString(args.address) ?? '' }))
      ),
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/tools.test.ts && bun run typecheck`
Expected: 4 pass, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/tools.ts tests/tools.test.ts
git commit -m "feat: care-API tool schemas and dispatch with graceful degradation"
```

---

### Task 7: Clara persona prompt (`src/prompts.ts`)

**Files:**
- Create: `src/prompts.ts`
- Test: `tests/prompts.test.ts`

**Interfaces:**
- Consumes: `CallerProfile` from `./memory`, `TriageBand` from `./careApi`.
- Produces (used by server): `systemPrompt(profile: CallerProfile | null, band: TriageBand | null): string`

- [ ] **Step 1: Write the failing test `tests/prompts.test.ts`**

```ts
import { expect, test } from 'bun:test';
import { systemPrompt } from '../src/prompts';

test('new caller prompt sets persona and voice constraints', () => {
  const p = systemPrompt(null, null);
  expect(p).toContain('Clara');
  expect(p).toContain('PHONE CALL');
  expect(p).toContain('New caller');
});

test('returning caller prompt injects name, history, and triage band', () => {
  const p = systemPrompt(
    {
      phone: '+15551234567',
      name: 'Sam',
      firstSeen: '2026-07-11T10:00:00.000Z',
      lastSeen: '2026-07-11T10:00:00.000Z',
      notes: ['2026-07-11 caller: I have a sore throat'],
    },
    'self_care'
  );
  expect(p).toContain('Sam');
  expect(p).toContain('sore throat');
  expect(p).toContain('self_care');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/prompts.test.ts`
Expected: FAIL — cannot resolve `../src/prompts`.

- [ ] **Step 3: Write `src/prompts.ts`**

```ts
// Clara's persona plus per-caller personalization, rebuilt every turn
// from the profile store and the deterministic triage band.

import type { TriageBand } from './careApi';
import type { CallerProfile } from './memory';

export function systemPrompt(profile: CallerProfile | null, band: TriageBand | null): string {
  const lines = [
    'You are Clara, a warm, capable AI care line for New Yorkers.',
    'You are on a PHONE CALL. Keep replies short and natural: one to three spoken sentences, no lists, no markdown, numbers read naturally.',
    'You are not a doctor and never diagnose. You help people understand options and find affordable care.',
    'Ground every factual claim — prices, clinics, guidance, housing — in your tools. Call a tool rather than guessing.',
    'If someone describes emergency symptoms or a mental-health crisis, tell them to call 9 1 1 or 9 8 8 immediately.',
  ];
  if (band) {
    lines.push(
      `A deterministic triage engine rated the caller's latest message as "${band}". Respect it: urgent or primary means encourage seeing a clinician soon; self_care means reassure and offer OTC options.`
    );
  }
  if (profile) {
    lines.push(
      `Returning caller${profile.name ? ` — their name is ${profile.name}` : ''} (first called ${profile.firstSeen.slice(0, 10)}). Greet them personally and use relevant history naturally, without reciting it.`
    );
    if (profile.notes.length > 0) lines.push(`Recent history:\n${profile.notes.join('\n')}`);
  } else {
    lines.push('New caller. Be welcoming; if it comes up naturally, learn and use their name.');
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/prompts.test.ts && bun run typecheck`
Expected: 2 pass, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/prompts.ts tests/prompts.test.ts
git commit -m "feat: Clara persona prompt with triage band and profile injection"
```

---

### Task 8: Fastify SSE server (`src/server.ts`)

**Files:**
- Create: `src/server.ts`
- Test: `tests/server.test.ts`

**Interfaces:**
- Consumes: everything above — `checkGuardrail`, `complete` + `stats`, `claraTools`, `loadProfile`/`rememberTurn`, `systemPrompt`.
- Produces:
  - `buildServer(): FastifyInstance` — exported for tests/smoke.
  - `POST /chat/completions` — Vapi custom-LLM contract: accepts OpenAI-style body plus `call.customer.number`; responds `text/event-stream` of `chat.completion.chunk` objects ending in `data: [DONE]`.
  - `GET /health` — `{ ok: true }` for tunnel checks.
  - Running `bun src/server.ts` listens on `PORT` (default 3000).

- [ ] **Step 1: Write the failing test `tests/server.test.ts`**

```ts
import { afterAll, expect, test } from 'bun:test';
import { rmSync } from 'node:fs';

process.env.CARE_API_MOCK = '1';
process.env.MEMORY_FILE = 'data/test-server-profiles.json';

import { stats } from '../src/gateway';
import { SCRIPT_911 } from '../src/guardrail';
import { loadProfile } from '../src/memory';
import { buildServer } from '../src/server';

const app = buildServer();

afterAll(async () => {
  await app.close();
  rmSync('data/test-server-profiles.json', { force: true });
});

function sseText(raw: string): string {
  return raw
    .split('\n')
    .filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'))
    .map((l) => JSON.parse(l.slice(6)) as { choices: Array<{ delta: { content?: string } }> })
    .map((c) => c.choices[0]?.delta.content ?? '')
    .join('');
}

test('emergency turn streams the scripted 911 SSE and never calls the LLM', async () => {
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const before = stats.llmCalls;

  const res = await fetch(`http://127.0.0.1:${port}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'clara',
      stream: true,
      messages: [
        { role: 'assistant', content: "Hi, I'm Clara. How can I help you today?" },
        { role: 'user', content: 'I have chest pain and my arm is numb' },
      ],
      call: { customer: { number: '+15559999999' } },
    }),
  });

  expect(res.headers.get('content-type')).toContain('text/event-stream');
  const raw = await res.text();
  expect(raw.trim().endsWith('data: [DONE]')).toBe(true);
  expect(sseText(raw)).toBe(SCRIPT_911);
  expect(stats.llmCalls).toBe(before); // the LLM was never consulted
  expect(loadProfile('+15559999999')).not.toBeNull(); // turn was remembered
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/server.test.ts`
Expected: FAIL — cannot resolve `../src/server`.

- [ ] **Step 3: Write `src/server.ts`**

```ts
// One OpenAI-compatible SSE endpoint that Vapi points at as its custom
// LLM. Vapi owns all audio; this server owns all cognition, in strict
// order: profile -> guardrail -> model+tools -> remember.

import Fastify, { type FastifyInstance } from 'fastify';
import type { ServerResponse } from 'node:http';
import { complete, type ChatMessage } from './gateway';
import { checkGuardrail } from './guardrail';
import { loadProfile, rememberTurn } from './memory';
import { systemPrompt } from './prompts';
import { claraTools } from './tools';

interface VapiChatRequest {
  messages?: Array<{ role?: string; content?: string | null }>;
  call?: { customer?: { number?: string } };
  customer?: { number?: string };
}

const APOLOGY =
  "I'm so sorry — I'm having trouble on my end right now. Please call me back in a couple of minutes.";

function sseChunk(res: ServerResponse, payload: unknown): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function streamText(res: ServerResponse, text: string): void {
  const base = {
    id: `chatcmpl-clara-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'clara',
  };
  const words = text.split(' ');
  for (let i = 0; i < words.length; i += 6) {
    const content = (i === 0 ? '' : ' ') + words.slice(i, i + 6).join(' ');
    sseChunk(res, {
      ...base,
      choices: [
        {
          index: 0,
          delta: i === 0 ? { role: 'assistant', content } : { content },
          finish_reason: null,
        },
      ],
    });
  }
  sseChunk(res, { ...base, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] });
  res.write('data: [DONE]\n\n');
  res.end();
}

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  app.get('/health', async () => ({ ok: true }));

  app.post('/chat/completions', async (request, reply) => {
    const body = request.body as VapiChatRequest;
    const phone = body.call?.customer?.number ?? body.customer?.number ?? null;
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const lastUser = [...incoming].reverse().find((m) => m.role === 'user');
    const utterance = typeof lastUser?.content === 'string' ? lastUser.content : '';

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });

    const profile = loadProfile(phone); // unknown caller -> null, never crash the turn
    const guard = await checkGuardrail(utterance);

    if (guard.escalate) {
      request.log.warn({ code: guard.code, source: guard.source }, 'guardrail escalation, LLM bypassed');
      streamText(res, guard.script);
      rememberTurn(phone, utterance, guard.script);
      return;
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt(profile, guard.band) },
      ...incoming
        .filter(
          (m): m is { role: 'user' | 'assistant'; content: string } =>
            (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
        )
        .map((m) => ({ role: m.role, content: m.content })),
    ];

    let text: string;
    try {
      text = await complete(messages, claraTools);
    } catch (err) {
      request.log.error(err, 'model provider failed after retry');
      text = APOLOGY;
    }
    streamText(res, text);
    rememberTurn(phone, utterance, text);
  });

  return app;
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  const app = buildServer();
  app
    .listen({ port, host: '0.0.0.0' })
    .then(() => app.log.info(`Clara listening on :${port}`))
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/server.test.ts && bun run typecheck`
Expected: 1 pass (4 assertions), typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/server.ts tests/server.test.ts
git commit -m "feat: Vapi-compatible /chat/completions SSE endpoint with guardrail-first turns"
```

---

### Task 9: Smoke script, README, final verify

**Files:**
- Create: `scripts/smoke.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `buildServer` + `streamText` contract (Task 8), `stats` (Task 5).
- Produces: `bun run smoke` — exits 0 when the emergency path is scripted with zero LLM calls (and, if a provider key is present, the normal turn returns a model reply).

- [ ] **Step 1: Write `scripts/smoke.ts`**

```ts
// Exercises the endpoint with fake Vapi payloads — no telephony needed.
// Turn 1 (emergency) must return the fixed script with ZERO LLM calls.
// Turn 2 (normal) needs a provider key; skipped with a warning otherwise.

process.env.CARE_API_MOCK = process.env.CARE_API_MOCK ?? '1';
process.env.MEMORY_FILE = 'data/smoke-profiles.json';

import { rmSync } from 'node:fs';
import { stats } from '../src/gateway';
import { buildServer } from '../src/server';

function vapiPayload(utterance: string, phone = '+15551234567'): unknown {
  return {
    model: 'clara',
    stream: true,
    messages: [
      { role: 'assistant', content: "Hi, I'm Clara. How can I help you today?" },
      { role: 'user', content: utterance },
    ],
    call: { customer: { number: phone } },
  };
}

async function post(base: string, payload: unknown): Promise<string> {
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  return raw
    .split('\n')
    .filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'))
    .map((l) => JSON.parse(l.slice(6)) as { choices: Array<{ delta: { content?: string } }> })
    .map((c) => c.choices[0]?.delta.content ?? '')
    .join('');
}

const app = buildServer();
await app.listen({ port: 3999, host: '127.0.0.1' });
const base = 'http://127.0.0.1:3999';
let failed = false;

// 1. Emergency turn — scripted, zero LLM calls.
const before = stats.llmCalls;
const emergency = await post(base, vapiPayload('I have chest pain and my arm is numb'));
const llmUsed = stats.llmCalls - before;
if (llmUsed !== 0) {
  console.error(`FAIL emergency path reached the LLM ${llmUsed} time(s)`);
  failed = true;
} else if (!emergency.includes('9 1 1')) {
  console.error(`FAIL emergency reply is not the script: ${emergency}`);
  failed = true;
} else {
  console.log('PASS emergency turn: scripted 911 escalation, zero LLM calls');
}

// 2. Normal turn — expects an LLM-generated grounded reply.
const provider = process.env.MODEL_PROVIDER ?? 'anthropic';
const hasKey = Boolean(
  provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY
);
if (!hasKey) {
  console.log(`SKIP normal turn: no API key for provider "${provider}"`);
} else {
  const normal = await post(
    base,
    vapiPayload("I have a sore throat — what can I take, and where's a cheap clinic near midtown?")
  );
  if (normal.length < 10 || normal.includes('9 1 1')) {
    console.error(`FAIL normal turn: ${JSON.stringify(normal)}`);
    failed = true;
  } else {
    console.log(`PASS normal turn: ${normal.slice(0, 140)}${normal.length > 140 ? '…' : ''}`);
  }
}

await app.close();
rmSync('data/smoke-profiles.json', { force: true });
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run the smoke script**

Run: `bun run smoke`
Expected: `PASS emergency turn…` and either `PASS normal turn…` (key present) or `SKIP normal turn…`. Exit 0.

- [ ] **Step 3: Rewrite `README.md`**

```markdown
# Clara — Grounded Voice Care Line

Built at AI Healthcare Hack NYC (July 11, 2026 · Arya Health + localhost:nyc, sponsored by
Twilio AI Startup Searchlight). Callers dial a real phone number and talk to **Clara**: symptom
triage with hard safety escalation, OTC suggestions with real cash prices, nearest low-cost
clinics, and continuity for repeat callers.

## Architecture

```
Caller ──► Twilio number ──► Vapi assistant (STT / TTS / turn-taking)
                                │  custom-LLM endpoint (OpenAI-compatible SSE)
                                ▼
                     Clara server (this repo, TypeScript)
                     1. memory   — caller profile by phone #
                     2. guardrail— deterministic triage BEFORE the LLM
                     3. gateway  — provider-agnostic model (Claude default)
                     4. tools    — grounded reads from a care API
```

**Guardrail-first:** every utterance is triaged deterministically before any model call.
Emergencies stream a fixed 911/988 script — the LLM is never consulted on that path. If the
care API is unreachable, a local keyword screen still guards the turn (fail-safe, never
fail-open).

## Run it

```bash
bun install
cp .env.example .env   # fill in what you have; CARE_API_MOCK=1 works with no care-API token
bun run dev            # serves POST /chat/completions on :3000
bun run smoke          # fake Vapi turns: asserts emergency path never reaches the LLM
bun test               # unit tests
```

Point a Vapi assistant's custom LLM URL at `PUBLIC_URL/chat/completions` (any HTTPS tunnel),
import a Twilio number into Vapi, and call it.

## Judging criteria → where

| Criterion | Where |
| --- | --- |
| Twilio telephony | Twilio number imported into Vapi |
| Full conversation end-to-end | Vapi voice pipeline + this server's turn loop |
| Grounded in domain knowledge | care-API tools: triage, med prices, clinics, care KB, housing |
| Personalized per caller | phone-keyed profile store (`src/memory.ts`) |
| Guardrails / reliability | deterministic triage before the LLM + keyword fail-safe |
```

- [ ] **Step 4: Full verify + hygiene sweep**

Run: `bun run typecheck && bun test && bun run smoke`
Expected: all green.

Run: `source .env && git grep -riE "$HYGIENE_GREP" -- ':!bun.lock'`
Expected: no output (exit 1). `HYGIENE_GREP` lives only in the gitignored `.env` — it holds the
upstream identity strings that must never appear in this repo, so the check itself can't leak them.
If anything matches, fix before committing.

- [ ] **Step 5: Commit**

```bash
git add scripts/smoke.ts README.md
git commit -m "feat: smoke script for guardrail bypass proof; Clara README"
```

---

## SCOPE ADDITION (approved by Nolan 2026-07-11 PM): Task 10 — Telehealth warm transfer

For triage band `urgent` (NOT hardEscalate — the scripted 911/988 path is unchanged), Clara
offers to connect the caller to a telehealth clinician; when the caller agrees, the model calls
a client-side `transfer_to_telehealth` tool, and the server responds with Vapi's `transferCall`
tool-call over SSE targeting env `TELEHEALTH_TRANSFER_NUMBER`. **The code below OVERRIDES the
corresponding blocks in Tasks 1–2 and 5–8.**

**Files:**
- Modify: `.env.example` (Task 1), `src/careApi.ts` (Task 2), `src/gateway.ts` (Task 5), `src/tools.ts` (Task 6), `src/prompts.ts` (Task 7), `src/server.ts` (Task 8)
- Test: additions in `tests/careApi.test.ts`, `tests/tools.test.ts`, `tests/prompts.test.ts`, `tests/server.test.ts`

**Interfaces (revised):**
- `ToolSpec` gains `clientSide?: boolean` — client-side tools are never dispatched server-side; the provider loop short-circuits and surfaces them.
- `complete(messages, tools): Promise<TurnResult>` where
  `TurnResult = { kind: 'text'; text: string } | { kind: 'client_tool'; name: string; args: Record<string, unknown> }`
- `streamTransfer(res: ServerResponse, destination: string): void` exported from `src/server.ts`.

- [ ] **Step 1: `.env.example` — append under the Vapi section**

```
TELEHEALTH_TRANSFER_NUMBER=   # E.164 number Vapi warm-transfers urgent (non-911) callers to
```

- [ ] **Step 2: `src/careApi.ts` — mockTriage gains an urgent branch** (insert BEFORE the self_care check)

```ts
  if (
    /high fever|fever for (?:two|three|\d+) days|can'?t keep (?:water|food|anything) down|persistent vomiting|dehydrated|worst headache/i.test(
      symptoms
    )
  ) {
    return { band: 'urgent', confidence: 0.8, hardEscalate: null };
  }
```

Test addition (`tests/careApi.test.ts`):

```ts
  test('medPrice: high fever for days -> urgent band, no hard escalation', async () => {
    const r = await medPrice({ symptoms: "high fever for three days and I can't keep water down" });
    expect(r.triage.band).toBe('urgent');
    expect(r.triage.hardEscalate).toBeNull();
  });
```

- [ ] **Step 3: `src/gateway.ts` — TurnResult + client-side short-circuit**

Replace the `ToolSpec` interface, add `TurnResult`, change `complete` and both providers:

```ts
export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  clientSide?: boolean; // surfaced to the caller (e.g. Vapi transfer), never dispatched here
  run: (args: Record<string, unknown>) => Promise<string>;
}

export type TurnResult =
  | { kind: 'text'; text: string }
  | { kind: 'client_tool'; name: string; args: Record<string, unknown> };

export async function complete(messages: ChatMessage[], tools: ToolSpec[]): Promise<TurnResult> {
  const provider = process.env.MODEL_PROVIDER ?? 'anthropic';
  const attempt = (): Promise<TurnResult> =>
    provider === 'openai' ? completeOpenAI(messages, tools) : completeAnthropic(messages, tools);
  try {
    return await attempt();
  } catch {
    return await attempt();
  }
}
```

In `completeAnthropic`, return type `Promise<TurnResult>`; the text return becomes
`return { kind: 'text', text: ... }`; the out-of-rounds return becomes
`return { kind: 'text', text: OUT_OF_ROUNDS }`; and immediately after parsing `data`, before
executing tool blocks:

```ts
    for (const block of data.content) {
      if (block.type !== 'tool_use') continue;
      if (tools.find((t) => t.name === block.name)?.clientSide) {
        return { kind: 'client_tool', name: block.name, args: block.input };
      }
    }
```

In `completeOpenAI`, same return-type change, and after `if (!msg.tool_calls?.length) return { kind: 'text', text: msg.content ?? '' };`:

```ts
    for (const call of msg.tool_calls) {
      if (tools.find((t) => t.name === call.function.name)?.clientSide) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
        } catch {
          // empty args are fine for client tools
        }
        return { kind: 'client_tool', name: call.function.name, args };
      }
    }
```

- [ ] **Step 4: `src/tools.ts` — add the client-side transfer tool** (append to `claraTools`)

```ts
  {
    name: 'transfer_to_telehealth',
    description:
      'Connect the caller to a live telehealth clinician by transferring this phone call. Offer first; use only after the caller clearly agrees to be connected.',
    parameters: { type: 'object', properties: {}, required: [] },
    clientSide: true,
    run: async () => 'transferring', // never dispatched server-side; the server turns this into a live call transfer
  },
```

Test changes (`tests/tools.test.ts`) — the four-tools test becomes:

```ts
test('exposes the four care tools plus the client-side transfer tool', () => {
  expect(claraTools.map((t) => t.name).sort()).toEqual([
    'care_info',
    'find_clinics',
    'housing_check',
    'med_price',
    'transfer_to_telehealth',
  ]);
  expect(claraTools.find((t) => t.name === 'transfer_to_telehealth')?.clientSide).toBe(true);
});
```

- [ ] **Step 5: `src/prompts.ts` — urgent band offers the transfer** (replace the `if (band)` block)

```ts
  if (band === 'urgent') {
    lines.push(
      "A deterministic triage engine rated the caller's latest message as \"urgent\" — not an emergency, but they should talk to a clinician soon. Offer to connect them right now to a telehealth clinician on this call; if they agree, call the transfer_to_telehealth tool."
    );
  } else if (band) {
    lines.push(
      `A deterministic triage engine rated the caller's latest message as "${band}". Respect it: primary means encourage seeing a clinician soon; self_care means reassure and offer OTC options.`
    );
  }
```

Test addition (`tests/prompts.test.ts`):

```ts
test('urgent band instructs Clara to offer the telehealth transfer', () => {
  const p = systemPrompt(null, 'urgent');
  expect(p).toContain('transfer_to_telehealth');
  expect(p).toContain('urgent');
});
```

- [ ] **Step 6: `src/server.ts` — transfer path.** Import `type TurnResult` alongside `complete`; add `streamTransfer`; the LLM-turn block becomes:

```ts
export function streamTransfer(res: ServerResponse, destination: string): void {
  const base = {
    id: `chatcmpl-clara-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'clara',
  };
  sseChunk(res, {
    ...base,
    choices: [
      {
        index: 0,
        delta: {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              index: 0,
              id: `call_transfer_${Date.now()}`,
              type: 'function',
              function: { name: 'transferCall', arguments: JSON.stringify({ destination }) },
            },
          ],
        },
        finish_reason: null,
      },
    ],
  });
  sseChunk(res, { ...base, choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] });
  res.write('data: [DONE]\n\n');
  res.end();
}
```

Inside the route handler (replacing the `let text` block):

```ts
    const transferNumber = process.env.TELEHEALTH_TRANSFER_NUMBER;
    const activeTools = transferNumber
      ? claraTools
      : claraTools.filter((t) => t.name !== 'transfer_to_telehealth');

    let result: TurnResult;
    try {
      result = await complete(messages, activeTools);
    } catch (err) {
      request.log.error(err, 'model provider failed after retry');
      result = { kind: 'text', text: APOLOGY };
    }

    if (result.kind === 'client_tool' && result.name === 'transfer_to_telehealth' && transferNumber) {
      request.log.info({ destination: transferNumber }, 'warm transfer to telehealth');
      streamTransfer(res, transferNumber);
      rememberTurn(phone, utterance, '(connected caller to a telehealth clinician)');
      return;
    }

    const text = result.kind === 'text' ? result.text : APOLOGY;
    streamText(res, text);
    rememberTurn(phone, utterance, text);
```

Test addition (`tests/server.test.ts`):

```ts
import { streamTransfer } from '../src/server';
import type { ServerResponse } from 'node:http';

test('streamTransfer emits a Vapi transferCall tool-call SSE turn', () => {
  const writes: string[] = [];
  const fake = {
    write: (s: string) => {
      writes.push(s);
      return true;
    },
    end: () => {},
  } as unknown as ServerResponse;
  streamTransfer(fake, '+15550001111');
  const joined = writes.join('');
  expect(joined).toContain('transferCall');
  expect(joined).toContain('+15550001111');
  expect(joined).toContain('"finish_reason":"tool_calls"');
  expect(joined.trim().endsWith('data: [DONE]')).toBe(true);
});
```

- [ ] **Step 7: Run everything, commit**

Run: `bun run typecheck && bun test && bun run smoke`
Expected: all green.

```bash
git add -A src tests .env.example
git commit -m "feat: telehealth warm transfer for urgent non-emergency triage"
```

Note: the gateway's client-tool short-circuit is exercised live (model must choose the tool);
offline coverage is the type system + tools/server/prompts tests. The live phone call is the
integration test, per spec §7.

---

## Post-build (not code, tracked outside this plan)

1. Nolan mints the care-API token (Keys tab, scopes `care:read` + `calls:read`, label `clara-hackathon`) → `.env` `CARE_API_TOKEN`, set `CARE_API_MOCK=0`. Re-check real-mode response field names for clinics/care/housing against the upstream OpenAPI.
2. Tunnel (`PUBLIC_URL`) + Vapi assistant custom-LLM URL + Twilio number import + first message "Hi, I'm Clara…".
3. **Vapi transfer config:** the assistant's `transferCall` tool must list `TELEHEALTH_TRANSFER_NUMBER` as a destination (Vapi matches the destination we emit against its configured list). Use Nolan's second number for the demo.
4. **Record the demo video EARLY** (Devpost requirement) — as soon as smoke passes in mock mode: screen-record a call + terminal showing the guardrail decision; keep secrets and the care API's base URL out of frame.
5. Live demo runs the 3-call script from spec §8 (+ a fourth urgent-transfer call if it landed).
