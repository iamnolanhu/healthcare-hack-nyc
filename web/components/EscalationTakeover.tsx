import type { ClaraEvent } from "@/lib/events";

/** The escalation member of the event union — derived, so the contract stays single-source. */
export type EscalationEvent = Extract<ClaraEvent, { type: "escalation" }>;

export interface EscalationTakeoverProps {
  /** Active escalation, or null to render nothing. A full escalation event is assignable. */
  escalation: Pick<EscalationEvent, "kind" | "script"> | null;
}

const LABELS: Record<EscalationEvent["kind"], string> = {
  "911": "EMERGENCY — CALL 911",
  "988": "988 SUICIDE & CRISIS LIFELINE",
};

/**
 * Full-screen escalation takeover — the guardrail moment.
 *
 * Entrance is a single 120ms opacity cut (no slide, no scale, no spring):
 * `starting:opacity-0` + `transition-opacity` fires @starting-style on mount,
 * so the takeover appears decisively the instant the escalation event lands.
 * Under prefers-reduced-motion it renders instantly (global rule +
 * `motion-reduce:transition-none`).
 *
 * Contrast on --color-band-crisis (verified): white 6.6:1 (AA), white/80
 * strip 4.7:1 (AA), white on the black/25 chip plate 9.7:1 (AA).
 */
export default function EscalationTakeover({
  escalation,
}: EscalationTakeoverProps) {
  if (!escalation) return null;

  return (
    <div
      key={escalation.kind}
      role="alert"
      className="fixed inset-0 z-50 flex flex-col bg-band-crisis text-white opacity-100 transition-opacity duration-[120ms] ease-out starting:opacity-0 motion-reduce:transition-none"
    >
      <div className="flex flex-1 flex-col justify-center px-8 sm:px-16 lg:px-24">
        <h2 className="max-w-5xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          {LABELS[escalation.kind]}
        </h2>

        <p className="mt-8 max-w-4xl text-2xl leading-snug sm:text-3xl lg:mt-10 lg:text-4xl">
          &ldquo;{escalation.script}&rdquo;
        </p>

        <p className="mt-12 lg:mt-14">
          <span className="inline-block rounded-md bg-black/25 px-4 py-2.5 font-mono text-sm tracking-wide">
            GUARDRAIL · deterministic · LLM not consulted
          </span>
        </p>
      </div>

      <footer className="border-t border-white/25 px-8 py-4 sm:px-16 lg:px-24">
        <p className="text-sm text-white/80">Clara stays on the line</p>
      </footer>
    </div>
  );
}
