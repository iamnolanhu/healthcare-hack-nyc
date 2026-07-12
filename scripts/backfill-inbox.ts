// Backfills completed Vapi calls into the Sigma Synapses `conversations` table
// so they surface in the platform inbox. Use this to recover calls that
// bypassed (or were rejected by) the live webhook.
//
// It fetches recent calls for one assistant from the Vapi API, maps each to a
// conversation row (channel='voice' so the inbox renders a phone, not a globe),
// and upserts them via the Supabase PostgREST endpoint (conflict on
// vapi_call_id, so re-running is idempotent).
//
// Required env:
//   VAPI_API_KEY               Bearer for https://api.vapi.ai
//   VAPI_ASSISTANT_ID          which assistant's calls to fetch (Clara: 318f501e-fb0a-491a-ac07-d94594b8d5bb)
//   SUPABASE_URL               e.g. https://qhkhnbjmugzjumhaugnh.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  service role (bypasses RLS; used as apikey + Bearer)
//   ORG_ID                     target organization_id (Arya Health: c44afc2d-8060-4657-bcf8-923c2844509a)
//   AGENT_ID                   the vapi_agents row id (e.g. 05fc5764-88d3-46a8-8d67-286bf5a1ace4)
// Optional env:
//   SINCE      ISO date; only keep calls started at/after this instant
//   LIMIT      max calls to fetch from Vapi (default 100)
//   DRY_RUN=1  print mapped rows as JSON and do not write
//
// Usage: DRY_RUN=1 bun scripts/backfill-inbox.ts

export {}; // top-level await requires module context under tsc

const VAPI = "https://api.vapi.ai";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set in .env`);
  return v;
}

const vapiKey = need("VAPI_API_KEY");
const assistantId = need("VAPI_ASSISTANT_ID");
const supabaseUrl = need("SUPABASE_URL").replace(/\/$/, "");
const serviceKey = need("SUPABASE_SERVICE_ROLE_KEY");
const orgId = need("ORG_ID");
const agentId = need("AGENT_ID");
const since = process.env.SINCE;
const limit = Number(process.env.LIMIT ?? "100");
const dryRun = process.env.DRY_RUN === "1";

// Only the Vapi call fields this script reads. Vapi returns much more.
interface VapiCall {
  id: string;
  assistantId?: string;
  type?: string;
  status?: string;
  startedAt?: string;
  endedAt?: string;
  transcript?: string;
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  summary?: string;
  customer?: { number?: string; name?: string };
  artifact?: { transcript?: string; recordingUrl?: string };
  analysis?: { summary?: string };
}

// The conversation row shape we upsert. Kept minimal and explicit.
interface ConversationRow {
  vapi_call_id: string;
  organization_id: string;
  agent_id: string;
  contact_phone: string | null;
  contact_name: string | null;
  call_type: "inbound" | "outbound";
  call_status: "ringing" | "active" | "ended";
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  recording_url: string | null;
  summary: string | null;
  channel: "voice";
  status: "open";
  is_test: false;
  metadata: { vapi_assistant_id?: string; backfilled: true };
}

function mapCallStatus(status?: string): ConversationRow["call_status"] {
  switch (status) {
    case "queued":
    case "ringing":
      return "ringing";
    case "in-progress":
      return "active";
    default:
      // ended, forwarding, or anything else we treat as a completed call
      return "ended";
  }
}

function durationSeconds(startedAt: string, endedAt?: string): number | null {
  if (!endedAt) return null;
  const secs = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
  );
  return Number.isFinite(secs) && secs >= 0 ? secs : null;
}

function mapCall(call: VapiCall): ConversationRow {
  const startedAt = call.startedAt as string; // guaranteed by caller filter
  return {
    vapi_call_id: call.id,
    organization_id: orgId,
    agent_id: agentId,
    contact_phone: call.customer?.number ?? null,
    contact_name: call.customer?.name ?? null,
    call_type: call.type === "outboundPhoneCall" ? "outbound" : "inbound",
    call_status: mapCallStatus(call.status),
    started_at: startedAt,
    ended_at: call.endedAt ?? null,
    duration_seconds: durationSeconds(startedAt, call.endedAt),
    transcript: call.transcript ?? call.artifact?.transcript ?? null,
    recording_url:
      call.recordingUrl ??
      call.artifact?.recordingUrl ??
      call.stereoRecordingUrl ??
      null,
    summary: call.summary ?? call.analysis?.summary ?? null,
    channel: "voice", // REQUIRED: inbox renders a phone icon, not a globe
    status: "open",
    is_test: false,
    metadata: { vapi_assistant_id: call.assistantId, backfilled: true },
  };
}

async function fetchCalls(): Promise<VapiCall[]> {
  const url = `${VAPI}/call?assistantId=${encodeURIComponent(assistantId)}&limit=${limit}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${vapiKey}` },
  });
  const json = await res.json();
  if (!res.ok)
    throw new Error(`GET /call -> ${res.status}: ${JSON.stringify(json)}`);
  return json as VapiCall[];
}

async function upsert(rows: ConversationRow[]): Promise<void> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/conversations?on_conflict=vapi_call_id`,
    {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POST /conversations -> ${res.status}: ${body}`);
  }
}

const calls = await fetchCalls();
console.log(`fetched ${calls.length} call(s) for assistant ${assistantId}`);

const sinceMs = since ? new Date(since).getTime() : null;
const rows: ConversationRow[] = [];
let skipped = 0;

for (const call of calls) {
  if (!call.startedAt) {
    skipped++;
    console.log(`- ${call.id}: skipped (never connected, no startedAt)`);
    continue;
  }
  if (sinceMs !== null && new Date(call.startedAt).getTime() < sinceMs) {
    skipped++;
    console.log(`- ${call.id}: skipped (before SINCE=${since})`);
    continue;
  }
  const row = mapCall(call);
  rows.push(row);
  const dur = row.duration_seconds === null ? "?" : `${row.duration_seconds}s`;
  const from = row.contact_phone ?? "unknown";
  console.log(
    `- ${call.id}: from ${from}, ${dur} — ${dryRun ? "skipped (dry-run)" : "upserted"}`,
  );
}

if (dryRun) {
  console.log("\n--- DRY RUN: mapped rows (not written) ---");
  console.log(JSON.stringify(rows, null, 2));
} else if (rows.length > 0) {
  await upsert(rows);
}

console.log(
  `\ndone: ${rows.length} ${dryRun ? "mapped (dry-run)" : "upserted"}, ${skipped} skipped`,
);
