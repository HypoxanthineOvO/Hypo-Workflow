import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F } from "../theme";
import { seg, segIO, lin, mix, EV, rel, typed } from "../util";
import { Header, Mono, Panel } from "../components";

const T0 = rel("s14", EV.typeStart);
const ENTER = rel("s14", EV.enter);
const HIT = rel("s14", EV.hit);
const FIX = rel("s14", EV.fix);
const RES = rel("s14", EV.resolve);
const RETYPE = RES - 22;

const ED_X = 160;
const ED_W = 660;
const TM_X = 860;
const TM_W = 900;
const PY = 400;
const PH = 540;
const LH = 44;

const codeLine = (n: number, body: React.ReactNode, style?: React.CSSProperties) => (
  <div style={{ display: "flex", height: LH, alignItems: "center", ...style }}>
    <span style={{ width: 44, color: C.fg4, fontSize: 18 }}>{n}</span>
    <span style={{ whiteSpace: "pre" }}>{body}</span>
  </div>
);

const Code: React.FC<{ f: number }> = ({ f }) => {
  const ed = seg(f, 6, 18);
  const hot = f >= HIT;
  const k = { color: "#8FA3BF" };
  const fn = { color: C.fg };
  return (
    <div style={{ fontFamily: F.mono, fontSize: 23, color: C.fg2 }}>
      {codeLine(41, <><span style={k}>export function</span> <span style={fn}>retryQueue</span>(ops) {"{"}</>)}
      {codeLine(
        42,
        <span style={{ textDecoration: ed > 0.5 ? "line-through" : undefined, color: ed > 0.5 ? C.fg4 : C.fg2 }}>
          {"  "}return retryAll(ops);
        </span>,
      )}
      <div
        style={{
          margin: "0 -28px",
          padding: "0 28px",
          background: hot ? "rgba(255,75,62,0.13)" : `rgba(127,227,184,${0.1 * ed})`,
          borderLeft: `3px solid ${hot ? C.red : C.mint}`,
          opacity: ed,
        }}
      >
        {codeLine(43, <span style={{ color: C.fg }}>{"  "}return ops.map(op =&gt; retryOne(op.id));</span>)}
      </div>
      {codeLine(44, "}")}
      {codeLine(45, "")}
      {codeLine(46, <><span style={k}>export function</span> mergeChanges(a, b) {"{"}</>)}
      {codeLine(47, "  …")}
    </div>
  );
};

