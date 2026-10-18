import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F } from "../theme";
import { seg, lin, mix, rand } from "../util";
import { Reveal } from "../components";

const NAMES = [
  "PLAN.md", "PROGRESS.md", "EXECUTION.md", "manifest.yaml", "state.yaml",
  "DISCUSSION-SUMMARY.md", "milestone-03.md", "cycle-12/report.md", "hash.lock",
  "gate.json", "audit-2026-06-02.md", "log.yaml", "M4-review.md", "C27/PLAN.md",
];

const path = (i: number) => {
  const repo = ["hypo-works", "cryo", "vsp-gpu-sim", "notes", "class", "dsh", "site", "lab"][
    Math.floor(rand(i) * 8)
  ];
  return `${repo}/.pipeline/${NAMES[Math.floor(rand(i + 0.5) * NAMES.length)]}`;
};

const COLS = 6;
const ROWS = 34;

export const S1: React.FC = () => {
  const f = useCurrentFrame();
  const p = lin(f, 18, 110);
  const eased = 1 - Math.pow(1 - p, 3.2);
  const n = Math.round(19523 * eased);
  const out = 1 - lin(f, 208, 225);

  return (
    <AbsoluteFill style={{ opacity: out }}>
      {/* the wall of files */}
      <AbsoluteFill
        style={{
          opacity: 0.1 + 0.18 * seg(f, 0, 90),
          maskImage:
            "radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, transparent 35%, black 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, transparent 35%, black 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            top: -40 - f * 0.9,
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            rowGap: 8,
            fontFamily: F.mono,
            fontSize: 15,
            color: C.fg2,
            whiteSpace: "nowrap",
          }}
        >
          {Array.from({ length: COLS * ROWS }).map((_, i) => (
            <div key={i} style={{ opacity: rand(i * 3.1) < 0.12 ? 0.25 : 1 }}>
              {path(i)}
            </div>
          ))}
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", transform: `translateY(${mix(10, -30, seg(f, 110, 160))}px)` }}>
          <div
            style={{
              fontFamily: F.en,
              fontWeight: 200,
              fontSize: 260,
              letterSpacing: "-0.04em",
              color: C.fg,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              opacity: seg(f, 10, 30),
            }}
          >
            {n.toLocaleString("en-US")}
          </div>
          <Reveal f={f} at={58}>
            <div style={{ fontFamily: F.cn, fontSize: 40, color: C.fg2, marginTop: 30, fontWeight: 400 }}>
              个 <span style={{ fontFamily: F.mono, color: C.fg }}>.pipeline</span> 文件，散在 179 个仓库里。
            </div>
          </Reveal>
          <Reveal f={f} at={132}>
            <div style={{ fontFamily: F.cn, fontSize: 40, color: C.fg, marginTop: 22, fontWeight: 500 }}>
              没人读。
            </div>
          </Reveal>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
