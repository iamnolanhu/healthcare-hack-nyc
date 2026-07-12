import React from "react";
import { Composition } from "remotion";
import { ClaraDemo, TOTAL_DURATION } from "./ClaraDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ClaraDemo"
      component={ClaraDemo}
      durationInFrames={TOTAL_DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
