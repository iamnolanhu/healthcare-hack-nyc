import { describe, expect, test } from "bun:test";

import { KB_ENTRIES, searchKb } from "../src/kb";

describe("searchKb (representative queries per namespace)", () => {
  test("cost question -> arya:cost first", () => {
    const hits = searchKb("how much does it cost to call");
    expect(hits[0]?.id).toBe("arya:cost");
  });

  test("UTI symptom phrasing -> care:uti first", () => {
    const hits = searchKb("burning when I pee");
    expect(hits[0]?.id).toBe("care:uti");
  });

  test("undocumented / no insurance phrasing -> nyc:nyc-care first", () => {
    const hits = searchKb("I don't have papers can I still see a doctor");
    expect(hits[0]?.id).toBe("nyc:nyc-care");
  });
});

describe("searchKb (edge cases)", () => {
  test("off-topic query -> no hits", () => {
    expect(searchKb("what's the weather on mars")).toEqual([]);
  });

  test("empty query -> no hits", () => {
    expect(searchKb("")).toEqual([]);
  });

  test("broad query respects the default limit of 3", () => {
    const hits = searchKb("care");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(3);
  });
});

describe("KB_ENTRIES content integrity", () => {
  test("has exactly 22 entries", () => {
    expect(KB_ENTRIES.length).toBe(22);
  });

  test("every entry has non-empty id/title/body and at least 4 keywords", () => {
    for (const entry of KB_ENTRIES) {
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.body.length).toBeGreaterThan(0);
      expect(entry.keywords.length).toBeGreaterThanOrEqual(4);
    }
  });

  test("ids are unique and namespaced (arya:|care:|nyc:)", () => {
    const ids = new Set(KB_ENTRIES.map((e) => e.id));
    expect(ids.size).toBe(KB_ENTRIES.length);
    for (const entry of KB_ENTRIES) {
      expect(entry.id).toMatch(/^(arya|care|nyc):/);
    }
  });
});