const Doc: React.FC<{ f: number }> = ({ f }) => {
  const p = seg(f, FIX + 8, FIX + 22);
  return (
    <div style={{ fontFamily: F.mono, fontSize: 23, color: C.fg2 }}>
      {codeLine(3, <span style={{ color: C.fg }}>## 现在</span>)}
      {codeLine(4, "逐操作同步，前台 5 秒检查。")}
      {codeLine(5, <span style={{ color: p > 0.5 ? C.fg4 : C.fg2, textDecoration: p > 0.5 ? "line-through" : undefined }}>冲突时整页重试。</span>)}
      <div
        style={{
          margin: "0 -28px",
          padding: "0 28px",
          background: `rgba(127,227,184,${0.1 * p})`,
          borderLeft: `3px solid ${C.mint}`,
          opacity: p,
        }}
      >
        {codeLine(6, <span style={{ color: C.fg }}>冲突时只重试相关操作。</span>)}
      </div>
      {codeLine(7, "")}
      {codeLine(8, <span style={{ color: C.fg }}>## 代码</span>)}
      {codeLine(9, "web/src/sync.js: retryQueue")}
    </div>
  );
};

export const S10: React.FC = () => {
  const f = useCurrentFrame();
  const flash = f >= HIT ? Math.exp(-(f - HIT) / 7) : 0;
  const shake = f >= HIT && f < HIT + 8 ? Math.sin((f - HIT) * 2.6) * 6 * (1 - (f - HIT) / 8) : 0;
  const red = f >= HIT && f < FIX + 10;
  const swap = segIO(f, FIX, FIX + 10);
  const showDoc = f >= FIX + 5;
  const clear = f >= RETYPE - 2;
  const wire = seg(f, HIT, HIT + 14) * (1 - lin(f, FIX, FIX + 8));
  const ok = seg(f, RES, RES + 12);
  // camera: push in on the alarm line, pull back for the fix
  const push = segIO(f, HIT - 2, HIT + 22) * (1 - segIO(f, FIX - 14, FIX + 6));
  const zoom = mix(1, 1.42, push);
  const zoomX = mix(0, 644, push);
  const zoomY = mix(0, 236, push);

  return (
    <AbsoluteFill style={{ opacity: 1 - lin(f, 214, 225) }}>
      <div style={{ opacity: 1 - push }}>
      <Header
        f={f}
        at={2}
        out={400}
        idx="06"
        usual="靠自觉，或者再加一道审批门"
        title={<Mono style={{ fontWeight: 600 }}>hw check</Mono>}
        sub="改了代码没改文档，机械地查出来。"
      />
      </div>
      <AbsoluteFill
        style={{
          transform: `translateX(${shake}px) scale(${zoom}) translate(${-zoomX}px, ${-zoomY}px)`,
          transformOrigin: "0 0",
        }}
      >
        <Panel
          x={ED_X}
          y={PY}
          w={ED_W}
          h={PH}
          label={showDoc ? "docs/需求/同步.md" : "web/src/sync.js"}
          right={showDoc ? <span style={{ color: C.mint }}>M</span> : <span style={{ color: red ? C.red : C.fg3 }}>M</span>}
          style={{ opacity: seg(f, 4, 16), borderColor: red ? "rgba(255,75,62,0.45)" : C.line }}
        >
          <div style={{ opacity: 1 - swap * (showDoc ? 0 : 1) }}>{showDoc ? <Doc f={f} /> : <Code f={f} />}</div>
        </Panel>

        <Panel
          x={TM_X}
          y={PY}
          w={TM_W}
          h={PH}
          label="zsh — ~/hypo-works"
          style={{
            opacity: seg(f, 10, 22),
            borderColor: red ? "rgba(255,75,62,0.6)" : ok > 0 ? "rgba(127,227,184,0.4)" : C.line,
            boxShadow: red ? `0 0 ${80 * (0.4 + flash)}px rgba(255,75,62,${0.18 + 0.3 * flash})` : undefined,
            background: "rgba(8,9,10,0.9)",
          }}
        >
          <div style={{ fontFamily: F.mono, fontSize: 25, lineHeight: "42px", color: C.fg2 }}>
            {!clear && (
              <>
                <div>
                  <span style={{ color: C.mint }}>❯</span> <span style={{ color: C.fg }}>{typed("hw check", f, T0, 0.45)}</span>
                  {f < ENTER && <span style={{ opacity: Math.floor(f / 8) % 2 ? 0 : 1 }}>▍</span>}
                </div>
                {f >= ENTER + 3 && <div style={{ color: C.fg3 }}>读取地图 · 12 个需求条目 · 1 处未提交改动</div>}
                {f >= HIT - 6 && <div style={{ color: C.fg, marginTop: 14 }}>报警</div>}
                {f >= HIT && (
                  <div style={{ position: "relative", marginTop: 4 }}>
                    <div
                      style={{
                        position: "absolute",
                        left: -28,
                        right: -28,
                        top: -6,
                        bottom: -6,
                        background: `rgba(255,75,62,${0.1 + 0.22 * flash})`,
                        borderLeft: `3px solid ${C.red}`,
                      }}
                    />
                    <div style={{ position: "relative", color: C.red, fontSize: 21 }}>[文档] 工作区 · web/src/sync.js</div>
                    <div
                      style={{
                        position: "relative",
                        color: "#FF6A5E",
                        fontSize: 31,
                        fontWeight: 600,
                        textShadow: `0 0 ${18 + 30 * flash}px rgba(255,75,62,0.55)`,
                      }}
                    >
                      改了 retryQueue，docs/需求/同步.md 没变
                    </div>
                  </div>
                )}
                {f >= HIT + 12 && <div style={{ color: C.fg3, marginTop: 14 }}>共 1 条报警、0 条提示。</div>}
              </>
            )}
            {clear && (
              <>
                <div>
                  <span style={{ color: C.mint }}>❯</span>{" "}
                  <span style={{ color: C.fg }}>{typed("hw check", f, RETYPE, 0.6)}</span>
                </div>
                {f >= RES - 4 && <div style={{ color: C.fg3 }}>读取地图 · 12 个需求条目 · 2 处未提交改动</div>}
                {f >= RES && (
                  <div
                    style={{
                      color: C.mint,
                      fontSize: 31,
                      fontWeight: 600,
                      marginTop: 14,
                      opacity: ok,
                      textShadow: "0 0 24px rgba(127,227,184,0.35)",
                    }}
                  >
                    ✓ 共 0 条报警。
                  </div>
                )}
              </>
            )}
          </div>
        </Panel>

        {/* wire from changed line to alarm */}
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
          <path
            d={`M ${ED_X + ED_W - 6} ${PY + 52 + 22 + LH * 2.5} C ${ED_X + ED_W + 40} ${PY + 160}, ${TM_X - 40} ${PY + 270}, ${TM_X + 6} ${PY + 290}`}
            fill="none"
            stroke={C.red}
            strokeWidth={2}
            strokeDasharray={400}
            strokeDashoffset={400 * (1 - wire)}
            opacity={wire}
          />
        </svg>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 80% 80% at 50% 55%, rgba(255,75,62,0) 40%, rgba(255,75,62,0.35) 100%)",
          opacity: flash * 0.9,
        }}
      />
    </AbsoluteFill>
  );
};
