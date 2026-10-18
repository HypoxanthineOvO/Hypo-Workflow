import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F } from "../theme";
import { seg, segIO, lin, mix, EV, rel } from "../util";
import { Caption, Header, Mono } from "../components";

/* ---------------------------------------------------------------- 01 one map */
const CARDS = [
  { file: "AGENTS.md", who: "所有 Agent", what: "通用的干活方式" },
  { file: "RULES.md", who: "这个项目", what: "东西放哪、谁负责什么" },
  { file: "STATUS.md", who: "你和 Agent", what: "走到哪、下一步、卡在哪" },
  { file: "BOARD.md", who: "正在干活的 Agent", what: "此刻在做什么、留言" },
];
const CW = 360;
const GAP = 40;
const X0 = (1920 - (CW * 4 + GAP * 3)) / 2;
const CY = 440;

export const MapScene: React.FC = () => {
  const f = useCurrentFrame();
  const at = EV.s9Cards.map((x) => rel("s9", x));
  const split = segIO(f, at[0] - 14, at[0] + 4);
  return (
    <AbsoluteFill style={{ opacity: 1 - lin(f, 213, 225) }}>
      <Header f={f} at={2} out={400} idx="01" usual="出一次错加一条，写成一本手册" title="一张地图，四个文件" sub="每个文件只有一类读者，只写给它的那一类。" />
      {/* the manual, collapsing */}
      <div
        style={{
          position: "absolute",
          left: 760,
          top: CY - 40,
          width: 400,
          height: 420,
          opacity: seg(f, 24, 36) * (1 - split),
          transform: `scaleY(${mix(1, 0.3, split)})`,
          transformOrigin: "50% 30%",
          border: `1px solid ${C.line}`,
          borderRadius: 14,
          background: "rgba(255,255,255,0.025)",
          padding: "22px 26px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <Mono style={{ fontSize: 18, color: C.fg3 }}>AGENTS.md · 1,200 行</Mono>
        {Array.from({ length: 26 }).map((_, i) => (
          <div
            key={i}
            style={{ height: 6, marginTop: 7, width: `${40 + ((i * 37) % 55)}%`, background: C.fg4, borderRadius: 2 }}
          />
        ))}
      </div>
      {CARDS.map((c, i) => {
        const p = seg(f, at[i], at[i] + 20);
        const x = X0 + i * (CW + GAP);
        return (
          <div
            key={c.file}
            style={{
              position: "absolute",
              left: mix(960 - CW / 2, x, p),
              top: CY,
              width: CW,
              height: 300,
              borderRadius: 16,
              border: `1px solid ${C.lineHi}`,
              background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.012))",
              opacity: p,
              padding: "34px 32px",
              boxSizing: "border-box",
            }}
          >
            <Mono style={{ fontSize: 34, color: C.fg, fontWeight: 600 }}>{c.file}</Mono>
            <div style={{ height: 1, background: C.line, margin: "28px 0 24px" }} />
            <Mono style={{ fontSize: 17, color: C.fg3, letterSpacing: "0.1em" }}>给谁看</Mono>
            <div style={{ fontFamily: F.cn, fontSize: 32, color: C.mint, marginTop: 8, fontWeight: 500 }}>{c.who}</div>
            <div style={{ fontFamily: F.cn, fontSize: 25, color: C.fg2, marginTop: 18 }}>{c.what}</div>
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
          fontSize: 28,
          color: C.fg2,
          opacity: seg(f, at[3] + 30, at[3] + 46),
        }}
      >
        <Mono style={{ color: C.fg }}>README.md</Mono> 只留给项目的用户。
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- 02 rules where you stand */
const LH = 56;
const TREE: { t: string; d: number; dir?: boolean }[] = [
  { t: "project/", d: 0, dir: true },
  { t: "AGENTS.md", d: 1 },
  { t: "RULES.md", d: 1 },
  { t: "STATUS.md", d: 1 },
  { t: "BOARD.md", d: 1 },
  { t: "docs/", d: 1, dir: true },
  { t: "需求/", d: 2, dir: true },
  { t: "AGENTS.md", d: 3 },
  { t: "同步.md", d: 3 },
  { t: "运维/", d: 2, dir: true },
  { t: "AGENTS.md", d: 3 },
  { t: "部署.md", d: 3 },
  { t: "web/src/sync.js", d: 1 },
];
const STOPS = [
  { i: 1, note: "通用规则 · 所有项目同一份" },
  { i: 2, note: "这个项目：地图、分工、怎么测试" },
  { i: 7, note: "需求文件只用七个固定小标题" },
  { i: 10, note: "只写现在怎么部署、怎么排障" },
];

export const Nearby: React.FC = () => {
  const f = useCurrentFrame();
  const reads = EV.s10Reads.map((x) => rel("s10", x));
  // agent position along the stops, eased between arrivals
  let pos = STOPS[0].i;
  for (let k = 0; k < STOPS.length; k++) {
    if (k === 0) pos = mix(0, STOPS[0].i, segIO(f, reads[0] - 20, reads[0]));
    else if (f >= reads[k] - 22) pos = mix(STOPS[k - 1].i, STOPS[k].i, segIO(f, reads[k] - 22, reads[k]));
  }
  const camY = -pos * LH * 0.85;
  const zoom = mix(1, 1.18, segIO(f, reads[1], reads[2]));
  const dot = seg(f, 20, 32);
  return (
    <AbsoluteFill style={{ opacity: 1 - lin(f, 213, 225) }}>
      <Header
        f={f}
        at={2}
        out={400}
        idx="02"
        usual="写成 skill 天天调用 / 塞进一份长 AGENTS.md"
        title="规矩放在用得到的地方"
        sub="通用一份，项目一份，分区规则就放在那个目录里。"
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 340,
          height: 600,
          overflow: "hidden",
          maskImage: "linear-gradient(180deg, transparent 0, black 14%, black 80%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0, black 14%, black 80%, transparent 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 420,
            top: 230,
            transform: `translateY(${camY}px) scale(${zoom})`,
            transformOrigin: `0px ${pos * LH}px`,
          }}
        >
          {TREE.map((n, i) => {
            const stopK = STOPS.findIndex((s) => s.i === i);
            const visited = stopK >= 0 && f >= reads[stopK];
            const here = stopK >= 0 && Math.abs(pos - i) < 0.2;
            const cardP = stopK >= 0 ? seg(f, reads[stopK], reads[stopK] + 14) : 0;
            return (
              <div key={i} style={{ position: "absolute", top: i * LH, left: n.d * 44, height: LH, display: "flex", alignItems: "center" }}>
                <Mono
                  style={{
                    fontSize: 28,
                    color: here ? C.mint : visited ? C.fg : n.dir ? C.fg2 : C.fg3,
                    whiteSpace: "nowrap",
                  }}
                >
                  {n.t}
                </Mono>
                {stopK >= 0 && (
                  <div
                    style={{
                      marginLeft: 36,
                      opacity: cardP * (here ? 1 : 0.55),
                      transform: `translateX(${mix(-12, 0, cardP)}px)`,
                      fontFamily: F.cn,
                      fontSize: 25,
                      color: C.fg,
                      whiteSpace: "nowrap",
                      borderLeft: `2px solid ${here ? C.mint : C.fg4}`,
                      paddingLeft: 18,
                    }}
                  >
                    <Mono style={{ fontSize: 18, color: C.mint, marginRight: 14 }}>读</Mono>
                    {STOPS[stopK].note}
                  </div>
                )}
              </div>
            );
          })}
          {/* the agent */}
          <div
            style={{
              position: "absolute",
              left: -54,
              top: pos * LH + LH / 2 - 8,
              width: 16,
              height: 16,
              borderRadius: 99,
              background: C.mint,
              boxShadow: "0 0 24px rgba(127,227,184,0.7)",
              opacity: dot,
            }}
          />
          <Mono
            style={{
              position: "absolute",
              left: -150,
              top: pos * LH + LH / 2 - 12,
              fontSize: 18,
              color: C.mint,
              opacity: dot,
            }}
          >
            Agent
          </Mono>
        </div>
      </div>
      <Caption f={f} at={reads[2] + 6} out={225} bottom={70} main="走到哪，读到哪。" />
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- 03 write only now */
const STRAYS = [
  { t: "report-final.md", x: 260, y: 420 },
  { t: "REPORT_v2.md", x: 1380, y: 400 },
  { t: "notes-1017.md", x: 380, y: 760 },
  { t: "summary_new_FINAL.md", x: 1240, y: 800 },
  { t: "最终总结（改）.md", x: 820, y: 900 },
];
const OLD = [
  "10-09 最新：前台 5 秒检查，后台 30 秒",
  "10-11 补充（覆盖上条）：冲突时整页重试",
  "10-12 更正：上条作废，恢复整页快照",
  "10-13 最新裁决：同步改为逐操作",
  "10-14 最新（覆盖上条…）：后台约 15 秒",
];
const OLH = 52;

export const NowScene: React.FC = () => {
  const f = useCurrentFrame();
  const fold = rel("s11", EV.s11Fold);
  const fp = segIO(f, fold, fold + 18);
  const now = seg(f, fold + 12, fold + 30);
  const git = seg(f, fold + 32, fold + 46);
  const card = seg(f, 56, 72);
  return (
    <AbsoluteFill style={{ opacity: 1 - lin(f, 213, 225) }}>
      <Header
        f={f}
        at={2}
        out={400}
        idx="03"
        usual="按日期另起一份，最新裁决接着往下写"
        title="只写现在"
        sub="地图规定东西放哪。推翻了就改写那一条，历史交给 git。"
      />
      {STRAYS.map((s, i) => {
        const p = segIO(f, 30 + i * 3, 62 + i * 3);
        return (
          <Mono
            key={s.t}
            style={{
              position: "absolute",
              left: mix(s.x, 520, p),
              top: mix(s.y, 470, p),
              fontSize: 24,
              color: C.fg2,
              opacity: seg(f, 6 + i * 3, 18 + i * 3) * (1 - lin(f, 54 + i * 3, 64 + i * 3)),
              transform: `scale(${mix(1, 0.6, p)})`,
              whiteSpace: "nowrap",
            }}
          >
            {s.t}
          </Mono>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 440,
          top: 400,
          width: 1040,
          height: 470,
          border: `1px solid ${C.lineHi}`,
          borderRadius: 14,
          background: "rgba(255,255,255,0.03)",
          padding: "26px 40px",
          boxSizing: "border-box",
          opacity: card,
          transform: `scale(${mix(0.97, 1, card)})`,
        }}
      >
        <Mono style={{ fontSize: 22, color: C.fg3 }}>
          docs/需求/<span style={{ color: C.fg }}>同步.md</span>
          <span style={{ color: C.fg4 }}>　·　产品现在的样子，一个功能一个文件</span>
        </Mono>
        <div style={{ fontFamily: F.mono, fontSize: 30, color: C.fg, fontWeight: 600, marginTop: 30 }}>## 规则</div>
        <div style={{ position: "relative", marginTop: 14, height: OLD.length * OLH }}>
          {OLD.map((t, i) => {
            const p = seg(f, 72 + i * 7, 86 + i * 7);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: mix(i * OLH, 0, fp),
                  fontFamily: F.cn,
                  fontSize: 27,
                  lineHeight: `${OLH}px`,
                  color: C.fg2,
                  opacity: p * (1 - fp) * (i === OLD.length - 1 ? 1 : 0.7),
                  whiteSpace: "nowrap",
                  filter: fp > 0 ? `blur(${fp * 6}px)` : undefined,
                }}
              >
                <Mono style={{ color: C.fg4, marginRight: 18, fontSize: 24 }}>2026-</Mono>
                {t}
              </div>
            );
          })}
          <div
            style={{
              position: "absolute",
              top: 0,
              fontFamily: F.cn,
              fontSize: 31,
              lineHeight: `${OLH}px`,
              color: C.fg,
              opacity: now,
              transform: `translateY(${mix(10, 0, now)}px)`,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: C.mint, marginRight: 16 }}>—</span>
            逐操作同步；冲突时只挂起相关操作。
          </div>
          <Mono style={{ position: "absolute", top: OLH + 30, left: 46, fontSize: 21, color: C.fg3, opacity: git }}>
            <span style={{ color: C.mint }}>git log</span> -- docs/需求/同步.md{"   "}
            <span style={{ color: C.fg4 }}>以前的版本都在这里</span>
          </Mono>
        </div>
      </div>
    </AbsoluteFill>
  );
};
