# Clara — Grounded Voice Care Line

Built at AI Healthcare Hack NYC (July 11, 2026 · Arya Health + localhost:nyc, sponsored by
Twilio AI Startup Searchlight). Callers dial a real phone number and talk to **Clara**: symptom
triage with hard safety escalation, OTC suggestions with real cash prices, nearest low-cost
clinics, a warm transfer to a telehealth clinician for urgent (non-911) cases, and continuity
for repeat callers.

## Architecture

```
Caller ──► Twilio number ──► Vapi assistant (STT / TTS / turn-taking)
                                │  custom-LLM endpoint (OpenAI-compatible SSE)
                                ▼
                     Clara server (this repo, TypeScript)
                     1. memory   — caller profile by phone #
                     2. guardrail— deterministic triage BEFORE the LLM
                     3. gateway  — provider-agnostic model (Claude default)
                     4. tools    — grounded reads from a care API
                                │  urgent (non-911) + caller consent
                                ▼
                     Vapi transferCall ──► telehealth clinician
```

**Guardrail-first:** every utterance is triaged deterministically before any model call.
Emergencies stream a fixed 911/988 script — the LLM is never consulted on that path. If the
care API is unreachable, a local keyword screen still guards the turn (fail-safe, never
fail-open). Urgent-but-not-emergency callers are offered a live warm transfer to a telehealth
professional.

## Run it

```bash
bun install
cp .env.example .env   # fill in what you have; CARE_API_MOCK=1 works with no care-API token
bun run dev            # serves POST /chat/completions on :3000
bun run smoke          # fake Vapi turns: asserts emergency path never reaches the LLM
bun test               # unit tests
```

Point a Vapi assistant's custom LLM URL at `PUBLIC_URL/chat/completions` (any HTTPS tunnel),
import a Twilio number into Vapi, and call it. For the warm transfer, add the
`TELEHEALTH_TRANSFER_NUMBER` as a destination on the assistant's `transferCall` tool.

## Judging criteria → where

| Criterion | Where |
| --- | --- |
| Twilio telephony | Twilio number imported into Vapi |
| Full conversation end-to-end | Vapi voice pipeline + this server's turn loop |
| Grounded in domain knowledge | care-API tools: triage, med prices, clinics, care KB, housing |
| Personalized per caller | phone-keyed profile store (`src/memory.ts`) |
| Guardrails / reliability | deterministic triage before the LLM + keyword fail-safe |
| Escalation beyond the bot | scripted 911/988 + telehealth warm transfer (Vapi `transferCall`) |
