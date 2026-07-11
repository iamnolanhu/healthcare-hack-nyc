"use client";

/**
 * /live — the judge-facing call dashboard (Layout B).
 *
 * CallHeader strip, full-width TriageBand headline, then transcript (~60%)
 * beside the grounding column (~40%). EscalationTakeover overlays everything
 * while the latest event stream contains an escalation; reset/jump clears it
 * because each call starts from an empty stream.
 *
 * Presenter controls: Space / ArrowRight advance a beat, R resets, 1/2/3 jump
 * to a call. Clicking anywhere (including inside the escalation takeover)
 * also advances — the nervous-presenter backup.
 */

import { useEffect, useRef } from "react";
import CallHeader from "@/components/CallHeader";
import EscalationTakeover from "@/components/EscalationTakeover";
import GroundingCard, {
  type GroundingResult,
} from "@/components/GroundingCard";
import Transcript from "@/components/Transcript";
import TriageBand from "@/components/TriageBand";
import type { ClaraEvent } from "@/lib/events";
import {
  callMeta,
  latestEscalation,
  latestTriage,
  transcript,
  useReplay,
} from "@/lib/replay/driver";
import { demoCalls } from "@/lib/replay/script";

/**
 * Adapts the raw event stream to GroundingCard's shape: each `tool_call`
 * opens a pending card; its `tool_result` fills that card in place (same
 * array index → same React key → no re-entrance animation).
 */
function toGroundingResults(events: ClaraEvent[]): GroundingResult[] {
  const out: GroundingResult[] = [];
  for (const e of events) {
    if (e.type === "tool_call") {
      out.push({ kind: e.kind });
    } else if (e.type === "tool_result") {
      const pending = out.find(
        (r) => r.kind === e.kind && r.data === undefined,
      );
      if (pending) pending.data = e.data;
      else out.push({ kind: e.kind, data: e.data });
    }
  }
  return out;
}

/** True when the key event originates from a text-entry control. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export default function LivePage() {
  const { events, callIndex, beatIndex, totalBeats, advance, reset, jumpTo } =
    useReplay(demoCalls);

  const meta = callMeta(events);
  const triage = latestTriage(events);
  const utterances = transcript(events);
  const grounding = toGroundingResults(events);
  const escalation = latestEscalation(events);
  const call = demoCalls[callIndex];

  // Grounding cards append at the bottom; keep the newest one in view, exactly
  // like the transcript column (instant under reduced motion).
  const groundingRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = groundingRef.current;
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [grounding.length]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Held keys auto-repeat — never let one long press skip through beats.
      if (e.repeat) return;
      if (isTypingTarget(e.target)) return;
      switch (e.key) {
        case " ":
          e.preventDefault(); // Space must never scroll the page.
          advance();
          break;
        case "ArrowRight":
          advance();
          break;
        case "r":
        case "R":
          reset();
          break;
        case "1":
        case "2":
        case "3":
          jumpTo(Number(e.key) - 1);
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, reset, jumpTo]);

  return (
    // Click-to-advance is a presenter backup for the keyboard controls above,
    // not the primary interface — safe to hang on the layout container.
    // The takeover renders inside <main>, so clicks on it bubble here too.
    <main className="flex h-dvh flex-col gap-5 px-8 py-6" onClick={advance}>
      <CallHeader
        title={call?.title ?? ""}
        callerNumber={meta?.callerNumber ?? null}
        returning={meta?.returning}
        live={!(meta?.ended ?? false)}
      />

      <TriageBand
        band={triage?.band ?? null}
        confidence={triage?.confidence ?? null}
        source={triage?.source ?? null}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[3fr_2fr] grid-rows-1 gap-6">
        <section aria-label="Live transcript" className="min-h-0">
          {meta === null ? (
            <p className="py-6 text-left text-sm text-ink-muted">
              Waiting for call…
            </p>
          ) : (
            <Transcript utterances={utterances} />
          )}
        </section>

        <aside
          ref={groundingRef}
          aria-label="Grounding"
          className="min-h-0 overflow-y-auto overscroll-contain py-6 pr-1"
        >
          <GroundingCard results={grounding} />
        </aside>
      </div>

      <EscalationTakeover escalation={escalation} />

      {/* Presenter affordances — faint, mono, out of the audience's way. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed right-6 bottom-4 z-40 text-right font-mono text-[11px] leading-5 text-ink-muted/70 tabular-nums"
      >
        <p>
          beat {beatIndex}/{totalBeats} · call {callIndex + 1}/
          {demoCalls.length}
        </p>
        <p>space next · r reset · 1-3 jump</p>
      </div>
    </main>
  );
}
