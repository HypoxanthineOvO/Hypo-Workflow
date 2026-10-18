import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F } from "../theme";
import { seg, segIO, lin, mix, EV, rel } from "../util";
import { Reveal, Mono } from "../components";

const VERS = ["v6.1", "v7", "v8", "v9", "v10", "v11", "v12.8", "v13", "v14", "v15"];
const FLIPS = EV.s3Flips.map((x) => rel("s3", x));
const COL = rel("s3", EV.s3Collapse);
const THREE = rel("s3", EV.s3Three);

export const S3: React.FC = () => {
  const f = useCurrentFrame();
  let vi = 0;
  FLIPS.forEach((t, i) => {
    if (f >= t) vi = i;
  });
  const sinceFlip = f - FLIPS[vi];
  const grow = lin(f, FLIPS[0], FLIPS[FLIPS.length - 1] + 8);
  const collapse = segIO(f, COL, COL + 16);
  const three = seg(f, THREE, THREE + 22);

  return (
    <AbsoluteFill style={{ opacity: 1 - lin(f, 140, 150) }}>
      {/* stacked rule bars, growing */}
      <div
        style={{
          position: "absolute",
          left: 760,
          right: 760,
          bottom: 300,
          height: 420,
          display: "flex",
          flexDirection: "column-reverse",
          gap: 5,
          opacity: (1 - collapse) * 0.9,
          transform: `scaleY(${1 - collapse})`,
          transformOrigin: "50% 100%",
        }}
      >
        {Array.from({ length: 40 }).map((_, i) => {
          const on = i < grow * 40;
          return (
            <div
              key={i}
              style={{
                height: 5,
                width: `${40 + ((i * 37) % 60)}%`,
                background: on ? (i > 32 ? C.fg2 : C.fg4) : "transparent",
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "absolute",
            top: 200,
            fontFamily: F.mono,
            fontSize: 26,
            color: C.fg3,
            letterSpacing: "0.12em",
            opacity: 1 - collapse,
          }}
        >
          2026.04 — 2026.08
        </div>
        <div
          style={{
            fontFamily: F.mono,
            fontSize: 150,
            fontWeight: 400,
            color: C.fg2,
            transform: `translateY(${mix(sinceFlip < 4 ? -10 : 0, 0, seg(sinceFlip, 0, 4))}px)`,
            opacity: 1 - collapse,
            filter: `blur(${collapse * 10}px)`,
            position: "absolute",
            top: 250,
          }}
        >
          {VERS[vi]}
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 190,
          textAlign: "center",
          opacity: 1 - collapse,
        }}
      >
        <Reveal f={f} at={FLIPS[2]}>
          <div style={{ fontFamily: F.cn, fontSize: 40, color: C.fg }}>
            四个月，十个版本，规则越写越多。
          </div>
        </Reveal>

      </div>

      {/* zero → 3.0 */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 99,
            background: C.fg,
            opacity: collapse * (1 - three),
            transform: `scale(${mix(0.2, 1, collapse) * (1 + three * 4)})`,
            position: "absolute",
          }}
        />
        <div
          style={{
            fontFamily: F.en,
            fontWeight: 200,
            fontSize: 300,
            letterSpacing: "-0.04em",
            color: C.fg,
            opacity: three,
            filter: `blur(${mix(16, 0, three)}px)`,
            transform: `scale(${mix(1.08, 1, three)})`,
          }}
        >
          3.0
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
