import React from "react";
import { Audio, staticFile } from "remotion";
import { Beat, Canvas, Kicker } from "../components";
import { colors, fonts, PHONE } from "../theme";

/**
 * 0–8s. Stat hook, then the promise.
 * Beat 1: "1 in 4 Americans skip medical care because of cost."
 * Beat 2: "What if help was one phone call away?"
 */
export const Hook: React.FC = () => {
  return (
    <Canvas>
      <Audio src={staticFile("voiceover/hook.mp3")} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 44,
          maxWidth: 1400,
          textAlign: "center",
          alignItems: "center",
        }}
      >
        <Beat at={6} out={104}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.18,
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{ color: colors.teal }}>1 in 4 Americans</span> skip
            <br />
            medical care because of cost.
          </div>
        </Beat>
        <Beat at={126} dur={20}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            What if help was
            <br />
            <span style={{ color: colors.teal }}>one phone call away?</span>
          </div>
        </Beat>
        <Beat at={170} dur={20}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 40,
              fontWeight: 600,
              color: colors.tealDeep,
              backgroundColor: colors.tealBg,
              border: "1.5px solid #CBE3DF",
              borderRadius: 14,
              padding: "16px 34px",
            }}
          >
            {PHONE} · live now
          </div>
        </Beat>
        <Beat at={186}>
          <Kicker>Clara — Care Line</Kicker>
        </Beat>
      </div>
    </Canvas>
  );
};
