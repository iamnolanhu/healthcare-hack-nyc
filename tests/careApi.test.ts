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

  test("careInfo and housingCheck respond with fixtures", async () => {
    expect(
      (await careInfo({ question: "sore throat care" })).answer.length,
    ).toBeGreaterThan(10);
    const h = await housingCheck({ address: "100 Example St" });
    expect(h.violations).toBeGreaterThanOrEqual(0);
    expect(h.summary.length).toBeGreaterThan(5);
  });
});
