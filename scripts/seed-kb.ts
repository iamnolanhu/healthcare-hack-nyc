// Seeds the Arya Health knowledge base (src/kb.ts KB_ENTRIES) into the Sigma
// Synapses platform's knowledge tables, so the live agent can retrieve it via
// the platform's own KB search instead of only the in-process offline
// fallback. Idempotent: re-running finds the existing KB and documents by
// name/title and updates them in place rather than duplicating.
//
// Flow: find-or-create the knowledge base -> load its existing documents ->
// upsert one knowledge_documents row per KB_ENTRIES entry (matched by exact
// title) -> replace that document's knowledge_chunks with a single chunk ->
// ensure an agent_knowledge_bases link exists.
//
// Required env:
//   SUPABASE_URL               e.g. https://qhkhnbjmugzjumhaugnh.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  service role (bypasses RLS; used as apikey + Bearer)
//   ORG_ID                     target organization_id (Arya Health: c44afc2d-8060-4657-bcf8-923c2844509a)
//   AGENT_ID                   the vapi_agents row id (e.g. 05fc5764-88d3-46a8-8d67-286bf5a1ace4)
// Optional env:
//   KB_NAME    knowledge_bases.name to find-or-create (default "Arya Health Care Knowledge")
//   DRY_RUN=1  perform reads only, log what would change, and do not write
//
// Usage: DRY_RUN=1 bun scripts/seed-kb.ts

export {}; // top-level await requires module context under tsc

import { KB_ENTRIES } from "../src/kb";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set in .env`);
  return v;
}

const supabaseUrl = need("SUPABASE_URL").replace(/\/$/, "");
const serviceKey = need("SUPABASE_SERVICE_ROLE_KEY");
const orgId = need("ORG_ID");
const agentId = need("AGENT_ID");
const kbName = process.env.KB_NAME ?? "Arya Health Care Knowledge";
const dryRun = process.env.DRY_RUN === "1";

// Only the fields this script reads/writes on each table. Sigma's schema
// carries more columns; we never touch the ones not listed here (e.g. the
// GENERATED search_vector on knowledge_chunks, or embedding, which stays NULL).
interface KnowledgeBaseRow {
  id: string;
}

interface KnowledgeDocumentRow {
  id: string;
  title: string;
}

interface AgentKnowledgeBaseRow {
  id: string;
}

async function pgrest<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const res = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function findKb(): Promise<KnowledgeBaseRow | null> {
  const rows = await pgrest<KnowledgeBaseRow[]>(
    "GET",
    `/knowledge_bases?organization_id=eq.${orgId}&name=eq.${encodeURIComponent(
      kbName,
    )}&deleted_at=is.null&select=id`,
  );
  return rows[0] ?? null;
}

async function createKb(): Promise<KnowledgeBaseRow> {
  const rows = await pgrest<KnowledgeBaseRow[]>(
    "POST",
    "/knowledge_bases",
    {
      organization_id: orgId,
      name: kbName,
      description:
        "Org facts, care guidance, and NYC resources grounding Clara, Arya Health's AI care line.",
      type: "document",
      status: "active",
      metadata: { seeded_by: "seed-kb" },
    },
    { Prefer: "return=representation" },
  );
  const row = rows[0];
  if (!row) throw new Error("POST /knowledge_bases returned no row");
  return row;
}

async function loadExistingDocs(kbId: string): Promise<KnowledgeDocumentRow[]> {
  return pgrest<KnowledgeDocumentRow[]>(
    "GET",
    `/knowledge_documents?knowledge_base_id=eq.${kbId}&deleted_at=is.null&select=id,title`,
  );
}

async function updateDoc(
  docId: string,
  entry: (typeof KB_ENTRIES)[number],
): Promise<void> {
  await pgrest("PATCH", `/knowledge_documents?id=eq.${docId}`, {
    content: entry.body,
    embedding_status: "completed",
    metadata: { slug: entry.id, seeded: true },
  });
}

async function createDoc(
  kbId: string,
  entry: (typeof KB_ENTRIES)[number],
): Promise<KnowledgeDocumentRow> {
  const rows = await pgrest<KnowledgeDocumentRow[]>(
    "POST",
    "/knowledge_documents",
    {
      knowledge_base_id: kbId,
      organization_id: orgId,
      title: entry.title,
      content: entry.body,
      embedding_status: "completed",
      metadata: { slug: entry.id, seeded: true },
    },
    { Prefer: "return=representation" },
  );
  const row = rows[0];
  if (!row) throw new Error("POST /knowledge_documents returned no row");
  return row;
}

async function replaceChunks(
  docId: string,
  entry: (typeof KB_ENTRIES)[number],
): Promise<void> {
  await pgrest("DELETE", `/knowledge_chunks?document_id=eq.${docId}`);
  await pgrest("POST", "/knowledge_chunks", {
    document_id: docId,
    organization_id: orgId,
    content: entry.body,
    chunk_index: 0,
    metadata: { slug: entry.id },
  });
}

async function ensureAgentLink(kbId: string): Promise<void> {
  // kbId is the "(new)" placeholder only when DRY_RUN found no existing KB;
  // there is no real id to query against yet, so skip straight to the log.
  const rows =
    dryRun && kbId === "(new)"
      ? []
      : await pgrest<AgentKnowledgeBaseRow[]>(
          "GET",
          `/agent_knowledge_bases?agent_id=eq.${agentId}&knowledge_base_id=eq.${kbId}&select=id`,
        );
  if (rows.length > 0) {
    console.log("agent_knowledge_bases: link already exists");
    return;
  }
  if (dryRun) {
    console.log("agent_knowledge_bases: would create link (dry-run)");
    return;
  }
  await pgrest("POST", "/agent_knowledge_bases", {
    agent_id: agentId,
    knowledge_base_id: kbId,
    organization_id: orgId,
    primary_order: 0,
  });
  console.log("agent_knowledge_bases: created link");
}

let kb = await findKb();
let kbId: string;
if (kb) {
  kbId = kb.id;
  console.log(`knowledge_base "${kbName}": found (${kbId})`);
} else if (dryRun) {
  kbId = "(new)";
  console.log(`knowledge_base "${kbName}": would create (dry-run)`);
} else {
  kb = await createKb();
  kbId = kb.id;
  console.log(`knowledge_base "${kbName}": created (${kbId})`);
}

const existingDocs =
  dryRun && kbId === "(new)" ? [] : await loadExistingDocs(kbId);

let created = 0;
let updated = 0;

for (const entry of KB_ENTRIES) {
  const existing = existingDocs.find((d) => d.title === entry.title);
  if (dryRun) {
    console.log(
      `- ${entry.id}: ${existing ? "would update" : "would create"} (dry-run)`,
    );
    continue;
  }
  if (existing) {
    await updateDoc(existing.id, entry);
    await replaceChunks(existing.id, entry);
    updated++;
    console.log(`- ${entry.id}: updated`);
  } else {
    const doc = await createDoc(kbId, entry);
    await replaceChunks(doc.id, entry);
    created++;
    console.log(`- ${entry.id}: created`);
  }
}

await ensureAgentLink(kbId);

console.log(
  `\ndone: ${dryRun ? `${KB_ENTRIES.length} mapped (dry-run)` : `${created} created, ${updated} updated`}`,
);
console.log(`ARYA_KB_ID=${kbId}`);
