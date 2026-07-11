import type { ClaraEvent, TriageBand as Band } from "@/lib/events";

/** Where the current triage decision came from (mirrors the event schema). */
export type TriageSource = Extract<
  ClaraEvent,
  { type: "triage_update" }
>["source"];

export interface TriageBandProps {
  /** Current band; null = pre-first-triage (all segments muted). */
  band: Band | null;
  /** Confidence for the current band, 0–1. Ignored while band is null. */
  confidence: number | null;
  /** Decision source. Ignored while band is null. */
  source: TriageSource | null;
}

interface Segment {
  band: Band;
  label: string;
  /** Lit fill + AA-checked text color (contrast table in globals.css). */
  lit: string;
}

const SEGMENTS: readonly Segment[] = [
  {
    band: "self_care",
    label: "SELF-CARE",
    lit: "bg-band-self-care text-white",
  },
  { band: "primary", label: "PRIMARY", lit: "bg-band-primary text-white" },
  // Urgent amber is the one band where white fails AA — ink text, per globals.css.
  { band: "urgent", label: "URGENT", lit: "bg-band-urgent text-ink" },
  {
    band: "emergency",
    label: "EMERGENCY",
    lit: "bg-band-emergency text-white",
  },
  { band: "crisis", label: "CRISIS", lit: "bg-band-crisis text-white" },
];

const SOURCE_LABEL: Record<TriageSource, string> = {
  "care-api": "care API",
  "keyword-failsafe": "KEYWORD FAIL-SAFE",
};

/** 0–1 → whole-percent display, e.g. 0.88 → "88%". */
function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * The dashboard headline: five triage segments, current band fully lit.
 * The shift between bands is one of the two sanctioned motion moments —
 * a deliberate 250ms crossfade the audience can track. Layout is stable:
 * every segment reserves the meta row, so lighting a band never reflows.
 */
export default function TriageBand({
  band,
  confidence,
  source,
}: TriageBandProps) {
  const activeLabel = SEGMENTS.find((s) => s.band === band)?.label;

  return (
    <div aria-label="Triage band">
      {/* Quiet fade-in for the meta line when a segment lights up. */}
      <style>{"@keyframes clara-meta-in{from{opacity:0}to{opacity:1}}"}</style>

      <div className="flex w-full gap-1.5">
        {SEGMENTS.map((seg) => {
          const active = seg.band === band;
          return (
            <div
              key={seg.band}
              className={`min-w-0 flex-1 rounded-lg border px-4 py-3 transition-[background-color,border-color,color] duration-250 ease-out ${
                active
                  ? `border-transparent ${seg.lit}`
                  : "border-line bg-surface text-ink-muted"
              }`}
            >
              <div className="text-sm font-semibold tracking-wider whitespace-nowrap md:text-base">
                {seg.label}
              </div>
              {/* Reserved meta row — populated only on the lit segment. */}
              <div className="mt-1.5 flex h-5 items-center gap-2">
                {active && confidence !== null && (
                  <span className="animate-[clara-meta-in_200ms_var(--ease-out)] font-mono text-sm font-medium tabular-nums">
                    {formatConfidence(confidence)}
                  </span>
                )}
                {active && source !== null && (
                  <span
                    className={`animate-[clara-meta-in_200ms_var(--ease-out)] rounded-full border px-2 py-px text-[10px] font-medium tracking-wide whitespace-nowrap ${
                      source === "keyword-failsafe"
                        ? // Failsafe plate darkens the band under white text (≥7.4:1).
                          // Urgent's ink text keeps the ink/20 blend (5.4:1) —
                          // black/25 under ink would land at 4.5. Table in globals.css.
                          `border-current/50 font-semibold ${
                            seg.band === "urgent"
                              ? "bg-current/20"
                              : "bg-black/25"
                          }`
                        : "border-current/30"
                    }`}
                  >
                    {SOURCE_LABEL[source]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="sr-only" role="status">
        {band && activeLabel
          ? `Triage band ${activeLabel}${
              confidence !== null
                ? `, confidence ${formatConfidence(confidence)}`
                : ""
            }${source !== null ? `, source ${SOURCE_LABEL[source]}` : ""}.`
          : "Awaiting first triage."}
      </p>
    </div>
  );
}
