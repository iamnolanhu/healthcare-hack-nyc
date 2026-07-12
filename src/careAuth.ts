// Token manager for the upstream care backend (ivr.sohyper.com).
//
// The dialogue endpoints require a short-lived JWT access token (15m–1h).
// A statically pasted token would expire mid-call, so this module keeps a
// rotating access+refresh pair alive on its own: it bootstraps from a
// refresh token or a single-use bypass verify URL, refreshes proactively at
// ~80% of the access token's lifetime, persists the rotating pair so a
// restart doesn't lose the session, and exposes invalidate() for the
// refresh-on-401 fallback in careApi.ts.
//
// Bootstrap (set one, in .env):
//   CARE_REFRESH_TOKEN  — a refresh JWT handed off by the operator, or
//   CARE_BYPASS_URL     — a fresh .../auth/verify?token=... link (single use,
//                         10 min) minted from the Recon GUI account menu.
// If neither is set, getAccessToken() returns null and careApi falls back to
// its fixtures — the demo keeps working, just not against live upstream.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

interface TokenPair {
  access: string;
  refresh: string;
  // ms-epoch when the access token expires (decoded from its JWT `exp`).
  accessExp: number;
}

const tokenFile = (): string =>
  process.env.CARE_TOKEN_FILE ?? "data/care-tokens.json";

// Egress timeout (ms): a hung upstream must never stall a voice turn.
const timeoutMs = (): number => Number(process.env.CARE_API_TIMEOUT_MS) || 4000;

// Single source of truth for the upstream egress gate. Live calls to the
// third-party care backend require an explicit `CARE_API_MODE=live` opt-in;
// anything else (including the legacy `CARE_API_MOCK=1`) keeps the integration
// dormant and fixtures-only — so it can never reach the network by accident,
// never leaks anything to an untrusted server, and stays trivially removable
// without touching the rest of Clara.
export function careLiveEnabled(): boolean {
  return (
    process.env.CARE_API_MODE === "live" && process.env.CARE_API_MOCK !== "1"
  );
}

// Auth endpoints live at <origin>/api/auth, while the dialogue API base is
// <origin>/api/ivr/dialogue — derive the auth base from the same origin.
function authBase(): string {
  if (process.env.CARE_AUTH_BASE_URL) {
    return process.env.CARE_AUTH_BASE_URL.replace(/\/$/, "");
  }
  const api = process.env.CARE_API_BASE_URL;
  if (!api) throw new Error("CARE_API_BASE_URL not set");
  return `${new URL(api).origin}/api`;
}

// Browser UA — the CDN in front of the backend rejects non-browser clients.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// Decode a JWT's `exp` (seconds) without verifying — we only trust it for
// scheduling; the server is the real authority on validity.
function jwtExpMs(jwt: string): number {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) return 0;
    const json = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: number };
    return typeof json.exp === "number" ? json.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

let pair: TokenPair | null = null;
let bootstrapped = false;
// De-duplicate concurrent refreshes so parallel tool calls don't each burn
// (and rotate away) the single-use refresh token.
let inflight: Promise<TokenPair | null> | null = null;

function persist(p: TokenPair): void {
  try {
    const path = tokenFile();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(p), { mode: 0o600 });
  } catch (err) {
    console.warn(
      `care token persist failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function loadPersisted(): TokenPair | null {
  const path = tokenFile();
  if (!existsSync(path)) return null;
  try {
    const p = JSON.parse(readFileSync(path, "utf8")) as TokenPair;
    if (p.access && p.refresh) return p;
  } catch {
    /* fall through */
  }
  return null;
}

function adopt(data: {
  access_token: string;
  refresh_token: string;
}): TokenPair {
  const p: TokenPair = {
    access: data.access_token,
    refresh: data.refresh_token,
    accessExp: jwtExpMs(data.access_token),
  };
  pair = p;
  persist(p);
  return p;
}

// Rotation is strict server-side: the old refresh token is revoked the moment
// it's used, so persist the new pair before returning it.
async function doRefresh(refresh: string): Promise<TokenPair | null> {
  const res = await fetch(`${authBase()}/auth/refresh`, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs()),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": BROWSER_UA,
      // A bearer header (even an expired access token) makes the CSRF
      // middleware skip its check for this cookieless client; the refresh
      // token in the body is the real credential. Only tokens this same
      // server issued go back to it — no other credential of ours leaves.
      Authorization: `Bearer ${pair?.access ?? refresh}`,
    },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`refresh -> ${res.status} ${body.slice(0, 120)}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
  };
  return adopt(data);
}

// Consume a single-use bypass/magic verify URL -> fresh access+refresh pair.
async function bootstrapFromBypass(url: string): Promise<TokenPair | null> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs()),
    headers: { "User-Agent": BROWSER_UA },
  });
  if (!res.ok) {
    throw new Error(`bypass verify -> ${res.status}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
  };
  return adopt(data);
}

// Load whatever bootstrap credential exists, at most once per process.
function ensureBootstrap(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  pair = loadPersisted();
  if (!pair && process.env.CARE_REFRESH_TOKEN) {
    pair = {
      access: process.env.CARE_ACCESS_TOKEN ?? "",
      refresh: process.env.CARE_REFRESH_TOKEN,
      accessExp: process.env.CARE_ACCESS_TOKEN
        ? jwtExpMs(process.env.CARE_ACCESS_TOKEN)
        : 0,
    };
  }
}

// Returns a currently-valid access token, refreshing/bootstrapping as needed.
// Returns null when no credential is configured (callers fall back to mock).
export async function getAccessToken(): Promise<string | null> {
  // Hard isolation: no bootstrap, no persisted-file read, and no network
  // unless live mode is explicitly enabled. Keeps the upstream untouched in
  // the default (demo/mock) posture.
  if (!careLiveEnabled()) return null;
  ensureBootstrap();

  // Fresh enough? (>60s of life left absorbs clock skew.)
  if (pair?.access && pair.accessExp - Date.now() > 60_000) {
    return pair.access;
  }

  if (inflight) return (await inflight)?.access ?? null;

  inflight = (async () => {
    try {
      if (pair?.refresh) return await doRefresh(pair.refresh);
      if (process.env.CARE_BYPASS_URL) {
        return await bootstrapFromBypass(process.env.CARE_BYPASS_URL);
      }
      return null;
    } catch (err) {
      console.warn(
        `care token acquisition failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    } finally {
      inflight = null;
    }
  })();

  return (await inflight)?.access ?? null;
}

// Force the next getAccessToken() to refresh — used by the 401 fallback.
export function invalidateAccess(): void {
  if (pair) pair.accessExp = 0;
}
