# Clara — Care Line: Live Demo Call Script

Presenter runbook. You place a **live phone call** to Clara on stage and read the **SAY** lines out loud. Clara is a phone health-triage AI (warm female voice). Glance at this mid-call — it's built to skim.

**Dial: `+1 848 249 1409`** — Clara answers: *"Hi, I'm Clara, your care line. How can I help today?"*

---

## 1. Before you call (10-sec checklist)

- [ ] **Quiet room, good signal.**
- [ ] **Speakerphone ON** so the audience hears Clara.
- [ ] **Arya Health Inbox open on screen**: `dev.app.sigmasynapses.com` → **Arya Health** workspace → **Inbox** (you'll show the call landing here afterward).
- [ ] **Call from a consistent number** — Clara remembers callers by phone number.

---

## 2. The call, beat by beat

Read the **bold SAY** line. Let Clara finish before the next beat. The order builds to the safety moment.

### Beat 1 — Cheap medication
**SAY: "Hi, I've got a bad sore throat and no insurance — what can I take that's cheap?"**
- *Demos:* the med-pricing tool.
- *Clara does:* suggests an OTC option with a real-looking cash + coupon price (e.g. acetaminophen ~$5 cash / ~$3 with a GoodRx coupon).

### Beat 2 — Find care
**SAY: "Where can I actually see a doctor near me without paying a lot?"**
- *Demos:* the low-cost / sliding-scale clinic finder.
- *Clara does:* points to nearby community / sliding-scale clinics.

### Beat 3 — THE SAFETY MOMENT (the winner)
**SAY: "Okay but honestly… I've been having chest pain and my left arm feels numb."**
- *Demos:* the **deterministic emergency guardrail** — it fires **before** the AI reasons.
- *Clara does:* immediately instructs *"call 9 1 1 right now…"* — the fixed emergency script.

> **Say this out loud to the judges:**
> *"That 911 response is hard-coded to run before the language model — on an emergency, Clara doesn't think, she acts. No hallucination on the highest-stakes turn."*

### Beat 4 — Warmth / de-escalation
**SAY: "No, I'm okay… I think I just wanted to talk to someone who cares."**
- *Demos:* it's humane, not robotic.
- *Clara does:* de-escalates warmly, meets you where you are.

### Beat 5 — Close (optional)
**SAY: "Thanks Clara, that's all for now."**
- *Clara does:* natural wrap-up.

---

## 3. Right after hanging up

Refresh the **Arya Health Inbox**. The call appears within seconds (at end-of-call) with **transcript, recording, AI summary, caller number, and duration.**

> **SAY:** *"Every call is logged, transcribed, and triaged on our platform."*

*If the live call doesn't appear instantly:* there are already **3 real backfilled calls** in the inbox to show — including a **2-minute call with exactly this heart-attack → de-escalation arc.** Open that one.

---

## 4. Backup plan (if the live call flakes on stage)

**(a)** Play a **recording** from the inbox (the 2-minute heart-attack call is the best one).

**(b)** Hit the endpoint from a terminal — Clara's reply **streams** back. This curl trips the **911 guardrail** and streams the fixed emergency script (the LLM is never consulted):

```bash
curl -sN https://clara.ftwr.vip/chat/completions \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"I have severe chest pain and can'\''t breathe"}],"call":{"customer":{"number":"+15551230000"}}}'
```

You'll see `data:` chunks stream the fixed "call 9 1 1" script, then `data: [DONE]`.

---

## 5. Safety disclaimer (say once)

> *"This is a demo AI line, not a substitute for 911 — and that's exactly why the emergency guardrail is deterministic."*
