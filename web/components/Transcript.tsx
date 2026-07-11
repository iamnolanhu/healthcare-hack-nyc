"use client";

/**
 * Transcript — the live conversation column of the /live dashboard.
 *
 * Caller bubbles sit left on the neutral surface; Clara bubbles sit right on a
 * teal-tinted surface with a CLARA micro-label. Only the NEWEST utterance
 * streams in word-by-word (35ms stagger, opacity + 2px rise, ease-out); every
 * earlier line renders static. The scroll region stays pinned to the newest
 * line.
 *
 * Key strategy: the utterance stream is append-only within a call, so index
 * keys are stable — old bubbles keep their DOM nodes and never re-animate.
 * Each bubble is memoized; when a newer line arrives, the previous newest
 * swaps from animated word-spans to plain text (visually identical, so the
 * swap is invisible). On a script reset the parent should remount the
 * component (or pass a fresh array), which is the intended clean slate.
 */

import { Fragment, memo, useEffect, useRef } from "react";
import type { ClaraEvent } from "@/lib/events";

/** The renderable slice of an `utterance` event. */
export type TranscriptUtterance = Pick<
  Extract<ClaraEvent, { type: "utterance" }>,
  "role" | "text"
>;

export interface TranscriptProps {
  utterances: TranscriptUtterance[];
}

const WORD_STAGGER_MS = 35;
const WORD_DURATION_MS = 180;

interface BubbleProps extends TranscriptUtterance {
  /** True only for the newest utterance — the one that streams in. */
  animated: boolean;
}

const Bubble = memo(function Bubble({ role, text, animated }: BubbleProps) {
  const isClara = role === "clara";
  const words = animated ? text.split(/\s+/).filter(Boolean) : null;

  return (
    <div
      className={
        isClara
          ? "max-w-[85%] rounded-2xl rounded-br-md border border-accent/20 bg-accent/10 px-4 py-3"
          : "max-w-[85%] rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3"
      }
    >
      {isClara ? (
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
          Clara
        </span>
      ) : (
        <span className="sr-only">Caller</span>
      )}
      <p className="text-left text-base leading-relaxed text-ink">
        {words
          ? words.map((word, i) => (
              <Fragment key={i}>
                <span
                  className="transcript-word"
                  style={{ animationDelay: `${i * WORD_STAGGER_MS}ms` }}
                >
                  {word}
                </span>{" "}
              </Fragment>
            ))
          : text}
      </p>
    </div>
  );
});

export function Transcript({ utterances }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastText = utterances.at(-1)?.text ?? "";

  // Stay pinned to the newest line. Smooth for sighted flow; instant when the
  // caller prefers reduced motion.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [utterances.length, lastText]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Word-stream keyframes. The global reduced-motion rule collapses
          animation-duration but not animation-delay, so the stagger is
          zeroed here too — reduced motion completes each line instantly. */}
      <style>{`
        @keyframes transcript-word-in {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: none; }
        }
        .transcript-word {
          display: inline-block;
          animation: transcript-word-in ${WORD_DURATION_MS}ms var(--ease-out) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .transcript-word { animation-delay: 0ms !important; }
        }
      `}</style>

      <div
        ref={scrollRef}
        role="log"
        aria-label="Live call transcript"
        aria-live="polite"
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        {utterances.length === 0 ? (
          <p className="py-6 text-left text-sm text-ink-muted">
            Waiting for the call to connect.
          </p>
        ) : (
          // No horizontal inset: caller bubbles share the page's left rail
          // with the triage band and header (the grid gap is the gutter).
          <ul className="flex flex-col gap-5 py-6">
            {utterances.map((utterance, i) => (
              <li
                key={i}
                className={
                  utterance.role === "clara"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <Bubble
                  role={utterance.role}
                  text={utterance.text}
                  animated={i === utterances.length - 1}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Transcript;
