// Typed client for the upstream care API (read-only integration).
// CARE_API_MOCK=1 serves realistic fixtures so the whole pipeline runs
// end-to-end with no token; the real token hot-swaps in via .env.

export type TriageBand =
  "crisis" | "emergency" | "urgent" | "primary" | "self_care";

export interface Triage {
  band: TriageBand;
  confidence: number;
  hardEscalate: "911" | "988" | null;
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

const mockEnabled = (): boolean => process.env.CARE_API_MOCK === "1";

function baseUrl(): string {
  const url = process.env.CARE_API_BASE_URL;
  if (!url) throw new Error("CARE_API_BASE_URL not set");
  return url.replace(/\/$/, "");
}

async function get<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${baseUrl()}${path}${qs ? `?${qs}` : ""}`;
  const headers = {
    Authorization: `Bearer ${process.env.CARE_API_TOKEN ?? ""}`,
  };
  let res = await fetch(url, { headers });
  if (res.status === 429) {
    // Care API rate limits fail fast with a retry_after; retry exactly once.
    const body = (await res.json().catch(() => ({}))) as {
      retry_after?: number;
    };
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

export async function medPrice(q: {
  symptoms?: string;
  drug?: string;
}): Promise<MedPriceResult> {
  if (mockEnabled()) {
    const symptoms = q.symptoms ?? q.drug ?? "";
    return {
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
    };
  }
  const params: Record<string, string> = {};
  if (q.symptoms) params.symptoms = q.symptoms;
  if (q.drug) params.drug = q.drug;
  return get<MedPriceResult>("/med-price", params);
}

export async function findClinics(q: {
  lat: number;
  lng: number;
}): Promise<Clinic[]> {
  if (mockEnabled()) {
    return [
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
    ];
  }
  return get<Clinic[]>("/care/clinics", {
    lat: String(q.lat),
    lng: String(q.lng),
  });
}

export async function careInfo(q: { question: string }): Promise<CareInfo> {
  if (mockEnabled()) {
    return {
      answer:
        "For a sore throat: rest, fluids, warm salt-water gargles, and OTC pain relief. " +
        "See a clinician if fever over 101F lasts more than 48 hours, swallowing becomes hard, " +
        "or symptoms last past a week.",
      sources: ["care-kb:sore-throat"],
    };
  }
  return get<CareInfo>("/care", { q: q.question });
}

export async function housingCheck(q: {
  address: string;
}): Promise<HousingCheck> {
  if (mockEnabled()) {
    return {
      violations: 3,
      complaints311: 7,
      summary:
        "3 open housing violations (2 for heat/hot water) and 7 recent 311 complaints at this address.",
    };
  }
  const [v, c] = await Promise.all([
    get<{ count: number }>("/housing/violations", { address: q.address }),
    get<{ count: number }>("/housing/complaints311", { address: q.address }),
  ]);
  return {
    violations: v.count,
    complaints311: c.count,
    summary: `${v.count} open violations and ${c.count} recent 311 complaints on file.`,
  };
}
