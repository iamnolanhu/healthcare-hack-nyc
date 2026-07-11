import { expect, test } from "bun:test";

process.env.CARE_API_MOCK = "1";

import { claraTools } from "../src/tools";

test("exposes the five care tools plus the client-side transfer tool", () => {
  expect(claraTools.map((t) => t.name).sort()).toEqual([
    "care_info",
    "find_clinics",
    "housing_check",
    "kb_search",
    "med_price",
    "transfer_to_telehealth",
  ]);
  expect(
    claraTools.find((t) => t.name === "transfer_to_telehealth")?.clientSide,
  ).toBe(true);
});

test("find_clinics dispatch returns clinic JSON", async () => {
  const tool = claraTools.find((t) => t.name === "find_clinics");
  const out = await tool!.run({ lat: 40.75, lng: -73.99 });
  expect(out).toContain("slidingScale");
  expect(out).toContain("address");
});

test("med_price dispatch surfaces triage + price", async () => {
  const tool = claraTools.find((t) => t.name === "med_price");
  const out = await tool!.run({ symptoms: "sore throat" });
  expect(out).toContain("goodrx");
  expect(out).toContain("self_care");
});

test("tool failure degrades to fixture data, never throws", async () => {
  process.env.CARE_API_MOCK = "0";
  process.env.CARE_API_BASE_URL = "http://127.0.0.1:9";
  try {
    const tool = claraTools.find((t) => t.name === "care_info");
    const out = await tool!.run({ question: "flu shots" });
    expect(out).toContain("answer"); // careApi served its fixture instead of failing
  } finally {
    process.env.CARE_API_MOCK = "1";
  }
});
