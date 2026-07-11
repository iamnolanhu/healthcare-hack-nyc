// Sigma Synapses knowledge base client: the Arya Health org's Supabase
// (PostgREST) content is the source of truth at runtime, with a short
// in-memory cache. Same "degraded ≠ broken" philosophy as
// careApi.realOrMock — read src/careApi.ts lines 121-137.

import { KB_ENTRIES, searchKb, type KbEntry, type KbHit } from "./kb";

export interface KbLookupResult {
  results: KbHit[];
  source: "sigma" | "local";
}

const CACHE_TTL_MS = 45_000;

let cache: { docs: KbEntry[]; expiresAt: number } | null = null;

export function resetKbCache(): void {
  cache = null;
}

interface RemoteRow {
  id: string;
  title: string | null;
  content: string | null;
}

function mapRows(rows: RemoteRow[]): KbEntry[] {
  return rows
    .filter((r) => (r.title ?? "").length > 0 || (r.content ?? "").length > 0)
    .map((r) => ({
      id: r.id,
      title: r.title ?? "",
      keywords: [],
      body: r.content ?? "",
    }));
}

// Any fetch error, non-OK status, or empty doc list falls back to the
// local KB_ENTRIES — Supabase being down must never break a live call.
async function fetchRemoteDocs(): Promise<KbEntry[] | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const kbId = process.env.ARYA_KB_ID;
  if (!url || !key || !kbId) return null;

  if (cache && cache.expiresAt > Date.now()) return cache.docs;

  try {
    const endpoint =
      `${url.replace(/\/$/, "")}/rest/v1/knowledge_documents` +
      `?knowledge_base_id=eq.${kbId}&deleted_at=is.null&select=id,title,content`;
    // A hung connection must not stall a live voice turn — cap the wait
    // and let the local fallback answer instead.
    const res = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`kb API ${res.status}`);
    const rows = (await res.json()) as RemoteRow[];
    const docs = mapRows(rows);
    if (docs.length === 0) throw new Error("kb API returned no documents");
    cache = { docs, expiresAt: Date.now() + CACHE_TTL_MS };
    return docs;
  } catch (err) {
    console.warn(
      `kb API unavailable, serving local fallback: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

export async function kbLookup(query: string): Promise<KbLookupResult> {
  const docs = await fetchRemoteDocs();
  if (docs) return { results: searchKb(query, docs), source: "sigma" };
  return { results: searchKb(query, KB_ENTRIES), source: "local" };
}
