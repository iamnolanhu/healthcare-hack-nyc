// Tool schemas + dispatch: the model's only path to facts. Grounding
// lives here — prices, clinics, guidance, and housing all come from the
// care API, never from model memory.

import * as careApi from "./careApi";
import type { ToolSpec } from "./gateway";

const UNREACHABLE = "I can't reach that data right now.";

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function graceful(fn: () => Promise<string>): Promise<string> {
  return fn().catch(() => UNREACHABLE);
}

export const claraTools: ToolSpec[] = [
  {
    name: "med_price",
    description:
      "Suggest an over-the-counter medication for symptoms (or look up a drug by name) with real cash and discount prices, grounded in FDA label data. Also returns a deterministic triage rating.",
    parameters: {
      type: "object",
      properties: {
        symptoms: {
          type: "string",
          description: "The caller's symptoms in their own words",
        },
        drug: { type: "string", description: "A specific drug name to price" },
      },
      required: [],
    },
    run: (args) =>
      graceful(async () =>
        JSON.stringify(
          await careApi.medPrice({
            symptoms: asString(args.symptoms),
            drug: asString(args.drug),
          }),
        ),
      ),
  },
  {
    name: "find_clinics",
    description:
      "Find the nearest low-cost, sliding-scale (FQHC) clinics. Pass approximate latitude/longitude for the caller's stated location (e.g. Midtown Manhattan is about 40.754, -73.984).",
    parameters: {
      type: "object",
      properties: {
        lat: { type: "number", description: "Approximate latitude" },
        lng: { type: "number", description: "Approximate longitude" },
      },
      required: ["lat", "lng"],
    },
    run: (args) =>
      graceful(async () =>
        JSON.stringify(
          await careApi.findClinics({
            lat: asNumber(args.lat, 40.754),
            lng: asNumber(args.lng, -73.984),
          }),
        ),
      ),
  },
  {
    name: "care_info",
    description:
      "Look up grounded care guidance for a condition or question (what to do, when to see a clinician).",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The health question to ground",
        },
      },
      required: ["question"],
    },
    run: (args) =>
      graceful(async () =>
        JSON.stringify(
          await careApi.careInfo({ question: asString(args.question) ?? "" }),
        ),
      ),
  },
  {
    name: "housing_check",
    description:
      "Check open housing violations and recent 311 complaints for an NYC address (social determinants of health, e.g. no heat, mold).",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Street address in NYC" },
      },
      required: ["address"],
    },
    run: (args) =>
      graceful(async () =>
        JSON.stringify(
          await careApi.housingCheck({ address: asString(args.address) ?? "" }),
        ),
      ),
  },
  {
    name: "transfer_to_telehealth",
    description:
      "Connect the caller to a live telehealth clinician by transferring this phone call. Offer first; use only after the caller clearly agrees to be connected.",
    parameters: { type: "object", properties: {}, required: [] },
    clientSide: true,
    run: async () => "transferring", // never dispatched server-side; the server turns this into a live call transfer
  },
];
