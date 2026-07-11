/**
 * Clara event schema — the contract between any driver (scripted replay today,
 * live care-API backend later) and the dashboard renderer. Shared vocabulary
 * with the backend session; change only in lockstep.
 */

export type TriageBand =
  "self_care" | "primary" | "urgent" | "emergency" | "crisis";

export type ToolKind =
  "find_clinics" | "med_price" | "care_info" | "housing_check";

export interface ClinicResult {
  kind: "find_clinics";
  name: string;
  address: string;
  distanceMi: number;
  slidingScale: boolean;
}

export interface MedPriceResult {
  kind: "med_price";
  name: string;
  rxcui?: string;
  cashPrice: number;
  goodRxPrice?: number;
}

export interface CareInfoResult {
  kind: "care_info";
  title: string;
  summary: string;
}

export interface HousingCheckResult {
  kind: "housing_check";
  summary: string;
}

export type ToolData =
  ClinicResult | MedPriceResult | CareInfoResult | HousingCheckResult;

export interface ReturningCaller {
  name: string;
  lastSummary: string;
}

export type ClaraEvent =
  | { type: "call_started"; callerNumber: string; returning?: ReturningCaller }
  | { type: "utterance"; role: "caller" | "clara"; text: string }
  | {
      type: "triage_update";
      band: TriageBand;
      confidence: number;
      source: "care-api" | "keyword-failsafe";
    }
  | { type: "tool_call"; kind: ToolKind }
  | { type: "tool_result"; kind: ToolKind; data: ToolData }
  | {
      type: "escalation";
      kind: "911" | "988";
      script: string;
      llmConsulted: false;
    }
  | { type: "call_ended" };

/**
 * A demo call for presenter-stepped replay.
 * A beat is the batch of events one presenter keypress releases.
 */
export interface DemoCall {
  id: string;
  title: string;
  beats: ClaraEvent[][];
}
