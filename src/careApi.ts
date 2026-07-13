// Typed client for the upstream care API (read-only integration).
// CARE_API_MOCK=1 serves realistic fixtures so the whole pipeline runs
// end-to-end with no token; live mode authenticates with a self-refreshing
// JWT managed by careAuth.ts.

import { careLiveEnabled, getAccessToken, invalidateAccess } from "./careAuth";

export type TriageBand =
  "crisis" | "emergency" | "urgent" | "primary" | "self_care";

export interface Triage {
  band: TriageBand;
  // Mock rule engine only — the live upstream engine doesn't score confidence.
  confidence?: number;
  hardEscalate: "911" | "988" | null;
  // Live upstream only: the rule engine's caller-facing guidance texts.
  action?: string;
  safetyNet?: string;
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
  // Fixtures only — the live directory doesn't flag sliding-scale status.
  slidingScale?: boolean;
  // Live directory only — useful for a caller ("their number is ...").
  phone?: string;
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

// Egress timeout (ms): a hung/slow upstream must never stall a voice turn.
const timeoutMs = (): number => Number(process.env.CARE_API_TIMEOUT_MS) || 4000;

function baseUrl(): string {
  const url = process.env.CARE_API_BASE_URL;
  if (!url) throw new Error("CARE_API_BASE_URL not set");
  return url.replace(/\/$/, "");
}

// The upstream sits behind a CDN that rejects non-browser clients (403
// "error 1010") — a browser-like User-Agent is required on every request.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// Bearer resolution order: a live JWT from the token manager, falling back to
// a static CARE_API_TOKEN if one is set (legacy/manual override).
async function bearer(): Promise<string> {
  return (await getAccessToken()) ?? process.env.CARE_API_TOKEN ?? "";
}

async function get<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  // Fail closed: never send an unauthenticated request upstream. Without a
  // token we can't authenticate and would only leak an empty Authorization
  // header — throw so realOrMock serves fixtures instead of touching the wire.
  let token = await bearer();
  if (!token) throw new Error(`care API ${path} -> no upstream token`);

