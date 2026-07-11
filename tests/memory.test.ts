import { afterAll, beforeEach, expect, test } from "bun:test";
import { rmSync } from "node:fs";

const TEST_FILE = "data/test-profiles.json";
process.env.MEMORY_FILE = TEST_FILE;

import { extractName, loadProfile, rememberTurn } from "../src/memory";

beforeEach(() => rmSync(TEST_FILE, { force: true }));
afterAll(() => rmSync(TEST_FILE, { force: true }));

test("unknown caller -> null profile", () => {
  expect(loadProfile("+15550000000")).toBeNull();
});

test("null phone never crashes and stores nothing", () => {
  rememberTurn(null, "hello", "hi there");
  expect(loadProfile(null)).toBeNull();
});

test("rememberTurn persists name and notes across loads", () => {
  rememberTurn(
    "+15551234567",
    "my name is sam and I have a sore throat",
    "Nice to meet you, Sam.",
  );
  const p = loadProfile("+15551234567");
  expect(p?.name).toBe("Sam");
  expect(p?.notes.some((n) => n.includes("sore throat"))).toBe(true);
  expect(p?.firstSeen).toBeTruthy();
});

test("notes are capped so profiles stay small", () => {
  for (let i = 0; i < 10; i++)
    rememberTurn("+15557777777", `utterance ${i}`, `reply ${i}`);
  const p = loadProfile("+15557777777");
  expect(p ? p.notes.length : 99).toBeLessThanOrEqual(8);
});

test("extractName", () => {
  expect(extractName("my name is sam")).toBe("Sam");
  expect(extractName("you can call me Jo")).toBe("Jo");
  expect(extractName("I have a headache")).toBeNull();
});
