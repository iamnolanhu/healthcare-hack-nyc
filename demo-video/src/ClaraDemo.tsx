import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "./theme";
import { Hook } from "./scenes/Hook";
import { LiveCall } from "./scenes/LiveCall";
import { SafetyBeat } from "./scenes/SafetyBeat";
import { Platform } from "./scenes/Platform";
import { Close } from "./scenes/Close";

export const SCENES = {
  hook: 240,
  liveCall: 660,
  safety: 660,
  platform: 400,
  close: 300,
};
const TRANSITION = 12;
const NUM_TRANSITIONS = 4;

export const TOTAL_DURATION =
  Object.values(SCENES).reduce((a, b) => a + b, 0) -
  TRANSITION * NUM_TRANSITIONS;

const t = () => (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: TRANSITION })}
  />
);

export const ClaraDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENES.hook}>
          <Hook />
        </TransitionSeries.Sequence>
        {t()}
        <TransitionSeries.Sequence durationInFrames={SCENES.liveCall}>
          <LiveCall />
        </TransitionSeries.Sequence>
        {t()}
        <TransitionSeries.Sequence durationInFrames={SCENES.safety}>
          <SafetyBeat />
        </TransitionSeries.Sequence>
        {t()}
        <TransitionSeries.Sequence durationInFrames={SCENES.platform}>
          <Platform />
        </TransitionSeries.Sequence>
        {t()}
        <TransitionSeries.Sequence durationInFrames={SCENES.close}>
          <Close />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
