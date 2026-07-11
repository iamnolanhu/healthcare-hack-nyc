# Clara — Devpost Brief

**Source:** team voice memo, recorded 2026-07-11 during the build sprint (transcript below,
edited for clarity). **Audience:** whoever writes the Devpost submission. Read this, then
skim `docs/superpowers/specs/2026-07-11-clara-care-line-design.md` for the technical
architecture. Judging is at 4 PM today.

---

## The pitch

Clara is a voice AI care line for people without insurance. You call a real phone number,
describe your symptoms, and Clara tells you what you can take and where to get affordable
care in Manhattan — no insurance required. She grounds every answer in real data: actual
cash prices for medications and the nearest low-cost or sliding-scale clinics. If your
symptoms sound like an emergency, Clara escalates immediately instead of chatting.

The price angle is the hook: doctors and pharmacies often steer patients toward
kickback-inflated options. Clara finds what a medication *actually* costs and points you
to the cheapest legitimate source.

## How a call flows (the story to tell)

1. **You call Clara** and describe what's wrong — say, a sore throat.
2. **Clara triages first, talks second.** A deterministic safety check runs on every
   utterance *before* the AI model sees it. Chest pain and a numb arm gets an instant,
   scripted 911 escalation — the model is never in the loop on emergencies.
3. **For everything else, Clara answers with real data:** an OTC suggestion, its real
   cash price, and the nearest clinic that takes patients without insurance.
4. **Call back and Clara remembers you** — greets you by name and follows up on the
   sore throat.

## What's built vs. what's vision

Keep this split honest in the submission — built features go in "What it does," vision
goes in "What's next."

**Built (per the design spec):**

| Feature | How |
| --- | --- |
| Live phone line | Twilio number → Vapi voice pipeline → our TypeScript server as the LLM |
| Guardrail-first safety | Deterministic triage before every model turn; scripted 911/988 escalation; keyword fail-safe if the care API is down |
| Grounded answers | Care-API tools: med cash prices, low-cost clinic finder, care knowledge base, housing checks |
| Caller memory | Profile keyed by phone number; continuity across calls |
| Swappable model brain | Provider-agnostic gateway, Claude by default |

**Vision / stretch (from the memo — not built, pitch as "What's next"):**

- **Remote doctor handoff.** For urgent-but-not-911 cases, Clara conferences in a
  telehealth professional who can prescribe. Clara transcribes the visit, extracts the
  prescription, and finds the lowest real price for it online.
- **SMS follow-up.** When there's too much to convey by voice, Clara texts the caller
  Google Maps links to the clinic and other useful links.
- **OTC product photos.** For over-the-counter recommendations, Clara texts a product
  photo so the caller can find it in the aisle at Walgreens or show it to staff at the
  counter. (Open question from the memo: no API for this yet — would need to be hacked
  together.)

## Devpost section mapping

- **Inspiration:** healthcare costs are opaque; the uninsured avoid care because they
  can't price it. Kickbacks inflate prescriptions. A phone call is the most accessible
  interface there is — no app, no login.
- **What it does:** the pitch + "How a call flows" above. Built features only.
- **How we built it:** Twilio (telephony) → Vapi (STT/TTS/turn-taking) → custom
  TypeScript server exposing an OpenAI-compatible endpoint, with a guardrail-first
  pipeline, a care-API tool layer, and phone-keyed caller memory. Architecture diagram
  is in the design spec §2.
- **Challenges:** making safety deterministic — the emergency path never touches the
  LLM, and a keyword fail-safe keeps it that way even if the data API is unreachable.
- **What's next:** the three vision features above.
- **Demo:** three 30-second calls — emergency escalation, grounded sore-throat answer,
  personalized callback. Script in design spec §8.

## Submission hygiene (public repo, public Devpost)

- Refer to the health-data backend only as the **"care API"** — never its real name or
  branding, in the write-up, the repo, or the demo video.
- Twilio, Vapi, Claude, and ElevenLabs are fine to name. Twilio is mandatory for the
  sponsor prize — make it visible in the write-up.
- No secrets or base URLs in screenshots.

---

## Transcript (edited for clarity)

> It's about Clara. Clara is an AI assistant that gives you information about urgent
> care that doesn't require insurance, in the local New York / Manhattan area.
>
> Once you talk to Clara about your issues — say it's a heart attack, or you're
> fainting — she joins a call with a professional, a remote doctor, which saves you
> money. The doctor gives you a prescription, Clara transcribes it, and then finds the
> lowest price for that medication online — what it actually costs, versus the doctor
> getting kickbacks.
>
> Another feature: if it's too much over the phone, Clara can send a text message with
> Google Maps links and other helpful links.
>
> And if it's over-the-counter, she can send a picture of the medicine — because at
> Walgreens you're not sure exactly what it looks like or which aisle it's in. At least
> a product photo, so you can show the person at the counter and ask where to get it.
>
> Do we have an API that has all that? Not currently — maybe we can hack something
> together.
