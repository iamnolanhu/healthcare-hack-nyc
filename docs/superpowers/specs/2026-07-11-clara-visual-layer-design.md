# Clara — Visual Layer (Design Spec)

**Date:** 2026-07-11 · **Event:** AI Healthcare Hack NYC (judging 4 PM ET)
**Scope:** everything under `web/`. The backend session owns `src/` — this spec never touches it.
**Companion docs:** `DESIGN-BRIEF-2026-07-11.md` (direction), `2026-07-11-clara-care-line-design.md` (system).

## 1. What we're building

Two artifacts, in priority order:

1. **Live call dashboard** (`/live`) — the judge-facing screen shown during the phone demo.
   Renders a typed event stream: streaming transcript, five-band triage meter, grounding
   cards, and a scripted escalation takeover. Driven by a **presenter-stepped replay**
   synced by hand to the real call.
2. **Landing page** (`/`) — Devpost hero: *"The care line that keeps you safe first."*
   Big tappable phone number, three proof points (Grounded · Guarded · Personal).
   Built last; cut without regret if time runs out.

Decisions locked in brainstorm: **Layout B** (triage band as full-width headline),
**schema-first replay** (no live backend coupling; source is swappable later),
**presenter-stepped control** (Space/→ advances beats; immune to call-timing drift).

## 2. Stack & structure

Single **Next.js (App Router) + Tailwind v4 + TypeScript strict + bun** app under `web/`.
Familiar stack, not a Turborepo — one app needs no workspaces. Clean-room rule: reuse the
stack, never code or tokens from prior private projects. Next's default Geist + Geist Mono
matches the typography spec.

```
web/
  app/
    page.tsx            landing (teammate's canvas)
    live/page.tsx       dashboard (client component)
    globals.css         Tailwind v4 @theme — OKLCH severity ramp + tokens
  lib/events.ts         event-schema contract (shared vocabulary with backend)
  lib/replay/script.ts  the 3 demo calls as typed beats
  lib/replay/driver.ts  presenter-stepped playback
  components/           TriageBand · Transcript · GroundingCard · EscalationTakeover · CallHeader
```

## 3. Layout (Option B — "triage band as the headline")

- **Header (full width):** the five triage bands as a segmented spectrum —
  `SELF-CARE · PRIMARY · URGENT · EMERGENCY · CRISIS`. Current band lit, others muted.
  Readable from the back row; when it shifts, the whole room sees it.
- **Below, left (~60%):** live transcript. Caller bubbles left, Clara bubbles right;
  words stream in within a beat.
- **Below, right (~40%):** grounding cards appear as tool results land — clinic
  (name, distance, sliding-scale), med price (name, cash + GoodRx, mono), care info.
  A generic card variant covers `housing_check` (schema parity with the backend's four
  tools) even though the demo beats don't exercise it.
- **Escalation:** full-screen takeover (see §5). Header slams to crisis red as it fires.
- Call status strip: caller number (masked), duration, returning-caller chip when the
  profile loads.

## 4. Event schema (`lib/events.ts`)

The contract between renderer and any driver (replay now, live later):

- `call_started` — caller number, optional returning-caller profile (name, last summary)
- `utterance` — role `caller | clara`, text streams word-by-word within a beat
- `triage_update` — band (5 values), confidence, source: `care-api | keyword-failsafe`
- `tool_call` / `tool_result` — kind: `find_clinics | med_price | care_info | housing_check`
- `escalation` — kind `911 | 988`, scripted text, `llmConsulted: false`
- `call_ended`

`script.ts` encodes the three demo calls as beat arrays: (1) guardrail — chest pain →
instant 911 escalation; (2) grounding — sore throat → OTC price + FQHC clinic cards;
(3) personalization — callback → greeted by name, recalls the sore throat.

## 5. Visual system

- **Base:** warm off-white / near-neutral shell; calm teal accent. No purple AI gradient,
  no glassmorphism, no dark hacker shell.
- **Severity ramp (the brand):** five-step OKLCH ramp, calm green → blue → amber → orange
  → red, WCAG AA at all text sizes. Defined once in `globals.css` `@theme`, reused by
  dashboard, landing proof points, and favicon.
- **Type:** Geist for voice/UI; Geist Mono strictly for grounded data — prices, distances,
  confidence, RXCUI. Mono is the credibility signal; never decorative.
- **Motion (Emil-restrained):** everything ≤250 ms quiet crossfade/slide. Two exceptions,
  by design: the triage-band shift (deliberate crossfade the audience can track) and the
  **escalation takeover — instant (~120 ms), full-screen crisis red, scripted 911/988 line,
  and a mono chip: `GUARDRAIL · deterministic · LLM not consulted`.** Never bouncy.
- Anti-slop gate at implementation: `design-taste` (+ `emil-design-eng`), `ui-ux-pro-max`,
  `color-strategy`, `frontend-design`; `react-bits`/`uiverse` checked before hand-rolling.

## 6. Replay driver & demo safety

- **Space/→** next beat · **R** reset · **1/2/3** jump to a call segment. Faint on-screen
  hints so a presenter can click instead of type.
- Deterministic replay means the test is the demo: dry-run checklist = full 3-call
  run-through, reset, mid-run jump. `bun run dev` in `web/`.
- Error handling is minimal by design (static app, no network): a beat index can never
  exceed script bounds; reset always returns to a clean call 1.

## 7. Collaboration & git

- Teammate owns `app/page.tsx` (landing); this session owns `live/` + components.
  Both inherit `globals.css` tokens — pushed first so her work starts on-brand.
- Small, scoped commits to `main`, pushed immediately (spec → scaffold + tokens →
  components). Pull before push; another session commits `src/` in parallel.
- Public-repo hygiene: persona is **Clara**; upstream only the generic "care API";
  no secrets; no AI attribution in commits.

## 8. Out of scope

Live backend wiring (schema makes it a later swap), auth, persistence, mobile layout
(projector/laptop only), analytics.
