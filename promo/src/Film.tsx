import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, HUD } from "./components";
import { S, TL, lin } from "./util";
import { S1 } from "./scenes/S1Count";
import { S2 } from "./scenes/S2Pain";
import { S3 } from "./scenes/S3Reset";
import { S4, S5 } from "./scenes/S4Insight";
import { S6 } from "./scenes/S6Map";
import { S7, S8 } from "./scenes/S7Now";
import { S9 } from "./scenes/S9Commit";
import { S10 } from "./scenes/S10Check";
import { S11 } from "./scenes/S11Board";
import { S12 } from "./scenes/S12End";

export const DUR = TL.total;

const SCENES: [string, React.FC, string][] = [
  ["s1", S1, "PROBLEM"],
  ["s2", S2, "PROBLEM"],
  ["s3", S3, "RESET"],
  ["s4", S4, "INSIGHT"],
  ["s5", S5, "INSIGHT"],
  ["s6", S6, "01 MAP"],
  ["s7", S7, "02 NOW"],
  ["s8", S8, "03 PLAIN WORDS"],
  ["s9", S9, "04 COMMIT"],
  ["s10", S10, "05 HW CHECK"],
  ["s11", S11, "06 BOARD"],
  ["s12", S12, ""],
];

export const Film: React.FC = () => {
  const f = useCurrentFrame();
  const cur = SCENES.find(([k]) => f >= S[k][0] && f < S[k][1]);
  const brand = lin(f, S.s6[0], S.s6[0] + 20);
  const hide = 1 - lin(f, S.s12[0], S.s12[0] + 12);
  return (
    <AbsoluteFill>
      <Backdrop f={f} />
      {SCENES.map(([k, Comp]) => (
        <Sequence key={k} from={S[k][0]} durationInFrames={S[k][1] - S[k][0]} layout="none">
          <AbsoluteFill>
            <Comp />
          </AbsoluteFill>
        </Sequence>
      ))}
      <HUD f={f} brand={brand} scene={cur ? cur[2] : ""} hide={hide} />
      <Audio src={staticFile("music.wav")} volume={0.9} />
    </AbsoluteFill>
  );
};
