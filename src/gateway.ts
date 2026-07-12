// Provider-agnostic model gateway. One complete() entry point; the
// provider (Claude default, OpenAI-compatible via env) is an .env choice,
// never a code change. Runs the tool-use loop internally. Client-side
// tools (e.g. a live call transfer) short-circuit the loop and surface
// to the caller instead of being dispatched here.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  clientSide?: boolean; // surfaced to the caller (e.g. Vapi transfer), never dispatched here
  run: (args: Record<string, unknown>) => Promise<string>;
}

export type TurnResult =
  | { kind: "text"; text: string }
  | { kind: "client_tool"; name: string; args: Record<string, unknown> };

export const stats = { llmCalls: 0 };

const MAX_TOOL_ROUNDS = 5;
const OUT_OF_ROUNDS =
  "I'm sorry, I'm having trouble pulling that up right now.";

export async function complete(
  messages: ChatMessage[],
  tools: ToolSpec[],
): Promise<TurnResult> {
  const provider = process.env.MODEL_PROVIDER ?? "anthropic";
  const attempt = (): Promise<TurnResult> =>
    provider === "openai"
      ? completeOpenAI(messages, tools)
      : completeAnthropic(messages, tools);
  try {
    return await attempt();
  } catch {
    return await attempt(); // one retry; a second failure propagates to the server
  }
}

// ---------- Anthropic ----------

type AnthropicContent =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    };

type AnthropicMessage = {
  role: "user" | "assistant";
  content:
    | string
    | Array<
        | AnthropicContent
        | { type: "tool_result"; tool_use_id: string; content: string }
      >;
};

export function toAnthropicPayload(messages: ChatMessage[]): {
  system: string;
  messages: AnthropicMessage[];
} {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const turns: AnthropicMessage[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    const last = turns[turns.length - 1];
    if (last && last.role === m.role && typeof last.content === "string") {
      last.content = `${last.content}\n${m.content}`;
    } else {
      turns.push({ role: m.role, content: m.content });
    }
  }
  if (turns.length === 0 || turns[0]?.role !== "user") {
    turns.unshift({ role: "user", content: "(caller connected)" });
  }
  return { system, messages: turns };
}

async function runTool(
  tools: ToolSpec[],
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return `unknown tool: ${name}`;
  try {
    return await tool.run(args);
  } catch (err) {
    return `tool error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function completeAnthropic(
  messages: ChatMessage[],
  tools: ToolSpec[],
): Promise<TurnResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const model = process.env.MODEL_NAME || "claude-fable-5";
  const { system, messages: turns } = toAnthropicPayload(messages);
  const toolDefs = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    stats.llmCalls++;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system,
        messages: turns,
        ...(toolDefs.length ? { tools: toolDefs } : {}),
      }),
    });
    if (!res.ok)
      throw new Error(`anthropic ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      content: AnthropicContent[];
      stop_reason: string;
    };
    if (data.stop_reason !== "tool_use") {
      return {
        kind: "text",
        text: data.content
          .filter((b): b is { type: "text"; text: string } => b.type === "text")
          .map((b) => b.text)
          .join(""),
      };
    }
    for (const block of data.content) {
      if (block.type !== "tool_use") continue;
      if (tools.find((t) => t.name === block.name)?.clientSide) {
        return { kind: "client_tool", name: block.name, args: block.input };
      }
    }
    turns.push({ role: "assistant", content: data.content });
    const results: Array<{
      type: "tool_result";
      tool_use_id: string;
      content: string;
    }> = [];
    for (const block of data.content) {
      if (block.type !== "tool_use") continue;
      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: await runTool(tools, block.name, block.input),
      });
    }
    turns.push({ role: "user", content: results });
  }
  return { kind: "text", text: OUT_OF_ROUNDS };
}

// ---------- OpenAI-compatible (OpenAI, or any router via OPENAI_BASE_URL) ----------

type OpenAIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type OpenAIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
};

async function completeOpenAI(
  messages: ChatMessage[],
  tools: ToolSpec[],
): Promise<TurnResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const base = (
    process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model = process.env.MODEL_NAME || "gpt-4o";
  const turns: OpenAIMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const toolDefs = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    stats.llmCalls++;
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: turns,
        max_tokens: 1024,
        ...(toolDefs.length ? { tools: toolDefs } : {}),
      }),
    });
    if (!res.ok)
      throw new Error(`openai-compatible ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      choices: Array<{ message: OpenAIMessage }>;
    };
    const msg = data.choices[0]?.message;
    if (!msg) throw new Error("openai-compatible: empty choices");
    if (!msg.tool_calls?.length)
      return { kind: "text", text: msg.content ?? "" };
    for (const call of msg.tool_calls) {
      if (tools.find((t) => t.name === call.function.name)?.clientSide) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<
            string,
            unknown
          >;
        } catch {
          // empty args are fine for client tools
        }
        return { kind: "client_tool", name: call.function.name, args };
      }
    }
    turns.push(msg);
    for (const call of msg.tool_calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}") as Record<
          string,
          unknown
        >;
      } catch {
        // tool sees empty args and reports accordingly
      }
      turns.push({
        role: "tool",
        content: await runTool(tools, call.function.name, args),
        tool_call_id: call.id,
      });
    }
  }
  return { kind: "text", text: OUT_OF_ROUNDS };
}
