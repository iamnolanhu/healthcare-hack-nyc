import React from "react";
import { Audio, staticFile, useCurrentFrame } from "remotion";
import { Beat, Bubble, Canvas, Kicker, Mono } from "../components";
import { colors, fonts, PHONE } from "../theme";

const CallTimer: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const seconds = Math.max(0, Math.floor((frame - startFrame) / 30));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <span
      style={{ fontFamily: fonts.mono, fontWeight: 600, color: colors.ink }}
    >
      {mm}:{ss}
    </span>
  );
};

/**
 * 8–30s (660 frames). A real call: caller with a sore throat, no insurance.
 * Clara answers with grounded data — cash price + nearby clinic.
 */
export const LiveCall: React.FC = () => {
  return (
    <Canvas style={{ justifyContent: "flex-start", paddingTop: 90 }}>
      <Audio src={staticFile("voiceover/livecall.mp3")} />
      {/* Call header bar */}
      <Beat at={4} style={{ width: "100%", maxWidth: 1500 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: colors.card,
            border: `1.5px solid ${colors.line}`,
            borderRadius: 16,
            padding: "22px 36px",
            fontSize: 30,
          }}
        >
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: colors.teal,
              }}
            />
            <span style={{ fontWeight: 600 }}>Clara — Care Line</span>
            <span style={{ color: colors.inkFaint }}>·</span>
            <span style={{ fontFamily: fonts.mono, color: colors.inkSoft }}>
              {PHONE}
            </span>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <span
              style={{
                fontSize: 23,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: colors.teal,
              }}
            >
              ● Live call
            </span>
            <CallTimer startFrame={4} />
          </div>
        </div>
      </Beat>

      {/* Transcript */}
      <div
        style={{
          width: "100%",
          maxWidth: 1500,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          marginTop: 30,
        }}
      >
        <Beat at={40} style={{ display: "flex" }}>
          <Bubble speaker="caller" label="Caller">
            “My throat’s been killing me for two days… I don’t have insurance. I
            can’t afford an ER visit.”
          </Bubble>
        </Beat>

        <Beat at={150} style={{ display: "flex", flexDirection: "column" }}>
          <Bubble
            speaker="clara"
            label="Clara"
            chip="grounded in real data"
            width={1120}
          >
            “I’m sorry — let’s sort this out. It doesn’t sound like an
            emergency, and you shouldn’t need an ER bill for it.”
          </Bubble>
        </Beat>

        <Beat at={300} style={{ display: "flex", flexDirection: "column" }}>
          <Bubble speaker="clara" label="Clara" width={1120}>
            “Lozenges plus ibuprofen run about <Mono>$7 cash</Mono>. And there’s
            a <Mono>sliding-scale clinic 0.7 mi</Mono> away — walk-ins today.”
          </Bubble>
        </Beat>
      </div>

      <Beat
        at={470}
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <Kicker>
            Real cash prices · Real low-cost clinics · No app, no login
          </Kicker>
          <div style={{ fontSize: 23, color: colors.inkFaint }}>
            Recreated from Clara’s live call flow · demo data shown
          </div>
        </div>
      </Beat>
    </Canvas>
  );
};
