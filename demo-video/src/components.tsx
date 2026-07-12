import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { colors, fonts, EASE } from "./theme";

const easeOut = Easing.bezier(...EASE);

/** Fade + 14px rise entrance at `at` frames; optional fade-out at `out`. */
export const useBeat = (at: number, dur = 18, out?: number) => {
  const frame = useCurrentFrame();
  let opacity = interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const y = interpolate(frame, [at, at + dur], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  if (out !== undefined) {
    opacity *= interpolate(frame, [out, out + 12], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: easeOut,
    });
  }
  return { opacity, transform: `translateY(${y}px)` };
};

export const Beat: React.FC<{
  at: number;
  dur?: number;
  out?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, dur = 18, out, style, children }) => {
  const anim = useBeat(at, dur, out);
  return <div style={{ ...anim, ...style }}>{children}</div>;
};

/** Full-frame warm-neutral canvas with generous padding. */
export const Canvas: React.FC<{
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ style, children }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundColor: colors.bg,
      fontFamily: fonts.sans,
      color: colors.ink,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: 120,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Small uppercase kicker label. */
export const Kicker: React.FC<{
  children: React.ReactNode;
  color?: string;
}> = ({ children, color = colors.teal }) => (
  <div
    style={{
      fontSize: 26,
      fontWeight: 600,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color,
    }}
  >
    {children}
  </div>
);

/** Transcript bubble. speaker: caller (neutral) | clara (teal) | clara-urgent (red) */
export const Bubble: React.FC<{
  speaker: "caller" | "clara" | "clara-urgent";
  label: string;
  chip?: string;
  children: React.ReactNode;
  width?: number;
}> = ({ speaker, label, chip, children, width = 980 }) => {
  const isCaller = speaker === "caller";
  const urgent = speaker === "clara-urgent";
  const accent = urgent ? colors.danger : colors.teal;
  return (
    <div
      style={{
        alignSelf: isCaller ? "flex-start" : "flex-end",
        maxWidth: width,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: isCaller ? "flex-start" : "flex-end",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: isCaller ? colors.inkFaint : accent,
        }}
      >
        <span>{label}</span>
        {chip ? (
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 21,
              fontWeight: 500,
              letterSpacing: "0.02em",
              textTransform: "none",
              color: urgent ? colors.danger : colors.tealDeep,
              backgroundColor: urgent ? colors.dangerBg : colors.tealBg,
              border: `1.5px solid ${urgent ? "#F1C7C7" : "#CBE3DF"}`,
              borderRadius: 8,
              padding: "4px 14px",
            }}
          >
            {chip}
          </span>
        ) : null}
      </div>
      <div
        style={{
          backgroundColor: isCaller
            ? colors.card
            : urgent
              ? colors.dangerBg
              : colors.tealBg,
          border: `1.5px solid ${isCaller ? colors.line : urgent ? "#F1C7C7" : "#CBE3DF"}`,
          borderLeft: isCaller ? undefined : `6px solid ${accent}`,
          borderRadius: 18,
          padding: "26px 36px",
          fontSize: 37,
          lineHeight: 1.45,
          color: colors.ink,
          boxShadow: "0 1px 3px rgba(28,25,23,0.05)",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Monospace data value in teal. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = colors.tealDeep,
}) => (
  <span style={{ fontFamily: fonts.mono, fontWeight: 600, color }}>
    {children}
  </span>
);
