# Clara — Demo Video

Remotion project that renders the hackathon demo video (`out/clara-demo.mp4`, ~73s, 1920×1080 @30fps).

## Arc

1. **Hook** (0–8s) — "1 in 4 Americans skip care over cost."
2. **Live call** (8–30s) — sore-throat call, grounded cash price + clinic answer.
3. **Safety beat** (30–52s) — the real heart-attack call: guardrail trips → scripted 911 → warm de-escalation. Pipeline diagram shows the LLM bypassed.
4. **Platform** (52–65s) — Arya Health inbox, three real calls (interface recreated, caller number masked).
5. **Close** (65–75s) — wordmark + "Call it yourself: +1 (848) 249-1409".

## Commands

```bash
bun install
bun run dev        # Remotion Studio preview
bun run render     # → out/clara-demo.mp4
bun generate-voiceover.ts   # regen VO (needs ELEVENLABS_API_KEY)
```

## Notes

- VO clips live in `public/voiceover/` (ElevenLabs, voice: Rachel).
- No secrets, no care-API base URL, no upstream vendor names in frame — keep it that way.
- Scene timings in `src/ClaraDemo.tsx` (`SCENES`); per-beat timings inside each scene file.
