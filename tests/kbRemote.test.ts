import { afterEach, beforeEach, expect, test } from "bun:test";
import { kbLookup, resetKbCache } from "../src/kbRemote";

const originalFetch = globalThis.fetch;
const ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ARYA_KB_ID",
] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  resetKbCache();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  resetKbCache();
});

function setEnv(): void {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  process.env.ARYA_KB_ID = "kb-1";
}

test("missing env -> local source, no fetch call", async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.ARYA_KB_ID;
  let called = false;
  globalThis.fetch = (() => {
    called = true;
    return Promise.reject(new Error("should not fetch"));
  }) as unknown as typeof fetch;

  const result = await kbLookup("hours");
  expect(result.source).toBe("local");
  expect(called).toBe(false);
});

test("env set + fetch rejects -> local source", async () => {
  setEnv();
  globalThis.fetch = (() =>
    Promise.reject(new Error("network down"))) as unknown as typeof fetch;

  const result = await kbLookup("hours");
  expect(result.source).toBe("local");
});

test("env set + 200 with docs -> scored remote doc, sigma source", async () => {
  setEnv();
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    return Promise.resolve(
      new Response(
        JSON.stringify([
          {
            id: "x",
            title: "Telehealth hours",
            content: "Telehealth transfers run eight to ten daily.",
          },
        ]),
        { status: 200 },
      ),
    );
  }) as unknown as typeof fetch;

  const result = await kbLookup("telehealth hours");
  expect(result.source).toBe("sigma");
  expect(result.results).toHaveLength(1);
  expect(result.results[0]?.id).toBe("x");
  expect(calls).toBe(1);
});

test("cache: two lookups within TTL make exactly one fetch call", async () => {
  setEnv();
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    return Promise.resolve(
      new Response(
        JSON.stringify([
          { id: "x", title: "Telehealth hours", content: "Runs daily." },
        ]),
        { status: 200 },
      ),
    );
  }) as unknown as typeof fetch;

  await kbLookup("telehealth hours");
  await kbLookup("telehealth hours");
  expect(calls).toBe(1);
});

test("empty doc list from remote -> falls back to local", async () => {
  setEnv();
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(JSON.stringify([]), { status: 200 }),
    )) as unknown as typeof fetch;

  const result = await kbLookup("hours");
  expect(result.source).toBe("local");
});
