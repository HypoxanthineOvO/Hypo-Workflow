import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, HUD } from "./components";
import { S, TL, lin } from "./util";
import { Open, P1, P2, P3, P4, P5, Usual, Insight } from "./scenes/Pains";
import { MapScene, Nearby, NowScene } from "./scenes/Design";
import { S9 as Commit } from "./scenes/S9Commit";
import { S10 as Check } from "./scenes/S10Check";
import { S11 as Board } from "./scenes/S11Board";
import { S12 as End } from "./scenes/S12End";

export const DUR = TL.total;

const SCENES: [string, React.FC, string][] = [
  ["s1", Open, ""],
  ["s2", P1, "PROBLEM"],
  ["s3", P2, "PROBLEM"],
  ["s4", P3, "PROBLEM"],
  ["s5", P4, "PROBLEM"],
  ["s6", P5, "PROBLEM"],
  ["s7", Usual, "THE USUAL FIX"],
  ["s8", Insight, "INSIGHT"],
  ["s9", MapScene, "01 MAP"],
  ["s10", Nearby, "02 RULES"],
  ["s11", NowScene, "03 NOW"],
  ["s12", Commit, "04 COMMIT"],
  ["s13", Board, "05 BOARD"],
  ["s14", Check, "06 HW CHECK"],
  ["s15", End, ""],
];

export const Film: React.FC = () => {
  const f = useCurrentFrame();
  const cur = SCENES.find(([k]) => f >= S[k][0] && f < S[k][1]);
  const brand = lin(f, S.s9[0], S.s9[0] + 20);
  const hide = lin(f, S.s2[0], S.s2[0] + 12) * (1 - lin(f, S.s15[0], S.s15[0] + 12));
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
