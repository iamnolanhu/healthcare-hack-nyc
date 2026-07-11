// One OpenAI-compatible SSE endpoint that Vapi points at as its custom
// LLM. Vapi owns all audio; this server owns all cognition, in strict
// order: profile -> guardrail -> model+tools -> remember.

import Fastify, { type FastifyInstance } from "fastify";
import type { ServerResponse } from "node:http";
import { complete, type ChatMessage, type TurnResult } from "./gateway";
import { checkGuardrail } from "./guardrail";
import { loadProfile, rememberTurn } from "./memory";
import { systemPrompt } from "./prompts";
import { claraTools } from "./tools";

interface VapiChatRequest {
  messages?: Array<{ role?: string; content?: string | null }>;
  call?: { customer?: { number?: string } };
  customer?: { number?: string };
}

const APOLOGY =
  "I'm so sorry — I'm having trouble on my end right now. Please call me back in a couple of minutes.";

function sseChunk(res: ServerResponse, payload: unknown): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function streamText(res: ServerResponse, text: string): void {
  const base = {
    id: `chatcmpl-clara-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: "clara",
  };
  const words = text.split(" ");
  for (let i = 0; i < words.length; i += 6) {
    const content = (i === 0 ? "" : " ") + words.slice(i, i + 6).join(" ");
    sseChunk(res, {
      ...base,
      choices: [
        {
          index: 0,
          delta: i === 0 ? { role: "assistant", content } : { content },
          finish_reason: null,
        },
      ],
    });
  }
  sseChunk(res, {
    ...base,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  });
  res.write("data: [DONE]\n\n");
  res.end();
}

export function streamTransfer(res: ServerResponse, destination: string): void {
  const base = {
    id: `chatcmpl-clara-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: "clara",
  };
  sseChunk(res, {
    ...base,
    choices: [
      {
        index: 0,
        delta: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              index: 0,
              id: `call_transfer_${Date.now()}`,
              type: "function",
              function: {
                name: "transferCall",
                arguments: JSON.stringify({ destination }),
              },
            },
          ],
        },
        finish_reason: null,
      },
    ],
  });
  sseChunk(res, {
    ...base,
    choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
  });
  res.write("data: [DONE]\n\n");
  res.end();
}

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  app.get("/health", async () => ({ ok: true }));

  app.post("/chat/completions", async (request, reply) => {
    const body = request.body as VapiChatRequest;
    const phone = body.call?.customer?.number ?? body.customer?.number ?? null;
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const lastUser = [...incoming].reverse().find((m) => m.role === "user");
    const utterance =
      typeof lastUser?.content === "string" ? lastUser.content : "";

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });

    const profile = loadProfile(phone); // unknown caller -> null, never crash the turn
    const guard = await checkGuardrail(utterance);

    if (guard.escalate) {
      request.log.warn(
        { code: guard.code, source: guard.source },
        "guardrail escalation, LLM bypassed",
      );
      streamText(res, guard.script);
      rememberTurn(phone, utterance, guard.script);
      return;
    }

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt(profile, guard.band) },
      ...incoming
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
        .map((m) => ({ role: m.role, content: m.content })),
    ];

    const transferNumber = process.env.TELEHEALTH_TRANSFER_NUMBER;
    const activeTools = transferNumber
      ? claraTools
      : claraTools.filter((t) => t.name !== "transfer_to_telehealth");

    let result: TurnResult;
    try {
      result = await complete(messages, activeTools);
    } catch (err) {
      request.log.error(err, "model provider failed after retry");
      result = { kind: "text", text: APOLOGY };
    }

    if (
      result.kind === "client_tool" &&
      result.name === "transfer_to_telehealth" &&
      transferNumber
    ) {
      request.log.info(
        { destination: transferNumber },
        "warm transfer to telehealth",
      );
      streamTransfer(res, transferNumber);
      rememberTurn(
        phone,
        utterance,
        "(connected caller to a telehealth clinician)",
      );
      return;
    }

    const text = result.kind === "text" ? result.text : APOLOGY;
    streamText(res, text);
    rememberTurn(phone, utterance, text);
  });

  return app;
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  const app = buildServer();
  app
    .listen({ port, host: "0.0.0.0" })
    .then(() => app.log.info(`Clara listening on :${port}`))
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}
