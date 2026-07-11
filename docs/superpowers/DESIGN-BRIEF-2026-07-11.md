# Design Brief — Clara (visual layer)

**For:** the Fable design session (new herdr "design" tab).
**Status:** starting direction + suggestions. NOT locked — run the brainstorming skill and
refine WITH Nolan. This brief exists so you don't start from a blank page.

## Context to read first

- `docs/superpowers/HANDOFF-2026-07-11.md` — the build handoff (what Clara is).
- `docs/superpowers/specs/2026-07-11-clara-care-line-design.md` — approved system design.
- Clara is a **voice AI care line**: grounded (real OTC prices, real FQHC clinics), guarded
  (deterministic 911/988 triage before any LLM), personal (remembers repeat callers).
- A parallel Fable session is building the backend in `src/`. **Keep all visual work under
  `web/`** to avoid clobbering it. Coordinate git commits (another session commits too).

## Your process

1. Invoke **`superpowers:brainstorming`** first (process skill) — confirm scope WITH Nolan
   before designing. Key open question: what exactly are we building visually? (see below)
2. Then the design skills — **`design-taste`**, **`ui-ux-pro-max`**, **`color-strategy`**,
   **`frontend-design`** — for execution. Produce real mockups (HTML/React), not descriptions.
3. Present mockups, iterate, get approval, then build.

## What to build (my recommendation — confirm/adjust in brainstorm)

Two artifacts, in priority order:

1. **Live call dashboard ("the money shot")** — the judge-facing screen shown DURING the
   phone demo. Makes Clara's invisible safety pipeline visible:
   - Live transcript streaming as the caller/Clara talk.
   - A **triage band meter** that lights up per turn: self_care → primary → urgent →
     emergency → crisis. This is the story of the whole product in one component.
   - An **escalation banner** that fires decisively on 911/988 — the dramatic beat.
   - **Grounding cards** appearing as tools return: nearest clinic (address, sliding-scale,
     distance), OTC suggestion + cash/GoodRx price.
   - This is what wins judges — it dramatizes guardrails + grounding live.
2. **Landing page** — Devpost hero + "call this number now." One line: *"The care line that
   keeps you safe first."* Three proof points: Grounded · Guarded · Personal. Big tappable
   phone number.

## Vibe (starting direction)

- **Calm clinical, not cold terminal.** It's a *care* product facing patients and judges —
  avoid pure hacker-green. Warm off-white/near-neutral base, one trustworthy accent
  (calm teal or clinical green = safe/health). Technical credibility comes from a **mono
  accent** on the grounded data (prices, RXCUI, triage confidence %), not from a dark shell.
- **Severity color system is both functional and on-brand.** Build a real OKLCH ramp for the
  triage bands: self_care (calm green) → primary (blue) → urgent (amber) → emergency
  (orange) → crisis (red). WCAG AA. This ramp IS the brand — reuse it everywhere.
- **Typography:** humanist sans for warmth (Inter / Geist), mono for data (Geist Mono / JetBrains).
- **Motion (Emil-style, restrained):** everything quiet EXCEPT two moments — the triage band
  transition and the escalation banner. The 911/988 escalation should feel *instant and
  decisive*, never cute/bouncy. Trust is conveyed through calm, not flourish.
- **Anti-slop:** no generic purple AI-gradient, no glassmorphism-for-its-own-sake. This is a
  trust product — legibility and restraint over decoration.

## Constraints

- Stack: match the build (TypeScript, **bun**). React or plain HTML/CSS both fine for a demo;
  pick for speed. If live data is hard in time, a convincing scripted/mock feed is acceptable
  (the demo is 90s — make those 90s flawless).
- Public-repo hygiene: name is **Clara** (never the upstream's real name); upstream is only
  the generic "care API"; secrets in `.env` only; no AI-attribution in commits.
- Clock: ~2h of hackathon left. Prioritize the dashboard's demo beats over completeness.