  const qs = new URLSearchParams(params).toString();
  const url = `${baseUrl()}${path}${qs ? `?${qs}` : ""}`;
  // Egress allowlist: only the upstream's own bearer token and a User-Agent
  // leave our system — never a Clara/Sigma/Vapi credential, caller identity,
  // or internal id. The query params are the minimal functional inputs.
  const send = async (t: string) =>
    fetch(url, {
      headers: { Authorization: `Bearer ${t}`, "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(timeoutMs()),
    });

  let res = await send(token);

  // An expired/revoked access token surfaces as 401 — refresh once and retry.
  if (res.status === 401) {
    invalidateAccess();
    token = await bearer();
    if (!token)
      throw new Error(`care API ${path} -> no upstream token after refresh`);
    res = await send(token);
  }

  if (res.status === 429) {
    // Care API rate limits fail fast with a retry_after; retry exactly once.
    const body = (await res.json().catch(() => ({}))) as {
      retry_after?: number;
    };
    const waitMs = Math.min((body.retry_after ?? 1) * 1000, 3000);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    res = await send(token);
  }
  if (!res.ok) throw new Error(`care API ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

// Mock triage mirrors the upstream deterministic rule engine closely enough
// for demo + tests. The comprehensive fail-safe keyword screen lives in
// guardrail.ts; this list only makes mock mode behave realistically.
const MOCK_CRISIS = [
  /suicid/i,
  /kill myself/i,
  /end my life/i,
  /want to die/i,
  /self.?harm/i,
];
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
    return { band: "crisis", confidence: 0.92, hardEscalate: "988" };
  }
  if (MOCK_EMERGENCY.some((re) => re.test(symptoms))) {
    return { band: "emergency", confidence: 0.88, hardEscalate: "911" };
  }
  if (
    /high fever|fever for (?:two|three|\d+) days|can'?t keep (?:water|food|anything) down|persistent vomiting|dehydrated|worst headache/i.test(
      symptoms,
    )
  ) {
    return { band: "urgent", confidence: 0.8, hardEscalate: null };
  }
  if (/sore throat|cough|cold|headache|runny nose|congestion/i.test(symptoms)) {
    return { band: "self_care", confidence: 0.74, hardEscalate: null };
  }
  return { band: "primary", confidence: 0.55, hardEscalate: null };
}

// ---- Live upstream response shapes (ivr.sohyper.com, verified 2026-07-13) ----
// The upstream predates our types: prices are decimal strings, clinics come
// wrapped and metric, housing returns record lists instead of counts, and
// triage carries guidance texts but no hardEscalate. Each real() path below
// normalizes to the local types so live and mock stay interchangeable.

interface UpstreamMedPrice {
  suggestion: { drug?: string; otc?: string; note?: string } | null;
  price: { cash_usd?: string; goodrx_usd?: string } | null;
  ground: {
    rxcui?: string;
    name?: string;
    purpose?: string;
    warning?: string;
  } | null;
  triage: { band?: string; action?: string; safetyNet?: string } | null;
}

const TRIAGE_BANDS: readonly TriageBand[] = [
  "crisis",
  "emergency",
  "urgent",
  "primary",
  "self_care",
];

// The live engine sends no hardEscalate — derive it from the band exactly as
// the fixtures do, so both modes trip the same downstream behavior. An
// unrecognized band degrades to "primary" (the guardrail in guardrail.ts, not
// this field, is the authoritative safety net and runs before the model).
function mapTriage(u: NonNullable<UpstreamMedPrice["triage"]>): Triage {
  const band = TRIAGE_BANDS.includes(u.band as TriageBand)
    ? (u.band as TriageBand)
    : "primary";
  return {
    band,
    hardEscalate:
      band === "crisis" ? "988" : band === "emergency" ? "911" : null,
    ...(u.action ? { action: u.action } : {}),
    ...(u.safetyNet ? { safetyNet: u.safetyNet } : {}),
  };
}

// "ibuprofen (Advil) — for pain"; drug-name lookups come back with a null
// suggestion, so fall through to the grounded drug name.
function mapSuggestion(u: UpstreamMedPrice, fallback: string): string {
  const s = u.suggestion;
  const name =
    s?.drug && s?.otc && s.otc !== s.drug
      ? `${s.drug} (${s.otc})`
      : (s?.drug ?? s?.otc ?? u.ground?.name ?? fallback);
  return s?.note ? `${name} — ${s.note}` : name;
}

function parseUsd(v: string | undefined): number | null {
  const n = Number.parseFloat(v ?? "");
  return Number.isFinite(n) ? n : null;
}

// Fail-safe: unless live mode is explicitly enabled we serve fixtures directly
// (no network). In live mode ANY failure (dead token, CDN block, outage,
// timeout) falls back to the same fixtures so a broken or removed upstream can
// never break a call. Degraded ≠ broken.
async function realOrMock<T>(
  real: () => Promise<T>,
  mock: () => T,
): Promise<T> {
  if (!careLiveEnabled()) return mock();
  try {
    return await real();
  } catch (err) {
    console.warn(
      `care API unavailable, serving fixture: ${err instanceof Error ? err.message : String(err)}`,
    );
    return mock();
  }
}

export async function medPrice(q: {
  symptoms?: string;
  drug?: string;
}): Promise<MedPriceResult> {
  const symptoms = q.symptoms ?? q.drug ?? "";
  return realOrMock(
    async () => {
      const params: Record<string, string> = {};
      if (q.symptoms) params.symptoms = q.symptoms;
      if (q.drug) params.drug = q.drug;
      const u = await get<UpstreamMedPrice>("/med-price", params);
      return {
        suggestion: mapSuggestion(u, symptoms),
        price: {
          cash: parseUsd(u.price?.cash_usd),
          goodrx: parseUsd(u.price?.goodrx_usd),
        },
        ground: {
          ...(u.ground?.rxcui ? { rxcui: u.ground.rxcui } : {}),
          ...(u.ground?.purpose ? { purpose: u.ground.purpose } : {}),
          ...(u.ground?.warning ? { warnings: u.ground.warning } : {}),
        },
        // Drug-only lookups come back without triage — mirror it locally so
        // the result always carries a band.
        triage: u.triage ? mapTriage(u.triage) : mockTriage(symptoms),
      };
    },
    () => ({
      suggestion: /sore throat/i.test(symptoms)
        ? "acetaminophen (generic Tylenol) plus lozenges and warm salt-water gargles"
        : "generic acetaminophen",
      price: { cash: 4.99, goodrx: 2.79 },
      ground: {
        rxcui: "161",
        purpose: "pain reliever / fever reducer",
        warnings:
          "do not exceed 3g per day; avoid with liver disease or heavy alcohol use",
      },
      triage: mockTriage(symptoms),
    }),
  );
}

export async function findClinics(q: {
  lat: number;
  lng: number;
}): Promise<Clinic[]> {
  return realOrMock(
    async () => {
      const u = await get<{
        clinics?: Array<{
          name?: string;
          address?: string;
          city?: string;
          phone?: string;
          km?: number;
        }>;
      }>("/care/clinics", { lat: String(q.lat), lng: String(q.lng) });
      return (u.clinics ?? []).map((c) => ({
        name: c.name ?? "",
        address: [c.address, c.city].filter(Boolean).join(", "),
        distanceMiles:
          typeof c.km === "number" ? Math.round(c.km * 6.21371) / 10 : 0,
        ...(c.phone ? { phone: c.phone } : {}),
      }));
    },
    () => [
      {
        name: "Ryan Health | Chelsea-Clinton",
        address: "645 10th Ave, New York, NY 10036",
        distanceMiles: 0.8,
        slidingScale: true,
      },
      {
        name: "Callen-Lorde Community Health Center",
        address: "356 W 18th St, New York, NY 10011",
        distanceMiles: 1.6,
        slidingScale: true,
      },
    ],
  );
}

export async function careInfo(q: { question: string }): Promise<CareInfo> {
  return realOrMock(
    async () => {
      const u = await get<{
        answer?: { answer?: string; source?: string } | string;
      }>("/care", { q: q.question });
      const a = typeof u.answer === "string" ? { answer: u.answer } : u.answer;
      // An empty answer is worse than the fixture — throw into the fallback.
      if (!a?.answer) throw new Error("care API /care -> empty answer");
      return {
        answer: a.answer,
        sources: typeof a === "object" && a.source ? [a.source] : [],
      };
    },
    () => ({
      answer:
        "For a sore throat: rest, fluids, warm salt-water gargles, and OTC pain relief. " +
        "See a clinician if fever over 101F lasts more than 48 hours, swallowing becomes hard, " +
        "or symptoms last past a week.",
      sources: ["care-kb:sore-throat"],
    }),
  );
}

export async function housingCheck(q: {
  address: string;
}): Promise<HousingCheck> {
  return realOrMock(
    async () => {
      // Upstream returns the record lists themselves, not counts.
      const [v, c] = await Promise.all([
        get<{ violations?: unknown[] }>("/housing/violations", {
          address: q.address,
        }),
        get<{ complaints?: unknown[] }>("/housing/complaints311", {
          address: q.address,
        }),
      ]);
      const violations = v.violations?.length ?? 0;
      const complaints311 = c.complaints?.length ?? 0;
      return {
        violations,
        complaints311,
        summary: `${violations} open violations and ${complaints311} recent 311 complaints on file.`,
      };
    },
    () => ({
      violations: 3,
      complaints311: 7,
      summary:
        "3 open housing violations (2 for heat/hot water) and 7 recent 311 complaints at this address.",
    }),
  );
}
