# Arya Health Knowledge Base — Design & Task Plan (2026-07-11)

Approved design: the Arya Health KB lives in the **Sigma Synapses platform**
(source of truth) and grounds **Clara's live calls** through a new `kb_search`
tool in the gateway. The repo carries the seed content, which doubles as the
offline fallback.

## Decisions (user-approved)

1. **KB attaches in the Clara gateway** — Clara is a Vapi `custom-llm`
   assistant; Vapi never does retrieval, the gateway owns all cognition.
2. **Content**: Arya org facts (~7) + expanded care guidance (~10) + NYC
   resource navigation (~5). Spoken-friendly, safety-reviewed bodies.
3. **Retrieval**: new `kb_search` tool, in-process keyword scoring (no
   embeddings — voice latency budget).
4. **Sigma = source of truth**: entries seeded into the platform's native KB
   tables for org Arya Health; `kb_search` fetches docs from Supabase with a
   45s in-memory cache and falls back to the in-repo entries on any failure
   (same degraded-not-broken pattern as `careApi.realOrMock`).

## Sigma dev facts (verified)

- Supabase project `qhkhnbjmugzjumhaugnh` (dev). Tables: `knowledge_bases`,
  `knowledge_documents`, `knowledge_chunks`, `agent_knowledge_bases`.
- Valid values in the wild: `knowledge_bases.type='document'`,
  `status='active'`; `knowledge_documents.embedding_status` ∈
  pending|processing|completed|failed.
- `knowledge_chunks.search_vector` is **GENERATED ALWAYS** from `content` —
  seeding plain text gives the platform BM25 search for free. `embedding` may
  stay NULL (hybrid RRF still works on the BM25 arm).
- Org Arya Health `ORG_ID=c44afc2d-8060-4657-bcf8-923c2844509a`; Clara's
  `vapi_agents` row `AGENT_ID=05fc5764-88d3-46a8-8d67-286bf5a1ace4`.
- Dashboard UI: `/knowledge` pages render documents; edits set
  `embedding_status='pending'` — irrelevant to Clara, who reads `content`.

## Architecture

```
Sigma dev Supabase (knowledge_documents)          src/kb.ts (KB_ENTRIES)
        │  PostgREST fetch, 45s cache                    │ fallback + seed source
        └────────────► src/kbRemote.ts ◄─────────────────┘
                            │ kbLookup(query)
                            ▼
                 src/tools.ts kb_search tool ──► model (gateway loop)
```

### Contract: `src/kb.ts`

```ts
export interface KbEntry { id: string; title: string; keywords: string[]; body: string }
export interface KbHit   { id: string; title: string; body: string }
export const KB_ENTRIES: KbEntry[];
export function searchKb(query: string, entries?: KbEntry[], limit?: number): KbHit[]
```

Scorer: lowercase-tokenize the query on non-letters; per entry score
+3/keyword hit, +2/title hit, +1/body hit; keep score>0; top `limit`
(default 3). Zero hits → `[]`; the tool layer reports "no knowledge found"
so the model says it doesn't know instead of inventing.

### Contract: `src/kbRemote.ts`

```ts
export function kbLookup(query: string): Promise<{ results: KbHit[]; source: "sigma" | "local" }>
```

Fetch `GET {SUPABASE_URL}/rest/v1/knowledge_documents?knowledge_base_id=eq.{ARYA_KB_ID}
&deleted_at=is.null&select=id,title,content` (headers `apikey` + `Authorization:
Bearer` service key). Map rows → KbEntry (`keywords: []`). Cache the doc list
in-memory 45s. Missing env or ANY error → score over local `KB_ENTRIES`
(`source: "local"`). Never throw.

### Tool: `kb_search` (src/tools.ts)

`{ query: string }` (required) → `graceful(JSON.stringify(await kbLookup(query)))`.
Description tells the model: use for questions about Arya Health itself
(services, hours, cost, telehealth transfer, coverage), self-care guidance,
insurance/Medicaid, NYC resources.

### Prompt (src/prompts.ts)

One base-persona line: Clara is operated by Arya Health; use `kb_search` for
questions about the organization, general care guidance, or NYC resources.
Identity never goes in channel overlays.

### Seeding: `scripts/seed-kb.ts`

Mirrors `backfill-inbox.ts` (service-role PostgREST, `DRY_RUN=1`, idempotent).
Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ORG_ID`, `AGENT_ID`.
1. Find-or-create `knowledge_bases` row "Arya Health Care Knowledge"
   (`type='document'`, `status='active'`).
2. Upsert each `KB_ENTRIES` entry as a `knowledge_documents` row (match by
   title within the KB; `embedding_status='completed'`,
   `metadata={slug,seeded:true}`) + exactly one `knowledge_chunks` row
   (`chunk_index=0`, replace on update).
3. Ensure `agent_knowledge_bases` link (agent ↔ KB, `primary_order=0`).
4. Print `ARYA_KB_ID=<id>` for the runtime env.

### Deploy

Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ARYA_KB_ID` to
`/root/clara-app/clara.runtime` on the ftwr box; `git pull` + restart the
`clara-care` container. No Vapi changes. **Caveat**: service-role key on
personal infra is a hackathon-scope tradeoff (dev project only).

### Safety

Guardrail is untouched and still runs before the model every turn. Care
bodies include red-flag "call 911/988" lines where relevant and never
contradict the guardrail scripts.

## Tasks (parallel, disjoint files)

- **A — content**: fill `KB_ENTRIES` in `src/kb.ts` (~22 entries) +
  `tests/kb.test.ts` for the scorer.
- **B — retrieval**: `src/kbRemote.ts`, `kb_search` in `src/tools.ts`,
  prompt line in `src/prompts.ts`, tests (fallback path included).
- **C — seeding**: `scripts/seed-kb.ts`.
- **Integrate (main session)**: full suite, seed dev DB, deploy ftwr, live
  verify, final review.

## Demo beat

Open Knowledge page in Arya Health workspace → edit a fact → call Clara →
she answers with the new fact within ~45s. Platform-managed knowledge, live
phone line, no redeploy.
