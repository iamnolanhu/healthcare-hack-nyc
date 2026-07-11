import { afterAll, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import type { ServerResponse } from "node:http";

process.env.CARE_API_MOCK = "1";
process.env.MEMORY_FILE = "data/test-server-profiles.json";

import { stats } from "../src/gateway";
import { SCRIPT_911 } from "../src/guardrail";
import { loadProfile } from "../src/memory";
import { buildServer, streamTransfer } from "../src/server";

const app = buildServer();

afterAll(async () => {
  await app.close();
  rmSync("data/test-server-profiles.json", { force: true });
});

function sseText(raw: string): string {
  return raw
    .split("\n")
    .filter((l) => l.startsWith("data: ") && !l.includes("[DONE]"))
    .map(
      (l) =>
        JSON.parse(l.slice(6)) as {
          choices: Array<{ delta: { content?: string } }>;
        },
    )
    .map((c) => c.choices[0]?.delta.content ?? "")
    .join("");
}

test("emergency turn streams the scripted 911 SSE and never calls the LLM", async () => {
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const before = stats.llmCalls;

  const res = await fetch(`http://127.0.0.1:${port}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "clara",
      stream: true,
      messages: [
        {
          role: "assistant",
          content: "Hi, I'm Clara. How can I help you today?",
        },
        { role: "user", content: "I have chest pain and my arm is numb" },
      ],
      call: { customer: { number: "+15559999999" } },
    }),
  });

  expect(res.headers.get("content-type")).toContain("text/event-stream");
  const raw = await res.text();
  expect(raw.trim().endsWith("data: [DONE]")).toBe(true);
  expect(sseText(raw)).toBe(SCRIPT_911);
  expect(stats.llmCalls).toBe(before); // the LLM was never consulted
  expect(loadProfile("+15559999999")).not.toBeNull(); // turn was remembered
});

test("streamTransfer emits a Vapi transferCall tool-call SSE turn", () => {
  const writes: string[] = [];
  const fake = {
    write: (s: string) => {
      writes.push(s);
      return true;
    },
    end: () => {},
  } as unknown as ServerResponse;
  streamTransfer(fake, "+15550001111");
  const joined = writes.join("");
  expect(joined).toContain("transferCall");
  expect(joined).toContain("+15550001111");
  expect(joined).toContain('"finish_reason":"tool_calls"');
  expect(joined.trim().endsWith("data: [DONE]")).toBe(true);
});
