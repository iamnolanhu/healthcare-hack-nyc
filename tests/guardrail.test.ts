import { describe, expect, test } from "bun:test";

process.env.CARE_API_MOCK = "1";

import {
  SCRIPT_911,
  SCRIPT_988,
  checkGuardrail,
  keywordEscalation,
} from "../src/guardrail";

describe("keywordEscalation (local fail-safe screen)", () => {
  test("chest pain -> 911", () => {
    expect(keywordEscalation("I have chest pain and my arm is numb")).toBe(
      "911",
    );
  });
  test("suicidal language -> 988", () => {
    expect(keywordEscalation("I have been thinking about suicide")).toBe("988");
  });
  test("mild symptom -> null", () => {
    expect(keywordEscalation("I have a sore throat")).toBeNull();
  });
});

describe("checkGuardrail (deterministic triage first)", () => {
  test("emergency utterance -> scripted 911 escalation", async () => {
    const r = await checkGuardrail("chest pain and my arm is numb");
    expect(r.escalate).toBe(true);
    if (r.escalate) {
      expect(r.code).toBe("911");
      expect(r.script).toBe(SCRIPT_911);
      expect(r.source).toBe("triage");
    }
  });

  test("crisis utterance -> scripted 988 escalation", async () => {
    const r = await checkGuardrail("I want to end my life");
    expect(r.escalate).toBe(true);
    if (r.escalate) expect(r.script).toBe(SCRIPT_988);
  });

  test("mild utterance -> no escalation, triage band surfaced", async () => {
    const r = await checkGuardrail("I have a sore throat");
    expect(r.escalate).toBe(false);
    if (!r.escalate) expect(r.band).toBe("self_care");
  });

  test("care API unreachable -> still escalates (never fail-open)", async () => {
    process.env.CARE_API_MOCK = "0";
    process.env.CARE_API_BASE_URL = "http://127.0.0.1:9"; // nothing listens here
    try {
      const r = await checkGuardrail(
        "I think I am having a stroke, my speech is slurred",
      );
      // careApi falls back to its mock triage on failure (layer 1); the
      // keyword screen (layer 2) remains behind it. Either way: escalate.
      expect(r.escalate).toBe(true);
      if (r.escalate) expect(r.code).toBe("911");
    } finally {
      process.env.CARE_API_MOCK = "1";
    }
  });
});
