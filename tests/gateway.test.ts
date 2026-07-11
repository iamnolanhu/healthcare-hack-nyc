import { expect, test } from "bun:test";
import { toAnthropicPayload, type ChatMessage } from "../src/gateway";

test("system messages hoisted; assistant-first history gets a synthetic user turn", () => {
  const messages: ChatMessage[] = [
    { role: "system", content: "You are Clara." },
    { role: "assistant", content: "Hi, I'm Clara." },
    { role: "user", content: "hello" },
  ];
  const { system, messages: turns } = toAnthropicPayload(messages);
  expect(system).toBe("You are Clara.");
  expect(turns[0]).toEqual({ role: "user", content: "(caller connected)" });
  expect(turns[1]?.role).toBe("assistant");
  expect(turns[2]).toEqual({ role: "user", content: "hello" });
});

test("consecutive same-role messages merge (provider requires alternation)", () => {
  const { messages: turns } = toAnthropicPayload([
    { role: "user", content: "one" },
    { role: "user", content: "two" },
  ]);
  expect(turns).toEqual([{ role: "user", content: "one\ntwo" }]);
});
