import React from "react";
import { Audio, staticFile } from "remotion";
import { Beat, Canvas, Kicker } from "../components";
import { colors, fonts } from "../theme";

const CALLS = [
  {
    caller: "+1 (347) ••• ••03",
    duration: "2:04",
    summary:
      "Chest-pain scare — guardrail escalated to scripted 911 response, then de-escalated. Caller was in distress, not danger.",
  },
  {
    caller: "+1 (347) ••• ••03",
    duration: "1:38",
    summary:
      "Sore throat, no insurance — OTC option with cash price and nearest sliding-scale clinic provided.",
  },
  {
    caller: "+1 (347) ••• ••03",
    duration: "1:12",
    summary:
      "Returning caller — Clara greeted them by name and followed up on earlier symptoms.",
  },
];

const Row: React.FC<{ call: (typeof CALLS)[number] }> = ({ call }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 30,
      backgroundColor: colors.card,
      border: `1.5px solid ${colors.line}`,
      borderRadius: 14,
      padding: "24px 32px",
    }}
  >
    <div
      style={{
        fontSize: 21,
        fontWeight: 600,
        letterSpacing: "0.08em",
        color: colors.tealDeep,
        backgroundColor: colors.tealBg,
        border: "1.5px solid #CBE3DF",
        borderRadius: 8,
        padding: "6px 14px",
      }}
    >
      VOICE
    </div>
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: 27,
        color: colors.ink,
        minWidth: 300,
      }}
    >
      {call.caller}
    </div>
    <div
      style={{ flex: 1, fontSize: 26, lineHeight: 1.4, color: colors.inkSoft }}
    >
      {call.summary}
    </div>
    <div
      style={{ fontFamily: fonts.mono, fontSize: 25, color: colors.inkFaint }}
    >
      {call.duration}
    </div>
    <div style={{ display: "flex", gap: 10 }}>
      {["Transcript", "Recording", "Summary"].map((chip) => (
        <span
          key={chip}
          style={{
            fontSize: 20,
            color: colors.inkSoft,
            border: `1.5px solid ${colors.line}`,
            borderRadius: 8,
            padding: "5px 12px",
          }}
        >
          {chip}
        </span>
      ))}
    </div>
  </div>
);

/**
 * 52–65s (400 frames). The Arya Health inbox — every call logged and triaged
 * on a real multi-tenant platform.
 */
export const Platform: React.FC = () => {
  return (
    <Canvas style={{ justifyContent: "flex-start", paddingTop: 100 }}>
      <Audio src={staticFile("voiceover/platform.mp3")} />
      <div style={{ width: "100%", maxWidth: 1560 }}>
        <Beat at={4}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
            <div
              style={{
                fontSize: 46,
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              Arya Health
            </div>
            <div style={{ fontSize: 30, color: colors.inkFaint }}>
              Inbox · Voice
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 24, color: colors.inkFaint }}>
              Interface recreated · the calls are real
            </div>
          </div>
        </Beat>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            marginTop: 34,
          }}
        >
          {CALLS.map((call, i) => (
            <Beat
              key={i}
              at={24 + i * 36}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <Row call={call} />
            </Beat>
          ))}
        </div>

        <Beat at={185} style={{ textAlign: "center", marginTop: 60 }}>
          <div
            style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.02em" }}
          >
            Every call — logged, transcribed, summarized.
          </div>
          <div
            style={{ marginTop: 18, display: "flex", justifyContent: "center" }}
          >
            <Kicker>
              A real product on a real multi-tenant platform — not a hack
            </Kicker>
          </div>
        </Beat>
      </div>
    </Canvas>
  );
};
