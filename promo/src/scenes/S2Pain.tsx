import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F } from "../theme";
import { seg, lin, mix, EV, rel } from "../util";
import { Reveal, Mono } from "../components";

const [c1, c2, c3] = EV.s2Cuts.map((x) => rel("s2", x));
const brk = rel("s2", EV.s2Break);

const Caption: React.FC<{ f: number; at: number; out: number; children: React.ReactNode }> = ({
  f,
  at,
  out,
  children,
}) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, textAlign: "center" }}>
    <Reveal f={f} at={at} out={out} y={12}>
      <div style={{ fontFamily: F.cn, fontSize: 46, fontWeight: 500, color: C.fg }}>{children}</div>
    </Reveal>
  </div>
);

const APPENDS = [
  "2026-10-04 最新（覆盖上条…）",
  "2026-10-05 最新（覆盖上条…）",
  "2026-10-06 追加（与 10-03 冲突时以此为准）",
  "2026-10-07 最新：恢复 localStorage 快照",
  "2026-10-08 补充：同上，但不含详情卡",
  "2026-10-09 最新（覆盖上条…）：保留草稿",
  "2026-10-10 追加：后台检查改为 30 秒",
  "2026-10-11 最新（覆盖 10-09）：前台 5 秒检查",
  "2026-10-12 更正：上条作废，见 10-11",
  "2026-10-12 补充（以本条为准）：冲突时整页重试",
  "2026-10-13 最新裁决：同步恢复整页快照",
  "2026-10-14 最新（覆盖上条…）：同步改为逐操作",
];

/** beat 1: append-only rules */
const Appends: React.FC<{ f: number }> = ({ f }) => {
  const shown = Math.min(APPENDS.length, Math.floor(lin(f, 4, 60) * APPENDS.length) + 1);
  const lines = Math.round(mix(0, 166, lin(f, 4, 54)));
  return (
    <AbsoluteFill style={{ opacity: 1 - lin(f, c1 - 6, c1) }}>
      <div style={{ position: "absolute", left: 420, top: 150, width: 1080 }}>
        <Mono style={{ fontSize: 20, color: C.fg3, display: "flex", justifyContent: "space-between" }}>
          <span>AGENTS.md</span>
          <span style={{ color: C.fg2, fontVariantNumeric: "tabular-nums" }}>{lines} 行 · 只追加</span>
        </Mono>
        <div style={{ height: 1, background: C.line, margin: "16px 0 10px" }} />
        <div style={{ height: 600, overflow: "hidden", position: "relative" }}>
          {APPENDS.slice(0, shown).map((t, i) => {
            const age = shown - 1 - i;
            return (
              <div
                key={i}
                style={{
                  fontFamily: F.mono,
                  fontSize: 25,
                  lineHeight: "46px",
                  color: age === 0 ? C.fg : C.fg2,
                  opacity: Math.max(0.12, 1 - age * 0.09),
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: C.fg4, marginRight: 22 }}>+</span>
                {t}
              </div>
            );
          })}
        </div>
      </div>
      <Caption f={f} at={22} out={c1}>规则只追加，没人知道哪条还算数。</Caption>
    </AbsoluteFill>
  );
};

