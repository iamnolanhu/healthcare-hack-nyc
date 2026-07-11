# Clara REST API — How-To

Clara's server exposes two routes: a liveness probe and one OpenAI-compatible,
SSE-only chat endpoint that Vapi calls once per conversation turn. The full
machine-readable spec lives next to this file in [`swagger.json`](./swagger.json).

## Start the server

```bash
bun install
cp .env.example .env   # CARE_API_MOCK=1 works with no care-API token
bun run dev            # POST /chat/completions on :3000
```

## Endpoints

### `GET /health`

Returns `{"ok": true}`. Use it for tunnel checks and uptime probes.

```bash
curl -s http://localhost:3000/health
```

### `POST /chat/completions`

The only functional endpoint. It speaks the OpenAI chat-completions protocol,
but **streaming only** — every response is `200` with a `text/event-stream`
body of `chat.completion.chunk` events ending in `data: [DONE]`. There is no
`stream: false` mode, no non-SSE JSON response.

```bash
curl -sN http://localhost:3000/chat/completions \
  -H 'content-type: application/json' \
  -d '{
    "messages": [{ "role": "user", "content": "my chest hurts and my arm is numb" }],
    "call": { "customer": { "number": "+15551234567" } }
  }'
```

That example trips the emergency guardrail: the response streams a fixed
911/988 script and the LLM is never consulted. A benign utterance ("what does
ibuprofen cost?") flows through the model with grounded care-API tools.

#### Request shape

| Field                  | Meaning                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `messages`             | OpenAI-format history; the **last `user` message** is what gets triaged |
| `call.customer.number` | Present on voice turns (Vapi sends it); selects the caller's profile    |
| `customer.number`      | Fallback identity for SMS/chat sessions                                 |

Channel detection: a `call` object present ⇒ voice; absent ⇒ SMS. The system
prompt adapts to the channel. Unknown or missing numbers never fail the turn —
the caller just gets no continuity.

#### Response shapes

1. **Text turn** — assistant content deltas (~6 words per chunk), final chunk
   has `finish_reason: "stop"`.
2. **Warm transfer** — a single delta carrying a `transferCall` tool call
   (`finish_reason: "tool_calls"`), which Vapi executes to bridge the caller to
   `TELEHEALTH_TRANSFER_NUMBER`. Only emitted when that env var is set.
3. **Degraded turn** — if the model provider fails after retry, the stream
   speaks a fixed apology. The HTTP layer never surfaces the error.

## Wiring Vapi to it

1. Expose the server over HTTPS (any tunnel) and put that URL in `.env` as
   `PUBLIC_URL`.
2. Set the Vapi assistant's **custom LLM URL** to `PUBLIC_URL/chat/completions`
   (or run `bun scripts/vapi-setup.ts`, which creates/updates the assistant and
   binds the phone number).
3. For warm transfers, add `TELEHEALTH_TRANSFER_NUMBER` as a destination on the
   assistant's `transferCall` tool.

## Environment variables that shape the API

| Var                          | Effect on the API                                                     |
| ---------------------------- | --------------------------------------------------------------------- |
| `PORT`                       | Listen port (default 3000)                                            |
| `TELEHEALTH_TRANSFER_NUMBER` | Enables the `transfer_to_telehealth` tool and the transfer response   |
| `CARE_API_MOCK=1`            | Care tools serve fixtures — full API works with zero upstream access  |
| `MODEL_PROVIDER` / keys      | Which LLM answers non-emergency turns (`anthropic` default, `openai`) |

## Security notes

- The endpoint is **unauthenticated** — anything that can reach the tunnel can
  spend model tokens. For the hackathon that's acceptable; beyond it, put a
  shared-secret header check or IP allowlist in front before exposing
  `PUBLIC_URL`.
- The upstream health-data platform is referred to only as the generic
  "care API"; its name and base URL live exclusively in gitignored `.env`.
  Keep it that way in any docs you add.

## Verifying

```bash
bun run smoke   # fake Vapi turns; asserts the emergency path never reaches the LLM
bun test        # unit tests
```
