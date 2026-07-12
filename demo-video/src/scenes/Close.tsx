import React from "react";
import { Audio, staticFile } from "remotion";
import { Beat, Canvas } from "../components";
import { colors, fonts, PHONE } from "../theme";

/**
 * 65–75s (300 frames). Wordmark + call to action.
 */
export const Close: React.FC = () => {
  return (
    <Canvas>
      <Audio src={staticFile("voiceover/close.mp3")} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 30,
          textAlign: "center",
        }}
      >
        <Beat at={8}>
          <div
            style={{ fontSize: 150, fontWeight: 700, letterSpacing: "-0.03em" }}
          >
            Clara<span style={{ color: colors.teal }}>.</span>
          </div>
          <div style={{ fontSize: 38, color: colors.inkSoft, marginTop: 4 }}>
            Care Line — by Arya Health
          </div>
        </Beat>

        <Beat at={54} style={{ marginTop: 30 }}>
          <div style={{ fontSize: 32, color: colors.inkSoft }}>
            Call it yourself — it’s live:
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 62,
              fontWeight: 600,
              color: colors.tealDeep,
              backgroundColor: colors.tealBg,
              border: "1.5px solid #CBE3DF",
              borderRadius: 16,
              padding: "20px 44px",
              marginTop: 18,
            }}
          >
            {PHONE}
          </div>
        </Beat>

        <Beat at={110} style={{ marginTop: 26 }}>
          <div style={{ fontSize: 26, color: colors.inkFaint }}>
            Built with Twilio · Vapi · Claude — guardrail-first by design
          </div>
        </Beat>
      </div>
    </Canvas>
  );
};
