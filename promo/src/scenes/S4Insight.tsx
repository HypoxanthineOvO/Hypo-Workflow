import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F } from "../theme";
import { seg, lin, mix, EV, rel } from "../util";
import { Reveal } from "../components";

const [w1, w2, w3, w4] = EV.s4Words.map((x) => rel("s4", x));

export const S4: React.FC = () => {
  const f = useCurrentFrame();
  const strike = seg(f, w4 - 6, w4 + 10);
  const big: React.CSSProperties = {
    fontFamily: F.cn,
    fontSize: 104,
    letterSpacing: "-0.01em",
    lineHeight: 1.25,
  };
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - lin(f, 215, 225) }}>
      {f < w3 && (
        <div style={{ textAlign: "center", position: "absolute" }}>
          <Reveal f={f} at={w1} dur={20} out={w3} outDur={12}>
            <div style={{ ...big, fontWeight: 300, color: C.fg2 }}>模型变强了，</div>
          </Reveal>
          <Reveal f={f} at={w2} dur={20} out={w3} outDur={12}>
            <div style={{ ...big, fontWeight: 600, color: C.fg }}>约束不该变多。</div>
          </Reveal>
        </div>
      )}
      {f >= w3 && (
        <div style={{ textAlign: "center", position: "absolute" }}>
          <Reveal f={f} at={w3} dur={18}>
            <div style={{ fontFamily: F.cn, fontSize: 44, color: C.fg2, fontWeight: 400 }}>
              每一条约束，都藏着一个假设：
            </div>
          </Reveal>
          <Reveal f={f} at={w3 + 14} dur={20}>
            <div style={{ position: "relative", display: "inline-block", marginTop: 26 }}>
              <div
                style={{
                  ...big,
                  fontWeight: 500,
                  color: strike > 0.5 ? C.fg3 : C.fg,
                }}
              >
                “模型做不到。”
              </div>
              <div
                style={{
                  position: "absolute",
                  left: -10,
                  top: "54%",
                  height: 3,
                  width: `calc(${strike * 100}% + 20px)`,
                  background: C.fg,
                }}
              />
            </div>
          </Reveal>
          <Reveal f={f} at={w4 + 4} dur={18}>
            <div style={{ fontFamily: F.cn, fontSize: 54, color: C.fg, fontWeight: 500, marginTop: 34 }}>
              而这些假设，会过时。
            </div>
          </Reveal>
        </div>
      )}
    </AbsoluteFill>
  );
};

const CHAIN = ["Plan", "Milestone", "Cycle", "gate", "hash", "manifest", "hooks"];

export const S5: React.FC = () => {
  const f = useCurrentFrame();
  const b2 = 72;
  const strike = seg(f, 20, 42);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - lin(f, 140, 150) }}>
      {f < b2 && (
        <div style={{ textAlign: "center", position: "absolute", opacity: 1 - lin(f, b2 - 10, b2) }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{ display: "flex", gap: 22, fontFamily: F.mono, fontSize: 30, color: C.fg3 }}>
              {CHAIN.map((c, i) => (
                <React.Fragment key={c}>
                  {i > 0 && <span style={{ color: C.fg4, opacity: seg(f, i * 2, i * 2 + 10) }}>→</span>}
                  <span style={{ opacity: seg(f, i * 2, i * 2 + 10) * mix(1, 0.4, strike) }}>{c}</span>
                </React.Fragment>
              ))}
            </div>
            <div
              style={{
                position: "absolute",
                left: -12,
                top: "52%",
                height: 2,
                width: `calc(${strike * 100}% + 24px)`,
                background: C.fg2,
              }}
            />
          </div>
          <Reveal f={f} at={26} dur={18}>
            <div style={{ fontFamily: F.cn, fontSize: 84, fontWeight: 600, color: C.fg, marginTop: 56 }}>
              不管过程，只管结果。
            </div>
          </Reveal>
        </div>
      )}
      {f >= b2 && (
        <div style={{ textAlign: "center", position: "absolute" }}>
          <Reveal f={f} at={b2} dur={16}>
            <div style={{ fontFamily: F.cn, fontSize: 40, color: C.fg2 }}>3.0 只做一件事——</div>
          </Reveal>
          <Reveal f={f} at={b2 + 12} dur={20}>
            <div style={{ fontFamily: F.cn, fontSize: 76, fontWeight: 600, color: C.fg, marginTop: 28 }}>
              边用边改，文档和代码<span style={{ color: C.mint }}>一直对得上</span>。
            </div>
          </Reveal>
        </div>
      )}
    </AbsoluteFill>
  );
};
