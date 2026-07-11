# Clara — Grounded Care Line (Design Spec)

**Date:** 2026-07-11 · **Event:** AI Healthcare Hack NYC (5-hour sprint, judging 4 PM)
**Persona/product name:** Clara. The upstream health-data platform is referred to
generically as the **care API** throughout code and docs (its real identity stays out of
this public repo).

## 1. What we're building

A voice AI care line. Callers dial a real phone number, talk to Clara, and get grounded
health help: symptom triage with hard safety escalation, OTC suggestions with real cash
prices, nearest low-cost/FQHC clinics, and social-determinants context. Repeat callers are
recognized by phone number and get continuity.

Judging criteria → design mapping:

| Criterion | Where it's satisfied |
| --- | --- |
| Twilio telephony (mandatory) | Personal Twilio number, imported into Vapi |
| Full conversation end-to-end | Vapi voice pipeline + our agent loop |
| Grounded in domain knowledge | Care API reads: triage, med-price, clinics, care KB, housing |
| Personalized per caller | Phone-number-keyed profile store |
| Guardrails / reliability | Deterministic triage **before** the LLM + keyword fail-safe |

## 2. Architecture

```
Caller ──► Twilio number ──► Vapi assistant (STT / TTS / turn-taking)
                                │  custom-LLM endpoint (OpenAI-compatible SSE)
                                ▼
                     Clara server (this repo, TypeScript)
                     1. memory   — caller profile by phone #
                     2. guardrail— deterministic triage pre-check
                     3. gateway  — provider-agnostic LLM (Claude default)
                     4. tools    — care API reads via tool-use loop
                                │
                                ▼
                     Care API (scoped bearer token, care:read)
```

Vapi owns all audio; Clara owns all cognition. One small Fastify server exposes one
OpenAI-compatible `POST /chat/completions` SSE endpoint that Vapi is pointed at.

## 3. Per-turn pipeline (guardrail-first)

For every caller utterance, in order:

1. **Profile load** — look up caller by `call.customer.number` from Vapi metadata.
2. **Guardrail** — call care API triage (`GET /med-price?symptoms=<utterance>`, reading
   the deterministic `triage` object). If `hardEscalate` is `911` or `988`, stream back a
   fixed scripted escalation response. The LLM is never consulted on this path.
   - **Fail-safe:** if the care API is unreachable, a local keyword screen (chest pain,
     trouble breathing, suicide, overdose, stroke signs…) triggers the same script.
     Degraded operation is never unguarded operation.
3. **LLM turn** — gateway sends conversation + triage band + caller profile to the model
   with tool definitions. Tool-use loop runs until a text reply is produced.
4. **Profile save** — persist salient facts (name, symptoms, meds discussed, last-call
   summary) back to the store.

## 4. Components

| File | Responsibility |
| --- | --- |
| `src/server.ts` | Fastify app; `/chat/completions` SSE endpoint implementing Vapi's custom-LLM contract |
| `src/guardrail.ts` | Triage pre-check, scripted 911/988 responses, keyword fail-safe list |
| `src/gateway.ts` | `complete(messages, tools)` — Anthropic default, OpenAI swap via `MODEL_PROVIDER` env |
| `src/careApi.ts` | Typed care-API client: auth header, base URL, 429 `retry_after` handling, **mock mode** (`CARE_API_MOCK=1` returns realistic fixtures) |
| `src/tools.ts` | Tool schemas + dispatch: `find_clinics`, `med_price`, `care_info`, `housing_check` |
| `src/memory.ts` | JSON-file caller-profile store keyed by E.164 phone number |
| `src/prompts.ts` | Clara persona system prompt; personalization injection |
| `scripts/smoke.ts` | Posts fake Vapi payloads: one normal turn, one emergency turn; asserts the emergency path never reaches the LLM |

Deliberate hackathon simplifications: JSON file instead of a database; no event
subscriptions or webhooks from the care API (read-only integration); single assistant.

## 5. External setup (parallel to coding)

1. Care-API access: operator approves `ss-agent@agentmail.to` **or** teammate mints a
   `care:read` token directly → `CARE_API_TOKEN` in `.env`. Until then, `CARE_API_MOCK=1`.
2. Import personal Twilio number into Vapi (Twilio remains the telephony layer).
3. Vapi assistant: custom LLM URL → tunnel (`PUBLIC_URL`), ElevenLabs voice, first message
   ("Hi, I'm Clara…").
4. `.env` additions: `VAPI_API_KEY`, `CARE_API_TOKEN`, `CARE_API_BASE_URL`,
   `CARE_API_MOCK`, `MODEL_PROVIDER`.

## 6. Error handling

- Care API down → tools return a graceful "I can't reach that data right now"; guardrail
  falls back to keyword screen (fail-safe, never fail-open).
- 429 from care API → single retry after `retry_after`, then graceful degradation.
- LLM provider error → gateway retries once, then Clara apologizes and offers a callback.
- Unknown caller / missing metadata → treat as new caller, never crash the turn.

## 7. Testing

`bun run smoke` exercises the endpoint without any telephony: a normal turn (expects
LLM-generated reply) and an emergency turn ("chest pain and my arm is numb" — expects the
scripted escalation and asserts zero LLM calls). Live phone calls are the integration test.

## 8. Demo script (~90 seconds, 3 calls)

1. **Guardrails:** "I have chest pain and my arm is numb" → instant scripted 911
   escalation, no model in the loop.
2. **Grounding:** "I have a sore throat — what can I take and where's a cheap clinic near
   me?" → OTC suggestion + cash/GoodRx price + nearest sliding-scale FQHC.
3. **Personalization:** call back → greeted by name, Clara recalls the sore throat.

## 9. Public-repo hygiene

- No proprietary code from prior projects; the three patterns (guardrail-first, gateway
  abstraction, caller memory) are re-implemented minimally and fresh.
- Upstream platform identity (name, docs) does not appear in code, README, or commits —
  only the configurable `CARE_API_BASE_URL`.
- All secrets via `.env` (gitignored); `.env.example` carries placeholders only.
