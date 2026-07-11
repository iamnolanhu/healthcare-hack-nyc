"use client";

import { useCallback, useState } from "react";
import type {
  ClaraEvent,
  DemoCall,
  ReturningCaller,
  ToolData,
  TriageBand,
} from "@/lib/events";

interface ReplayState {
  callIndex: number;
  beatIndex: number;
  events: ClaraEvent[];
}

export interface Replay {
  /** Events released so far for the CURRENT call (each call starts clean). */
  events: ClaraEvent[];
  callIndex: number;
  beatIndex: number;
  /** Beat count of the current call. */
  totalBeats: number;
  /**
   * Release the next beat. Past the current call's last beat, moves to the
   * next call's clean start; at the very end of the last call it's a no-op.
   */
  advance: () => void;
  /** Back to call 0, beat 0, empty events. */
  reset: () => void;
  /** Start call n fresh (out-of-range n is ignored). */
  jumpTo: (callIdx: number) => void;
}

const FRESH: ReplayState = { callIndex: 0, beatIndex: 0, events: [] };

export function useReplay(calls: DemoCall[]): Replay {
  const [state, setState] = useState<ReplayState>(FRESH);

  const advance = useCallback(() => {
    setState((s) => {
      const call = calls[s.callIndex];
      if (!call) return s;
      if (s.beatIndex < call.beats.length) {
        const beat = call.beats[s.beatIndex] ?? [];
        return {
          callIndex: s.callIndex,
          beatIndex: s.beatIndex + 1,
          events: [...s.events, ...beat],
        };
      }
      if (s.callIndex < calls.length - 1) {
        return { callIndex: s.callIndex + 1, beatIndex: 0, events: [] };
      }
      return s;
    });
  }, [calls]);

  const reset = useCallback(() => setState(FRESH), []);

  const jumpTo = useCallback(
    (callIdx: number) => {
      if (!Number.isInteger(callIdx) || callIdx < 0 || callIdx >= calls.length)
        return;
      setState({ callIndex: callIdx, beatIndex: 0, events: [] });
    },
    [calls],
  );

  return {
    events: state.events,
    callIndex: state.callIndex,
    beatIndex: state.beatIndex,
    totalBeats: calls[state.callIndex]?.beats.length ?? 0,
    advance,
    reset,
    jumpTo,
  };
}

/* ── Derived selectors — pure functions over the event stream ────────── */

export type TriageUpdate = Extract<ClaraEvent, { type: "triage_update" }>;
export type Escalation = Extract<ClaraEvent, { type: "escalation" }>;

export interface Utterance {
  role: "caller" | "clara";
  text: string;
}

export interface CallMeta {
  callerNumber: string;
  returning?: ReturningCaller;
  ended: boolean;
}

/** Latest triage update in full (band + confidence + source), or null. */
export function latestTriage(events: ClaraEvent[]): TriageUpdate | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e?.type === "triage_update") return e;
  }
  return null;
}

/** The band the header should light right now, or null before first triage. */
export function currentBand(events: ClaraEvent[]): TriageBand | null {
  return latestTriage(events)?.band ?? null;
}

/** Latest escalation (drives the takeover), or null. */
export function latestEscalation(events: ClaraEvent[]): Escalation | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e?.type === "escalation") return e;
  }
  return null;
}

/** Tool results in arrival order — feeds the grounding cards column. */
export function groundingResults(events: ClaraEvent[]): ToolData[] {
  const out: ToolData[] = [];
  for (const e of events) {
    if (e.type === "tool_result") out.push(e.data);
  }
  return out;
}

/** Caller/Clara turns in order — feeds the transcript column. */
export function transcript(events: ClaraEvent[]): Utterance[] {
  const out: Utterance[] = [];
  for (const e of events) {
    if (e.type === "utterance") out.push({ role: e.role, text: e.text });
  }
  return out;
}

/** Call status strip data; null until call_started arrives. */
export function callMeta(events: ClaraEvent[]): CallMeta | null {
  let started: Extract<ClaraEvent, { type: "call_started" }> | null = null;
  let ended = false;
  for (const e of events) {
    if (e.type === "call_started") {
      started = e;
      ended = false;
    } else if (e.type === "call_ended") {
      ended = true;
    }
  }
  if (!started) return null;
  return {
    callerNumber: started.callerNumber,
    returning: started.returning,
    ended,
  };
}
