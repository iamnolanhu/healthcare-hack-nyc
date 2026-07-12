import React from "react";
import {
  Audio,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Beat, Bubble, Canvas, Kicker } from "../components";
import { colors, fonts, EASE } from "../theme";

const easeOut = Easing.bezier(...EASE);

const EMERGENCY_AT = 150; // red band + guardrail trip
const PART_B = 360; // de-escalation half

const Node: React.FC<{
  label: string;
  sub?: string;
  state: "idle" | "active" | "danger" | "dimmed";
}> = ({ label, sub, state }) => {
  const border =
    state === "danger"
      ? colors.danger
      : state === "active"
        ? colors.teal
        : colors.line;
  const bg =
    state === "danger"
      ? colors.dangerBg
      : state === "active"
        ? colors.tealBg
        : colors.card;
  return (
    <div
      style={{
        border: `2.5px solid ${border}`,
        backgroundColor: bg,
        opacity: state === "dimmed" ? 0.35 : 1,
        borderRadius: 14,
        padding: "18px 34px",
        textAlign: "center",
        minWidth: 250,
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 600 }}>{label}</div>
      {sub ? (
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 20,
            marginTop: 6,
            color:
              state === "danger"
                ? colors.danger
                : state === "active"
                  ? colors.tealDeep
                  : colors.inkSoft,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};

const Arrow: React.FC<{ blocked?: boolean }> = ({ blocked }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 34,
      color: blocked ? colors.danger : colors.inkFaint,
      fontFamily: fonts.mono,
    }}
  >
    {blocked ? "✕" : "→"}
  </div>
);

/** Pipeline diagram: Caller → Guardrail → AI model. Persists through the scene. */
const Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const tripped = frame >= EMERGENCY_AT && frame < PART_B;
  const partB = frame >= PART_B;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 26,
        justifyContent: "center",
      }}
    >
      <Node label="Caller" state="idle" />
      <Arrow />
      <Node
        label="Guardrail"
        sub={
          tripped ? "EMERGENCY → scripted 911" : "deterministic · every turn"
        }
        state={tripped ? "danger" : "active"}
      />
      <Arrow blocked={tripped} />
      <Node
        label="AI model"
        sub={
          tripped
            ? "never sees it"
            : partB
              ? "responds with warmth"
              : "grounded answers"
        }
        state={tripped ? "dimmed" : partB ? "active" : "idle"}
      />
    </div>
  );
};

/**
 * 30–52s (660 frames). The money shot: real transcript of the heart-attack call.
 * Part A: guardrail trips, scripted 911. Part B: caller opens up, Clara is warm again.
 */
export const SafetyBeat: React.FC = () => {
  const frame = useCurrentFrame();
  // Red flash on the whole frame edge when the guardrail trips — fast in, slow out.
  const flash = interpolate(
    frame,
    [EMERGENCY_AT, EMERGENCY_AT + 5, EMERGENCY_AT + 40],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut },
  );

  return (
    <Canvas style={{ justifyContent: "flex-start", paddingTop: 80 }}>
      <Audio src={staticFile("voiceover/safety-a.mp3")} />
      <Sequence from={395}>
        <Audio src={staticFile("voiceover/safety-b.mp3")} />
      </Sequence>
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: `inset 0 0 180px rgba(185,28,28,${0.25 * flash})`,
          pointerEvents: "none",
        }}
      />

      <Beat at={4} style={{ textAlign: "center" }}>
        <Kicker>Safety runs before the AI — on every single turn</Kicker>
      </Beat>

      <Beat at={16} style={{ marginTop: 34 }}>
        <Pipeline />
      </Beat>

      {/* Part A: emergency */}
      <div
        style={{
          width: "100%",
          maxWidth: 1460,
          display: "flex",
          flexDirection: "column",
          gap: 30,
          marginTop: 48,
        }}
      >
        <Beat at={70} out={PART_B - 20} style={{ display: "flex" }}>
          <Bubble speaker="caller" label="Caller · real recorded call">
            “…I feel like I just had a heart attack.”
          </Bubble>
        </Beat>

        <Beat
          at={EMERGENCY_AT}
          dur={6}
          out={PART_B - 20}
          style={{ alignSelf: "center" }}
        >
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 30,
              fontWeight: 600,
              color: "#FFFFFF",
              backgroundColor: colors.danger,
              borderRadius: 12,
              padding: "14px 32px",
              letterSpacing: "0.04em",
            }}
          >
            EMERGENCY DETECTED — scripted response · no LLM
          </div>
        </Beat>

        <Beat
          at={EMERGENCY_AT + 40}
          out={PART_B - 20}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <Bubble
            speaker="clara-urgent"
            label="Clara"
            chip="deterministic script"
          >
            “Okay. I need you to call 9 1 1 right now. If you’re having chest
            pain or think you had a heart attack, that’s an emergency. Can you
            call 9 1 1 for me?”
          </Bubble>
        </Beat>
      </div>

      {/* Part B: de-escalation */}
      <div
        style={{
          position: "absolute",
          top: 330,
          left: 120,
          right: 120,
          display: "flex",
          flexDirection: "column",
          gap: 30,
          alignItems: "stretch",
          maxWidth: 1460,
          margin: "0 auto",
        }}
      >
        <Beat at={PART_B + 10} style={{ display: "flex" }}>
          <Bubble speaker="caller" label="Caller">
            “…No. I’m just… I just wanted to talk to someone that cares.”
          </Bubble>
        </Beat>

        <Beat
          at={PART_B + 120}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <Bubble speaker="clara" label="Clara">
            “I hear you. I’m here to talk and I do care. It sounds like you’re
            going through a tough time right now…”
          </Bubble>
        </Beat>

        <Beat
          at={PART_B + 195}
          style={{ alignSelf: "center", textAlign: "center", marginTop: 20 }}
        >
          <div
            style={{ fontSize: 54, fontWeight: 700, letterSpacing: "-0.02em" }}
          >
            On an emergency, Clara doesn’t think.{" "}
            <span style={{ color: colors.teal }}>She acts.</span>
          </div>
          <div style={{ fontSize: 30, color: colors.inkSoft, marginTop: 14 }}>
            Safe by construction — then human again.
          </div>
        </Beat>
      </div>
    </Canvas>
  );
};
