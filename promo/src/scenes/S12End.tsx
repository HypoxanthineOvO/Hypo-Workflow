import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F } from "../theme";
import { seg, lin, mix, EV, rel } from "../util";

const LOGO = rel("s15", EV.logo);
const LINE = rel("s15", EV.slogan);
const CMD = LINE + 30;

export const S12: React.FC = () => {
  const f = useCurrentFrame();
  const lg = seg(f, LOGO, LOGO + 30);
  const ln = seg(f, LINE, LINE + 24);
  const bar = seg(f, LOGO - 14, LOGO + 16);
  const end = 1 - lin(f, 136, 150);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: end }}>
      <div style={{ textAlign: "center", transform: "translateY(-30px)" }}>
        {/* docs ⇄ code, two hairlines meeting */}
        <div style={{ position: "relative", width: 560, height: 2, margin: "0 auto 70px" }}>
          <div
            style={{
              position: "absolute",
              right: "50%",
              top: 0,
              height: 2,
              width: `${50 * bar}%`,
              background: `linear-gradient(90deg, transparent, ${C.fg})`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              height: 2,
              width: `${50 * bar}%`,
              background: `linear-gradient(270deg, transparent, ${C.mint})`,
            }}
          />
        </div>
        <div
          style={{
            fontFamily: F.en,
            fontSize: 128,
            fontWeight: 300,
            letterSpacing: "-0.035em",
            color: C.fg,
            opacity: lg,
            filter: `blur(${mix(14, 0, lg)}px)`,
            transform: `scale(${mix(1.04, 1, lg)})`,
            lineHeight: 1,
          }}
        >
          Hypo-Workflow <span style={{ fontWeight: 600 }}>3.0</span>
        </div>
        <div
          style={{
            fontFamily: F.cn,
            fontSize: 46,
            fontWeight: 400,
            color: C.fg2,
            marginTop: 44,
            opacity: ln,
            transform: `translateY(${mix(12, 0, ln)}px)`,
            letterSpacing: "0.04em",
            marginRight: "-0.04em",
          }}
        >
          文档和代码，<span style={{ color: C.fg }}>一直对得上</span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ fontFamily: F.cn, fontSize: 24, color: C.fg3, letterSpacing: "0.12em", opacity: seg(f, CMD, CMD + 14) }}>
          给用 Agent 做项目的人
        </span>
      </div>
    </AbsoluteFill>
  );
};
