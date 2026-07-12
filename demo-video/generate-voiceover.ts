/**
 * Generate per-scene VO clips with ElevenLabs. Run: bun generate-voiceover.ts
 * Requires ELEVENLABS_API_KEY in the environment.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — warm, calm

const LINES: { id: string; text: string }[] = [
  {
    id: "hook",
    text: "One in four Americans skip medical care because of the cost. What if help was just one phone call away?",
  },
  {
    id: "livecall",
    text: "This is Clara — a live care line you can call right now. Describe your symptoms, and she answers with real data: actual cash prices for medication, and the nearest low-cost clinic that will see you without insurance.",
  },
  {
    id: "safety-a",
    text: "Here's what makes Clara different. A deterministic guardrail runs before the AI, on every turn. On an emergency, Clara doesn't think — she acts. The model never sees it.",
  },
  {
    id: "safety-b",
    text: "And when the caller just needed someone who cares — Clara is human again.",
  },
  {
    id: "platform",
    text: "Every call lands in a real inbox — logged, transcribed, and summarized — on a live multi-tenant platform. It's a product, not a prototype.",
  },
  {
    id: "close",
    text: "Clara — Care Line, by Arya Health. Don't take our word for it. Call her yourself.",
  },
];

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY not set");
  process.exit(1);
}

mkdirSync("public/voiceover", { recursive: true });

for (const line of LINES) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: line.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.15,
        },
      }),
    },
  );
  if (!res.ok) {
    console.error(`${line.id}: HTTP ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(`public/voiceover/${line.id}.mp3`, buf);
  console.log(`${line.id}.mp3 — ${(buf.length / 1024).toFixed(0)} KB`);
}
