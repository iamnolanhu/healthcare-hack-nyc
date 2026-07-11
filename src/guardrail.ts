// Deterministic guardrail that runs BEFORE the LLM on every turn.
// Escalations stream a fixed script — the model is never consulted on
// that path. If the care API is unreachable, a local keyword screen
// still guards the turn: degraded operation is never unguarded operation.

import { medPrice, type TriageBand } from "./careApi";

export const SCRIPT_911 =
  "What you are describing could be a medical emergency, so I want you to get help right now. " +
  "Please hang up and call 9 1 1 immediately. " +
  "If you cannot dial, ask someone near you to call for you. Please do that now.";

export const SCRIPT_988 =
  "I am really glad you told me, and I want you to talk to someone who can truly help right now. " +
  "Please call or text 9 8 8 — the Suicide and Crisis Lifeline. " +
  "It is free, confidential, and open twenty-four seven. You deserve support right now, so please reach out to them.";

export type GuardrailResult =
  | {
      escalate: true;
      code: "911" | "988";
      script: string;
      source: "triage" | "keyword";
    }
  | { escalate: false; band: TriageBand | null };

const KEYWORDS_988: RegExp[] = [
  /suicid/i,
  /kill (?:myself|me)/i,
  /end (?:my|it) (?:life|all)/i,
  /want to die/i,
  /hurt(?:ing)? myself/i,
  /self.?harm/i,
];

const KEYWORDS_911: RegExp[] = [
  /chest pain/i,
  /heart attack/i,
  /can'?t breathe/i,
  /trouble breathing/i,
  /short(ness)? of breath/i,
  /stroke/i,
  /face droop/i,
  /slurred speech/i,
  /overdose/i,
  /unconscious/i,
  /not breathing/i,
  /severe bleeding/i,
  /seizure/i,
  /arm is numb|numb arm/i,
];

export function keywordEscalation(text: string): "911" | "988" | null {
  if (KEYWORDS_988.some((re) => re.test(text))) return "988";
  if (KEYWORDS_911.some((re) => re.test(text))) return "911";
  return null;
}

function scripted(
  code: "911" | "988",
  source: "triage" | "keyword",
): GuardrailResult {
  return {
    escalate: true,
    code,
    script: code === "911" ? SCRIPT_911 : SCRIPT_988,
    source,
  };
}

export async function checkGuardrail(
  utterance: string,
): Promise<GuardrailResult> {
  if (!utterance.trim()) return { escalate: false, band: null };
  try {
    const { triage } = await medPrice({ symptoms: utterance });
    if (triage.hardEscalate) return scripted(triage.hardEscalate, "triage");
    return { escalate: false, band: triage.band };
  } catch {
    const code = keywordEscalation(utterance);
    if (code) return scripted(code, "keyword");
    return { escalate: false, band: null };
  }
}
