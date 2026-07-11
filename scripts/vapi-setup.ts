// Creates (or updates) the Clara assistant on Vapi and binds it to the
// existing voice+SMS phone number. Idempotent: set CLARA_ASSISTANT_ID in
// .env after first run to PATCH instead of re-create.
//
// Required env: VAPI_API_KEY, PUBLIC_URL, VAPI_PHONE_NUMBER_ID
// Optional env: TELEHEALTH_TRANSFER_NUMBER (adds the transferCall tool),
//               CLARA_ASSISTANT_ID (update instead of create)

export {}; // top-level await requires module context under tsc

const VAPI = "https://api.vapi.ai";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set in .env`);
  return v;
}

const key = need("VAPI_API_KEY");
const publicUrl = need("PUBLIC_URL").replace(/\/$/, "");
const phoneNumberId = need("VAPI_PHONE_NUMBER_ID");
const transferNumber = process.env.TELEHEALTH_TRANSFER_NUMBER;
const existingId = process.env.CLARA_ASSISTANT_ID;

async function vapi(
  method: string,
  path: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${VAPI}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok)
    throw new Error(
      `${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`,
    );
  return json;
}

const assistantConfig = {
  name: "Clara — Care Line",
  firstMessage: "Hi, I'm Clara, your care line. How can I help today?",
  transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
  voice: {
    provider: "minimax",
    voiceId: "Wise_Woman",
    model: "speech-02-hd",
    speed: 0.95,
    languageBoost: "English",
    textNormalizationEnabled: true,
    fallbackPlan: {
      voices: [{ provider: "11labs", voiceId: "21m00Tcm4TlvDq8ikWAM" }],
    },
  },
  model: {
    provider: "custom-llm",
    // Vapi appends /chat/completions to this base URL — pass the bare origin.
    url: publicUrl,
    model: "clara-gateway",
    temperature: 0.6,
    maxTokens: 1000, // default 250 truncates tool arguments
    timeoutSeconds: 45, // guardrail + tool loop can exceed the 20s default to first token
    messages: [
      {
        role: "system",
        content:
          "You are Clara. All real cognition is server-side; this placeholder is replaced per turn.",
      },
    ],
    ...(transferNumber
      ? {
          tools: [
            {
              type: "transferCall",
              destinations: [
                {
                  type: "number",
                  number: transferNumber,
                  message:
                    "Connecting you to a telehealth clinician now — please stay on the line.",
                  description:
                    "Telehealth clinician line for urgent but non-emergency callers who agreed to be connected.",
                },
              ],
            },
          ],
        }
      : {}),
  },
};

const assistant = existingId
  ? await vapi("PATCH", `/assistant/${existingId}`, assistantConfig)
  : await vapi("POST", "/assistant", assistantConfig);
const assistantId = assistant.id as string;
console.log(`${existingId ? "updated" : "created"} assistant: ${assistantId}`);

const before = await vapi("GET", `/phone-number/${phoneNumberId}`);
console.log(
  `number ${before.number as string} previous assistantId: ${JSON.stringify(before.assistantId ?? null)} (for rollback)`,
);

await vapi("PATCH", `/phone-number/${phoneNumberId}`, { assistantId });
console.log(
  `bound assistant to number ${before.number as string} (voice + SMS)`,
);
console.log(`\nadd to .env if missing:\nCLARA_ASSISTANT_ID=${assistantId}`);