/** beat 2: fake done */
const FakeDone: React.FC<{ f: number }> = ({ f }) => {
  const g = f - c1;
  const open = seg(g, 30, 44);
  return (
    <AbsoluteFill style={{ opacity: Math.min(lin(g, 0, 6), 1 - lin(g, 69, 75)) }}>
      <div style={{ position: "absolute", left: 300, top: 300, width: 600 }}>
        <Reveal f={g} at={4}>
          <Mono style={{ fontSize: 20, color: C.fg3 }}>agent</Mono>
          <div
            style={{
              marginTop: 14,
              padding: "22px 28px",
              border: `1px solid ${C.line}`,
              borderRadius: 14,
              fontFamily: F.cn,
              fontSize: 34,
              color: C.fg,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            做完了 <span style={{ color: C.mint }}>✓</span>
            <div style={{ fontFamily: F.mono, fontSize: 19, color: C.fg3, marginTop: 10 }}>
              42 passed · build ok
            </div>
          </div>
        </Reveal>
      </div>
      <div
        style={{
          position: "absolute",
          left: 1000,
          top: 230,
          width: 620,
          height: 400,
          border: `1px solid ${C.line}`,
          borderRadius: 14,
          background: "rgba(255,255,255,0.02)",
          opacity: open,
          transform: `scale(${mix(0.96, 1, open)})`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 46,
            borderBottom: `1px solid ${C.line}`,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            fontFamily: F.mono,
            fontSize: 17,
            color: C.fg3,
          }}
        >
          localhost:5173/sync
        </div>
        <div
          style={{
            height: 354,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      </div>
      <Caption f={g} at={34} out={75}>Agent 说“做完了”。打开页面，什么都没有。</Caption>
    </AbsoluteFill>
  );
};

/** beat 3: fix A, break B */
const AB: React.FC<{ f: number }> = ({ f }) => {
  const g = f - c2;
  const b = brk - c2;
  const fixA = seg(g, 14, 26);
  const breakB = seg(g, b, b + 6);
  const pulse = lin(g, b, b + 18);
  const Node = (label: string, x: number, col: string, ring: number) => (
    <div
      style={{
        position: "absolute",
        left: x - 90,
        top: 380,
        width: 180,
        height: 180,
        borderRadius: 999,
        border: `1.5px solid ${col}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: F.en,
        fontWeight: 300,
        fontSize: 84,
        color: col,
        boxShadow: ring > 0 ? `0 0 ${60 * ring}px ${col}55` : undefined,
      }}
    >
      {label}
    </div>
  );
  const colA = fixA > 0.5 ? C.mint : C.fg2;
  const colB = breakB > 0.5 ? C.red : C.fg2;
  return (
    <AbsoluteFill style={{ opacity: Math.min(lin(g, 0, 6), 1 - lin(g, 69, 75)) }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <line
          x1={790}
          y1={470}
          x2={790 + 340 * seg(g, 2, 16)}
          y2={470}
          stroke={breakB > 0.5 ? C.red : C.lineHi}
          strokeWidth={1.5}
          strokeDasharray="6 8"
        />
        {pulse > 0 && pulse < 1 && (
          <circle cx={1220} cy={470} r={90 + 120 * pulse} fill="none" stroke={C.red} strokeOpacity={1 - pulse} />
        )}
      </svg>
      {Node("A", 700, colA, fixA * (1 - breakB))}
      {Node("B", 1220, colB, breakB)}
      <Mono
        style={{
          position: "absolute",
          left: 610,
          top: 590,
          width: 180,
          textAlign: "center",
          fontSize: 19,
          color: C.mint,
          opacity: fixA,
        }}
      >
        fixed
      </Mono>
      <Mono
        style={{
          position: "absolute",
          left: 1130,
          top: 590,
          width: 180,
          textAlign: "center",
          fontSize: 19,
          color: C.red,
          opacity: breakB,
        }}
      >
        broken
      </Mono>
      <Caption f={g} at={8} out={75}>改了 A，坏了 B。</Caption>
    </AbsoluteFill>
  );
};

const SCATTER = [
  { t: "handoff.md", x: 300, y: 250, r: -4 },
  { t: "交接-最终版.md", x: 1240, y: 210, r: 3 },
  { t: "NOTES-1014.md", x: 560, y: 470, r: 2 },
  { t: "handoff-v2-final.md", x: 1100, y: 430, r: -2 },
  { t: "docs/交接说明(新).md", x: 260, y: 640, r: 1 },
  { t: "SESSION-SUMMARY.md", x: 1280, y: 650, r: -3 },
  { t: ".pipeline/handoff/C27.md", x: 760, y: 300, r: -1 },
];

/** beat 4: scattered handoffs */
const Scattered: React.FC<{ f: number }> = ({ f }) => {
  const g = f - c3;
  const quota = lin(g, 2, 26);
  return (
    <AbsoluteFill style={{ opacity: Math.min(lin(g, 0, 6), 1 - lin(g, 66, 75)) }}>
      <div style={{ position: "absolute", left: 760, top: 160, width: 400 }}>
        <Mono style={{ fontSize: 18, color: C.fg3, display: "flex", justifyContent: "space-between" }}>
          <span>quota</span>
          <span style={{ color: quota > 0.95 ? C.red : C.fg2 }}>{Math.round((1 - quota) * 100)}%</span>
        </Mono>
        <div style={{ height: 4, background: C.fg4, marginTop: 10, borderRadius: 2 }}>
          <div
            style={{
              height: 4,
              width: `${(1 - quota) * 100}%`,
              background: quota > 0.95 ? C.red : C.fg2,
              borderRadius: 2,
            }}
          />
        </div>
      </div>
      {SCATTER.map((s, i) => {
        const p = seg(g, 18 + i * 3, 34 + i * 3);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x,
              top: s.y + 40,
              transform: `rotate(${s.r}deg) translateY(${mix(20, 0, p)}px)`,
              opacity: p * 0.9,
              padding: "14px 20px",
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              fontFamily: F.mono,
              fontSize: 21,
              color: C.fg2,
            }}
          >
            {s.t}
          </div>
        );
      })}
      <Caption f={g} at={14} out={75}>额度用完，换个 Agent。交接文档散落各处。</Caption>
    </AbsoluteFill>
  );
};

export const S2: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {f < c1 && <Appends f={f} />}
      {f >= c1 && f < c2 && <FakeDone f={f} />}
      {f >= c2 && f < c3 && <AB f={f} />}
      {f >= c3 && <Scattered f={f} />}
    </AbsoluteFill>
  );
};
