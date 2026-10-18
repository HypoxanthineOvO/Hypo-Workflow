import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F } from "../theme";
import { seg, segIO, lin, mix, EV, rel, rand } from "../util";
import { Header, Mono } from "../components";

const CARDS = [
  { file: "AGENTS.md", who: "所有 Agent", what: "通用的干活方式" },
  { file: "RULES.md", who: "本项目", what: "东西放哪、谁负责什么" },
  { file: "STATUS.md", who: "用户和 Agent", what: "走到哪、下一步、卡在哪" },
  { file: "BOARD.md", who: "正在干活的 Agent", what: "此刻在做什么、留言" },
];
const AT = EV.s6Cards.map((x) => rel("s6", x));
const CW = 360;
const GAP = 40;
const X0 = (1920 - (CW * 4 + GAP * 3)) / 2;
const CY = 470;

const JUNK = [
  "PLAN.md", "PROGRESS.md", "EXECUTION.md", "manifest.yaml", "DISCUSSION-SUMMARY.md",
  "handoff.md", "NOTES-1014.md", "report-0612.md", "CLAUDE.md", "gate.json",
  "M4-review.md", "cycle-12/", "交接-最终版.md", "state.yaml", "SESSION-SUMMARY.md",
  "audit-0602.md", "log.yaml", "C27/PLAN.md", "hash.lock", "TODO-old.md",
];

export const S6: React.FC = () => {
  const f = useCurrentFrame();
  const out = 1 - lin(f, 214, 225);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Header
        f={f}
        at={4}
        out={300}
        idx="01"
        title="一张地图"
        sub="项目收拢成四个文件。每个文件，只有一类读者。"
      />
      {/* scattered junk converging into card slots */}
      {JUNK.map((j, i) => {
        const slot = i % 4;
        const sx = 200 + rand(i * 7.3) * 1450;
        const sy = 330 + rand(i * 2.9) * 560;
        const tx = X0 + slot * (CW + GAP) + CW / 2 - 60;
        const ty = CY + 110;
        const p = segIO(f, 22 + (i % 5) * 2, 52 + (i % 5) * 2);
        const vis = seg(f, 4 + i, 16 + i) * (1 - lin(f, 48 + (i % 5) * 2, 58 + (i % 5) * 2));
        return (
          <Mono
            key={i}
            style={{
              position: "absolute",
              left: mix(sx, tx, p),
              top: mix(sy, ty, p),
              fontSize: 20,
              color: C.fg3,
              opacity: vis * 0.85,
              whiteSpace: "nowrap",
              transform: `scale(${mix(1, 0.5, p)})`,
            }}
          >
            {j}
          </Mono>
        );
      })}

      {CARDS.map((c, i) => {
        const p = seg(f, AT[i], AT[i] + 20);
        const x = X0 + i * (CW + GAP);
        return (
          <div
            key={c.file}
            style={{
              position: "absolute",
              left: x,
              top: CY,
              width: CW,
              height: 300,
              borderRadius: 16,
              border: `1px solid ${p > 0.2 ? C.lineHi : C.line}`,
              background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.012))",
              opacity: p,
              transform: `translateY(${mix(26, 0, p)}px) scale(${mix(0.97, 1, p)})`,
              padding: "34px 32px",
              boxSizing: "border-box",
            }}
          >
            <Mono style={{ fontSize: 34, color: C.fg, fontWeight: 600 }}>{c.file}</Mono>
            <div style={{ height: 1, background: C.line, margin: "28px 0 24px" }} />
            <div style={{ fontFamily: F.mono, fontSize: 17, color: C.fg3, letterSpacing: "0.1em" }}>
              READER
            </div>
            <div style={{ fontFamily: F.cn, fontSize: 30, color: C.mint, marginTop: 8, fontWeight: 500 }}>
              {c.who}
            </div>
            <div style={{ fontFamily: F.cn, fontSize: 24, color: C.fg2, marginTop: 18 }}>{c.what}</div>
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: CY + 360,
          textAlign: "center",
          fontFamily: F.cn,
          fontSize: 26,
          color: C.fg3,
          opacity: seg(f, AT[3] + 26, AT[3] + 44),
        }}
      >
        <Mono style={{ color: C.fg2 }}>README.md</Mono> 只给项目的用户看
      </div>
    </AbsoluteFill>
  );
};
