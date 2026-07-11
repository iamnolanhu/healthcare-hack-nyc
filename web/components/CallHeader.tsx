"use client";

import { useEffect, useState } from "react";
import type { ReturningCaller } from "@/lib/events";

export interface CallHeaderProps {
  /** e.g. "Call 2 — Grounding" */
  title: string;
  /** Pre-masked caller number from call_started; null before the call begins. */
  callerNumber: string | null;
  /** Returning-caller profile from call_started, when present. */
  returning?: ReturningCaller;
  /** false freezes the clock and stills the dot (call ended). Default true. */
  live?: boolean;
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Slim status strip above the triage band. The pulsing live dot is the ONE
 * ambient motion on the dashboard (2s opacity pulse); everything else here
 * is static. Clock resets when the call changes, freezes when live=false.
 */
export default function CallHeader({
  title,
  callerNumber,
  returning,
  live = true,
}: CallHeaderProps) {
  const [elapsed, setElapsed] = useState(0);
  const active = live && callerNumber !== null;

  // New call (new title/number) → clock back to zero.
  useEffect(() => {
    setElapsed(0);
  }, [title, callerNumber]);

  // Tick only while the call is live; freeze (don't reset) on call_ended.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active, title, callerNumber]);

  const status = callerNumber === null ? "STANDBY" : active ? "LIVE" : "ENDED";

  return (
    <div className="flex w-full items-center gap-4">
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${
            active ? "animate-pulse bg-accent" : "bg-line"
          }`}
        />
        <span className="text-[11px] font-medium tracking-widest text-ink-muted">
          {status}
        </span>
      </span>

      <span className="text-sm font-medium text-ink">{title}</span>

      {returning && (
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap text-white">
          RETURNING CALLER · {returning.name}
        </span>
      )}

      <span className="ml-auto flex items-center gap-4">
        <span className="font-mono text-sm text-ink-muted tabular-nums">
          {callerNumber ?? "—"}
        </span>
        <span
          className="font-mono text-sm text-ink tabular-nums"
          aria-label={`Elapsed ${formatElapsed(elapsed)}`}
        >
          {formatElapsed(elapsed)}
        </span>
      </span>
    </div>
  );
}
