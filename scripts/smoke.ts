// Exercises the endpoint with fake Vapi payloads — no telephony needed.
// Turn 1 (emergency) must return the fixed script with ZERO LLM calls.
// Turn 2 (normal) needs a provider key; skipped with a warning otherwise.

process.env.CARE_API_MOCK = process.env.CARE_API_MOCK ?? "1";
process.env.MEMORY_FILE = "data/smoke-profiles.json";

import { rmSync } from "node:fs";
import { stats } from "../src/gateway";
import { buildServer } from "../src/server";

function vapiPayload(utterance: string, phone = "+15551234567"): unknown {
  return {
    model: "clara",
    stream: true,
    messages: [
      {
        role: "assistant",
        content: "Hi, I'm Clara. How can I help you today?",
      },
      { role: "user", content: utterance },
    ],
    call: { customer: { number: phone } },
  };
}

async function post(base: string, payload: unknown): Promise<string> {
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
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

const app = buildServer();
await app.listen({ port: 3999, host: "127.0.0.1" });
const base = "http://127.0.0.1:3999";
let failed = false;

// 1. Emergency turn — scripted, zero LLM calls.
const before = stats.llmCalls;
const emergency = await post(
  base,
  vapiPayload("I have chest pain and my arm is numb"),
);
const llmUsed = stats.llmCalls - before;
if (llmUsed !== 0) {
  console.error(`FAIL emergency path reached the LLM ${llmUsed} time(s)`);
  failed = true;
} else if (!emergency.includes("9 1 1")) {
  console.error(`FAIL emergency reply is not the script: ${emergency}`);
  failed = true;
} else {
  console.log("PASS emergency turn: scripted 911 escalation, zero LLM calls");
}

// 2. Normal turn — expects an LLM-generated grounded reply.
const provider = process.env.MODEL_PROVIDER ?? "anthropic";
const hasKey = Boolean(
  provider === "openai"
    ? process.env.OPENAI_API_KEY
    : process.env.ANTHROPIC_API_KEY,
);
if (!hasKey) {
  console.log(`SKIP normal turn: no API key for provider "${provider}"`);
} else {
  const normal = await post(
    base,
    vapiPayload(
      "I have a sore throat — what can I take, and where's a cheap clinic near midtown?",
    ),
  );
  if (normal.length < 10 || normal.includes("9 1 1")) {
    console.error(`FAIL normal turn: ${JSON.stringify(normal)}`);
    failed = true;
  } else {
    console.log(
      `PASS normal turn: ${normal.slice(0, 140)}${normal.length > 140 ? "…" : ""}`,
    );
  }
}

await app.close();
rmSync("data/smoke-profiles.json", { force: true });
process.exit(failed ? 1 : 0);
