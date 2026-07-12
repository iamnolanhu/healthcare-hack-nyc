import { describe, expect, test } from "bun:test";

process.env.CARE_API_MOCK = "1";

import { careInfo, findClinics, housingCheck, medPrice } from "../src/careApi";

describe("careApi mock mode", () => {
  test("medPrice: sore throat -> self_care band, priced OTC suggestion", async () => {
    const r = await medPrice({ symptoms: "I have a sore throat" });
    expect(r.triage.band).toBe("self_care");
    expect(r.triage.hardEscalate).toBeNull();
    expect(r.price.cash).toBeGreaterThan(0);
    expect(r.suggestion.toLowerCase()).toContain("acetaminophen");
  });

  test("medPrice: chest pain -> emergency with hardEscalate 911", async () => {
    const r = await medPrice({
      symptoms: "crushing chest pain and my arm is numb",
    });
    expect(r.triage.band).toBe("emergency");
    expect(r.triage.hardEscalate).toBe("911");
  });

  test("medPrice: suicidal ideation -> crisis with hardEscalate 988", async () => {
    const r = await medPrice({ symptoms: "I want to end my life" });
    expect(r.triage.band).toBe("crisis");
    expect(r.triage.hardEscalate).toBe("988");
  });

  test("medPrice: high fever for days -> urgent band, no hard escalation", async () => {
    const r = await medPrice({
      symptoms: "high fever for three days and I can't keep water down",
    });
    expect(r.triage.band).toBe("urgent");
    expect(r.triage.hardEscalate).toBeNull();
  });

  test("findClinics returns sliding-scale clinics", async () => {
    const clinics = await findClinics({ lat: 40.75, lng: -73.99 });
    expect(clinics.length).toBeGreaterThan(0);
    expect(clinics[0]?.slidingScale).toBe(true);
    expect(clinics[0]?.address.length).toBeGreaterThan(5);
  });

  test("live mode with dead upstream falls back to fixtures (fail-safe)", async () => {
    process.env.CARE_API_MODE = "live";
    process.env.CARE_API_MOCK = "0";
    process.env.CARE_API_TOKEN = "static-test-token"; // lets get() reach the wire
    process.env.CARE_API_BASE_URL = "http://127.0.0.1:9"; // nothing listens here
    try {
      const r = await medPrice({ symptoms: "chest pain" });
      expect(r.triage.hardEscalate).toBe("911"); // fixture triage still guards
    } finally {
      process.env.CARE_API_MODE = "mock";
      process.env.CARE_API_MOCK = "1";
      delete process.env.CARE_API_TOKEN;
    }
  });

  test("fail-closed: no CARE_API_MODE=live means no network even with CARE_API_MOCK=0", async () => {
    process.env.CARE_API_MOCK = "0";
    delete process.env.CARE_API_MODE;
    process.env.CARE_API_BASE_URL = "http://127.0.0.1:9"; // must NOT be contacted
    try {
      const r = await medPrice({ symptoms: "sore throat" });
      expect(r.triage.band).toBe("self_care"); // fixture served without a fetch
    } finally {
      process.env.CARE_API_MOCK = "1";
    }
  });

  test("live mode without an upstream token serves fixtures (no unauthenticated call)", async () => {
    process.env.CARE_API_MODE = "live";
    process.env.CARE_API_MOCK = "0";
    delete process.env.CARE_API_TOKEN;
    process.env.CARE_API_BASE_URL = "http://127.0.0.1:9";
    try {
      const r = await medPrice({ symptoms: "chest pain" });
      expect(r.triage.hardEscalate).toBe("911");
    } finally {
      process.env.CARE_API_MODE = "mock";
      process.env.CARE_API_MOCK = "1";
    }
  });

  test("careInfo and housingCheck respond with fixtures", async () => {
    expect(
      (await careInfo({ question: "sore throat care" })).answer.length,
    ).toBeGreaterThan(10);
    const h = await housingCheck({ address: "100 Example St" });
    expect(h.violations).toBeGreaterThanOrEqual(0);
    expect(h.summary.length).toBeGreaterThan(5);
  });
});
