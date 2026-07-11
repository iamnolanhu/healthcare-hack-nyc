import { expect, test } from "bun:test";
import { systemPrompt } from "../src/prompts";

test("new caller prompt sets persona and voice constraints", () => {
  const p = systemPrompt(null, null);
  expect(p).toContain("Clara");
  expect(p).toContain("PHONE CALL");
  expect(p).toContain("New caller");
});

test("returning caller prompt injects name, history, and triage band", () => {
  const p = systemPrompt(
    {
      phone: "+15551234567",
      name: "Sam",
      firstSeen: "2026-07-11T10:00:00.000Z",
      lastSeen: "2026-07-11T10:00:00.000Z",
      notes: ["2026-07-11 caller: I have a sore throat"],
    },
    "self_care",
  );
  expect(p).toContain("Sam");
  expect(p).toContain("sore throat");
  expect(p).toContain("self_care");
});

test("urgent band instructs Clara to offer the telehealth transfer", () => {
  const p = systemPrompt(null, "urgent");
  expect(p).toContain("transfer_to_telehealth");
  expect(p).toContain("urgent");
});
