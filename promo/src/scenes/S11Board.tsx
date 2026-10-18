import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F } from "../theme";
import { seg, lin, mix, EV, rel } from "../util";
import { Header, Mono, Panel } from "../components";

const DRAIN = rel("s13", EV.s13Drain);
const TAKE = rel("s13", EV.s13Takeover);
const CHIPS = EV.s13Chips.map((x) => rel("s13", x));
const HOSTS = ["Codex", "Claude", "VSPi", "Kimi Code", "OpenCode", "ZCode", "DSH"];

const Row: React.FC<{ k: string; v: React.ReactNode; hi?: number }> = ({ k, v, hi = 0 }) => (
  <div style={{ display: "flex", height: 46, alignItems: "baseline", fontSize: 24 }}>
    <span style={{ width: 120, fontFamily: F.cn, color: C.fg3 }}>{k}</span>
    <span
      style={{
        fontFamily: F.cn,
        color: C.fg,
        background: hi > 0 ? `rgba(127,227,184,${0.16 * hi})` : undefined,
        padding: "2px 8px",
        margin: "-2px -8px",
        borderRadius: 4,
      }}
    >
      {v}
    </span>
  </div>
);

const Agent: React.FC<{
  x: number;
  name: string;
  quota: number;
  state: string;
  stateCol: string;
  op: number;
}> = ({ x, name, quota, state, stateCol, op }) => (
  <div style={{ position: "absolute", left: x, top: 470, width: 360, opacity: op }}>
    <Mono style={{ fontSize: 26, color: C.fg }}>{name}</Mono>
    <div style={{ height: 4, background: C.fg4, marginTop: 18, borderRadius: 2 }}>
      <div
        style={{
          height: 4,
          width: `${quota * 100}%`,
          background: quota < 0.05 ? C.red : C.fg2,
          borderRadius: 2,
        }}
      />
    </div>
    <Mono style={{ display: "block", marginTop: 14, fontSize: 19, color: stateCol }}>{state}</Mono>
  </div>
);

export const S11: React.FC = () => {
  const f = useCurrentFrame();
  const q1 = 1 - lin(f, DRAIN - 20, DRAIN + 6) * 0.99;
  const drained = f >= DRAIN + 6;
  const read = seg(f, TAKE, TAKE + 16);
  const hi = seg(f, TAKE + 14, TAKE + 24);
  const b2 = rel("s13", EV.s13Chips[0]) - 14;
  const phase2 = seg(f, b2, b2 + 16);
  return (
    <AbsoluteFill style={{ opacity: 1 - lin(f, 213, 225) }}>
      <Header
        f={f}
        at={2}
        out={b2}
        idx="05"
        usual="断了就写一大堆交接总结"
        title="BOARD 本来就是交接"
        sub="每个 Agent 随手更新自己那一道。断了，下一个读完接着干。"
      />
      <div style={{ opacity: 1 - phase2 }}>
        <Agent
          x={160}
          name="Codex GPT"
          quota={q1}
          state={drained ? "额度用完" : "在做：同步冲突修复"}
          stateCol={drained ? C.red : C.fg3}
          op={seg(f, 6, 20) * (1 - lin(f, TAKE - 12, TAKE - 2))}
        />
        <Agent
          x={160}
          name="Claude Opus"
          quota={1}
          state={read > 0.5 ? "读 BOARD → 接着干" : "待命"}
          stateCol={read > 0.5 ? C.mint : C.fg3}
          op={seg(f, TAKE - 2, TAKE + 10)}
        />
        <Panel
          x={620}
          y={400}
          w={1140}
          h={450}
          label="BOARD.md"
          right={<span>更新：10-18 21:40</span>}
          style={{
            opacity: seg(f, 8, 22),
            borderColor: read > 0 ? `rgba(127,227,184,${0.15 + 0.3 * read})` : C.line,
          }}
        >
          <div style={{ fontFamily: F.cn, fontSize: 28, color: C.fg, fontWeight: 600, marginBottom: 18 }}>
            ### Codex GPT · 后端
          </div>
          <Row k="在做" v="同步冲突修复" />
          <Row k="做到哪" v="服务端按字段合并完成；前端重试写了一半" />
          <Row k="下一步" v={<>补 <Mono>web/src/sync.js</Mono> 重试，跑 <Mono>test_sync.py</Mono></>} hi={hi} />
          <Row k="未提交" v={<Mono>web/src/sync.js、plan_sync.py</Mono>} />
          <div style={{ height: 1, background: C.line, margin: "18px 0 16px" }} />
          <div style={{ fontFamily: F.cn, fontSize: 22, color: C.fg2 }}>
            <Mono style={{ color: C.fg3 }}>[21:40 Codex → Claude]</Mono> 同步规则改了，请更新 docs/需求/同步.md
          </div>
        </Panel>
      </div>

      {f >= b2 && (
        <AbsoluteFill style={{ opacity: phase2 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center" }}>
            <Mono style={{ fontSize: 44, color: C.fg }}>
              <span style={{ color: C.mint }}>❯</span> hw handoff
            </Mono>
            <div style={{ fontFamily: F.cn, fontSize: 30, color: C.fg2, marginTop: 22 }}>
              BOARD 没写清？从七个宿主里，把最近的会话找回来。
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 560,
              display: "flex",
              justifyContent: "center",
              gap: 22,
            }}
          >
            {HOSTS.map((h, i) => {
              const p = seg(f, CHIPS[i], CHIPS[i] + 14);
              const found = seg(f, CHIPS[i] + 8, CHIPS[i] + 16);
              return (
                <div
                  key={h}
                  style={{
                    padding: "18px 26px",
                    border: `1px solid ${found > 0.5 ? "rgba(127,227,184,0.5)" : C.line}`,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    opacity: p,
                    transform: `translateY(${mix(16, 0, p)}px)`,
                    textAlign: "center",
                    minWidth: 150,
                  }}
                >
                  <div style={{ fontFamily: F.en, fontSize: 28, color: C.fg, fontWeight: 500 }}>{h}</div>
                  <Mono style={{ display: "block", fontSize: 16, color: C.mint, marginTop: 8, opacity: found }}>
                    ● session found
                  </Mono>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
