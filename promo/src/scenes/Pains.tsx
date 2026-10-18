import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F } from "../theme";
import { seg, lin, mix, EV, rel, rand, typed } from "../util";
import { Caption, GptBubble, Mono, PainTag, Reveal } from "../components";

const OUT = 150;
const Fade: React.FC<{ f: number; len?: number; children: React.ReactNode }> = ({ f, len = OUT, children }) => (
  <AbsoluteFill style={{ opacity: Math.min(lin(f, 0, 8), 1 - lin(f, len - 12, len)) }}>{children}</AbsoluteFill>
);

/* ---------------------------------------------------------------- cold open */
export const Open: React.FC = () => {
  const f = useCurrentFrame();
  const prompt = "帮我把同步功能修好。";
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - lin(f, 64, 75) }}>
      <div style={{ textAlign: "center" }}>
        <Mono style={{ fontSize: 34, color: C.fg }}>
          <span style={{ color: C.mint }}>❯ </span>
          {typed(prompt, f, 6, 0.4)}
          <span style={{ opacity: Math.floor(f / 8) % 2 ? 0 : 1, color: C.fg2 }}>▍</span>
        </Mono>
        <Reveal f={f} at={36}>
          <div style={{ fontFamily: F.cn, fontSize: 30, color: C.fg2, marginTop: 40 }}>
            用 Agent 做项目，刚开始都很顺。
          </div>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- 1 rules pile up */
const RULES = [
  "不要 mock 数据。",
  "改完必须跑测试。",
  "跑完测试也不算做完。",
  "不要擅自开工。",
  "说开始了就别再停下来问。",
  "不要写“已核验”。",
  "绝对不要再写“已核验”。",
  "以本条为准，覆盖上一条。",
  "上一条作废。",
  "再强调一遍：不要 mock。",
  "重要！！！先读完全文再动手。",
  "如与第 12 条冲突，以第 31 条为准。",
];

export const P1: React.FC = () => {
  const f = useCurrentFrame();
  const shown = Math.min(RULES.length, Math.floor(lin(f, 4, 80) * RULES.length) + 1);
  const lines = Math.round(mix(12, 340, Math.pow(lin(f, 4, 90), 1.4)));
  const scroll = Math.max(0, shown - 8) * 46;
  return (
    <Fade f={f}>
      <PainTag f={f} n={1} out={OUT} />
      <div style={{ position: "absolute", left: 460, top: 190, width: 1000 }}>
        <Mono style={{ fontSize: 20, color: C.fg3, display: "flex", justifyContent: "space-between" }}>
          <span>AGENTS.md</span>
          <span style={{ color: lines > 200 ? C.red : C.fg2, fontVariantNumeric: "tabular-nums" }}>{lines} 行</span>
        </Mono>
        <div style={{ height: 1, background: C.line, margin: "16px 0 10px" }} />
        <div
          style={{
            height: 368,
            overflow: "hidden",
            position: "relative",
            maskImage: "linear-gradient(180deg, transparent 0, black 18%, black 100%)",
            WebkitMaskImage: "linear-gradient(180deg, transparent 0, black 18%, black 100%)",
          }}
        >
          <div style={{ transform: `translateY(${-scroll}px)` }}>
            {RULES.slice(0, shown).map((t, i) => {
              const age = shown - 1 - i;
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: F.cn,
                    fontSize: 27,
                    height: 46,
                    display: "flex",
                    alignItems: "center",
                    color: age === 0 ? C.fg : C.fg2,
                    opacity: Math.max(0.25, 1 - age * 0.1),
                    whiteSpace: "nowrap",
                  }}
                >
                  <Mono style={{ color: C.fg4, marginRight: 22, fontSize: 22 }}>{String(i + 7).padStart(2, "0")}</Mono>
                  {t}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Caption f={f} at={34} out={OUT} main="出一次错，加一条规则。" sub="规则越写越长，越长越没人遵守。" />
    </Fade>
  );
};

/* ---------------------------------------------------------------- 2 docs everywhere */
const DOCS = [
  { t: "report-final.md", d: "docs/", x: 260, y: 230, r: -3 },
  { t: "REPORT_v2.md", d: "./", x: 1260, y: 205, r: 2 },
  { t: "notes-1017.md", d: "notes/", x: 640, y: 330, r: 1 },
  { t: "summary_new_FINAL.md", d: "tmp/", x: 1080, y: 400, r: -2 },
  { t: "最终总结（改）.md", d: "docs/old/", x: 230, y: 470, r: 2 },
  { t: "PLAN-draft-3.md", d: ".agent/", x: 1400, y: 520, r: -1 },
  { t: "progress.txt", d: "scripts/", x: 760, y: 560, r: -3 },
];

export const P2: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Fade f={f}>
      <PainTag f={f} n={2} out={OUT} />
      {DOCS.map((s, i) => {
        const p = seg(f, 6 + i * 5, 22 + i * 5);
        const drift = Math.sin((f + i * 30) / 40) * 4;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x,
              top: s.y + drift,
              transform: `rotate(${s.r}deg) translateY(${mix(24, 0, p)}px)`,
              opacity: p,
              padding: "16px 22px",
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              background: "rgba(255,255,255,0.035)",
            }}
          >
            <Mono style={{ display: "block", fontSize: 16, color: C.fg3 }}>{s.d}</Mono>
            <Mono style={{ display: "block", fontSize: 25, color: C.fg, marginTop: 6 }}>{s.t}</Mono>
          </div>
        );
      })}
      <Caption f={f} at={40} out={OUT} main="每次产出的文档，命名都不一样。" sub="散在七个目录里，没人说得清哪份是现在。" />
    </Fade>
  );
};

/* ---------------------------------------------------------------- 3 broken session */
export const P3: React.FC = () => {
  const f = useCurrentFrame();
  const cuts = EV.p3Cuts.map((x) => rel("s4", x));
  const dead = f >= cuts[0];
  const reason = ["会话中断", "额度用完", "账号被封"][cuts.filter((c) => f >= c).length - 1] ?? "";
  const glitch = dead && f < cuts[2] + 6 ? (rand(f) - 0.5) * 14 : 0;
  const ctx = dead ? 0 : 1;
  return (
    <Fade f={f}>
      <PainTag f={f} n={3} out={OUT} />
      <div
        style={{
          position: "absolute",
          left: 460,
          top: 200,
          width: 1000,
          height: 380,
          border: `1px solid ${dead ? "rgba(255,75,62,0.45)" : C.line}`,
          borderRadius: 14,
          background: "rgba(255,255,255,0.025)",
          transform: `translateX(${glitch}px)`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 50,
            borderBottom: `1px solid ${C.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            fontFamily: F.mono,
            fontSize: 18,
            color: C.fg3,
          }}
        >
          <span>session · 3h 12m</span>
          <span>context {Math.round(mix(0, 87, ctx))}%</span>
        </div>
        <div style={{ padding: "26px 32px", opacity: ctx, fontFamily: F.cn, fontSize: 25, lineHeight: "44px", color: C.fg2 }}>
          <div>同步冲突的原因找到了：整页重试会覆盖草稿。</div>
          <div>服务端已改成按字段合并，前端重试队列写了一半，</div>
          <div>下一步补 retryQueue，然后跑浏览器测试——</div>
        </div>
        {dead && (
          <div
            style={{
              position: "absolute",
              inset: 50,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Mono style={{ fontSize: 44, color: C.red }}>{reason}</Mono>
            <Mono style={{ fontSize: 20, color: C.fg3, marginTop: 18 }}>上下文已清空</Mono>
          </div>
        )}
      </div>
      <Caption f={f} at={cuts[0] - 4} out={OUT} main="会话中断、额度用完、账号被封——上下文全没了。" sub="换个模型，又得写一大堆总结让它接着做。" />
    </Fade>
  );
};

/* ---------------------------------------------------------------- 4 forgot the docs */
const TREE = [
  { t: "web/src/sync.js", code: true },
  { t: "README.md" },
  { t: "docs/同步.md" },
  { t: "docs/api.md" },
  { t: "docs/old/sync-design.md", buried: true },
];

export const P4: React.FC = () => {
  const f = useCurrentFrame();
  const stale = rel("s5", EV.p4Stale);
  return (
    <Fade f={f}>
      <PainTag f={f} n={4} out={OUT} />
      <div style={{ position: "absolute", left: 600, top: 200, width: 720 }}>
        {TREE.map((n, i) => {
          const p = seg(f, 4 + i * 4, 18 + i * 4);
          const done = n.code ? seg(f, 20, 30) : seg(f, 40 + i * 10, 50 + i * 10);
          const miss = n.buried && f >= stale;
          return (
            <div
              key={n.t}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                height: 64,
                borderBottom: `1px solid ${C.line}`,
                opacity: p * (n.buried ? 0.8 : 1),
                paddingLeft: n.buried ? 40 : 0,
              }}
            >
              <Mono style={{ fontSize: 26, color: miss ? C.red : C.fg }}>{n.t}</Mono>
              {!n.buried && (
                <Mono style={{ fontSize: 20, color: C.mint, opacity: done }}>{n.code ? "已修改" : "已更新"}</Mono>
              )}
              {n.buried && <Mono style={{ fontSize: 20, color: C.red, opacity: seg(f, stale, stale + 8) }}>还是旧的</Mono>}
            </div>
          );
        })}
      </div>
      <Caption f={f} at={60} out={OUT} main="让它顺手维护文档，改完一定会忘。" sub="提醒了也改不全，角落里那份永远漏掉。" />
    </Fade>
  );
};

/* ---------------------------------------------------------------- 5 nowhere for rules */
export const P5: React.FC = () => {
  const f = useCurrentFrame();
  const rightAt = 50;
  return (
    <Fade f={f}>
      <PainTag f={f} n={5} out={OUT} />
      <div style={{ position: "absolute", left: 230, top: 200, width: 680 }}>
        <Reveal f={f} at={6}>
          <Mono style={{ fontSize: 22, color: C.fg3 }}>写成 skill</Mono>
          <div
            style={{
              marginTop: 16,
              padding: "26px 30px",
              border: `1px solid ${C.line}`,
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              fontFamily: F.cn,
              fontSize: 27,
              lineHeight: 1.6,
              color: C.fg,
              height: 270,
              boxSizing: "border-box",
            }}
          >
            只要有 <span style={{ color: C.red, fontWeight: 600 }}>1%</span> 的可能相关，
            <br />就<span style={{ fontWeight: 600 }}>必须</span>先调用 skill。
            <Mono style={{ display: "block", marginTop: 22, fontSize: 19, color: C.fg3 }}>
              ↳ skill 被调用 {Math.round(mix(1, 48, lin(f, 14, 90)))} 次
            </Mono>
          </div>
        </Reveal>
      </div>
      <div style={{ position: "absolute", left: 1010, top: 200, width: 680 }}>
        <Reveal f={f} at={rightAt}>
          <Mono style={{ fontSize: 22, color: C.fg3, display: "flex", justifyContent: "space-between" }}>
            <span>写进 AGENTS.md</span>
          </Mono>
          <div
            style={{
              marginTop: 16,
              border: `1px solid ${C.line}`,
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              height: 270,
              overflow: "hidden",
              padding: "22px 30px",
              boxSizing: "border-box",
              position: "relative",
            }}
          >
            <div style={{ transform: `translateY(${-lin(f, rightAt, OUT) * 520}px)` }}>
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 9,
                    margin: "0 0 13px",
                    width: `${45 + ((i * 41) % 50)}%`,
                    background: i % 9 === 0 ? C.fg3 : C.fg4,
                    borderRadius: 3,
                  }}
                />
              ))}
            </div>
            <Mono
              style={{
                position: "absolute",
                right: 24,
                bottom: 18,
                fontSize: 19,
                color: C.fg2,
                background: "rgba(6,7,8,0.85)",
                padding: "4px 10px",
                borderRadius: 6,
              }}
            >
              {Math.round(mix(80, 1200, lin(f, rightAt, OUT)))} 行
            </Mono>
          </div>
        </Reveal>
      </div>
      <Caption
        f={f}
        at={24}
        out={OUT}
        main="通用的干活规矩，没处放。"
        sub="写成 skill 要天天调用，写进 AGENTS.md 又长得没人看。"
      />
    </Fade>
  );
};

/* ---------------------------------------------------------------- the usual fix: GPT */
export const Usual: React.FC = () => {
  const f = useCurrentFrame();
  const pops = EV.gptPops.map((x) => rel("s7", x));
  const punch = rel("s7", EV.gptPunch);
  const end = 225;
  const dim = (at: number) => mix(1, 0.35, seg(f, at + 54, at + 66));
  return (
    <AbsoluteFill style={{ opacity: 1 - lin(f, end - 12, end) }}>
      <div style={{ position: "absolute", left: 160, top: 110 }}>
        <Reveal f={f} at={2}>
          <div
            style={{
              fontFamily: F.cn,
              fontWeight: 600,
              color: f < pops[0] ? C.fg : C.fg3,
              fontSize: mix(56, 30, seg(f, pops[0] - 8, pops[0] + 4)),
            }}
          >
            常见的解法：再加点规矩。
          </div>
        </Reveal>
      </div>
      <div style={{ opacity: dim(pops[0]) }}>
        <GptBubble f={f} at={pops[0]} x={160} y={200} w={880} rot={-0.6}>
          ✓ 已核验。
          <br />
          <span style={{ color: C.fg2 }}>注：本结论不代表功能可用，不能声称已完成。</span>
        </GptBubble>
      </div>
      <div style={{ opacity: dim(pops[1]) }}>
        <GptBubble f={f} at={pops[1]} x={900} y={420} w={860} rot={0.5}>
          为保险起见，我新增了 Milestone <Mono>M1–M7</Mono>、
          <br />一个 Receipt 和三道审批门。
        </GptBubble>
      </div>
      <GptBubble f={f} at={pops[2]} x={260} y={660} w={940} rot={-0.3}>
        正事还没开始，我先算了个 SHA256：
        <br />
        <Mono style={{ color: C.mint, fontSize: 28 }}>report-a3f9c2e1b7d04f.md</Mono>
      </GptBubble>
      <AbsoluteFill
        style={{
          background: "rgba(6,7,8,0.9)",
          opacity: seg(f, punch, punch + 10),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: F.cn,
            fontSize: 72,
            fontWeight: 600,
            color: C.fg,
            transform: `scale(${mix(1.06, 1, seg(f, punch, punch + 14))})`,
          }}
        >
          规矩越多，越笨重。
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- insight + brand */
export const Insight: React.FC = () => {
  const f = useCurrentFrame();
  const brand = rel("s8", EV.brand);
  const big: React.CSSProperties = { fontFamily: F.cn, fontSize: 104, letterSpacing: "-0.01em", lineHeight: 1.25 };
  const b = seg(f, brand, brand + 26);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - lin(f, 214, 225) }}>
      {f < brand && (
        <div style={{ textAlign: "center", position: "absolute" }}>
          <Reveal f={f} at={6} dur={20} out={brand} outDur={12}>
            <div style={{ ...big, fontWeight: 300, color: C.fg2 }}>模型已经变强了，</div>
          </Reveal>
          <Reveal f={f} at={30} dur={20} out={brand} outDur={12}>
            <div style={{ ...big, fontWeight: 600, color: C.fg }}>约束不该变多。</div>
          </Reveal>
          <Reveal f={f} at={78} dur={18} out={brand} outDur={12}>
            <div style={{ fontFamily: F.cn, fontSize: 38, color: C.fg2, marginTop: 48 }}>
              不管它怎么干活，只管文档最后长什么样。
            </div>
          </Reveal>
        </div>
      )}
      {f >= brand && (
        <div style={{ textAlign: "center", position: "absolute" }}>
          <div
            style={{
              fontFamily: F.en,
              fontSize: 120,
              fontWeight: 300,
              letterSpacing: "-0.03em",
              color: C.fg,
              opacity: b,
              filter: `blur(${mix(14, 0, b)}px)`,
              lineHeight: 1,
            }}
          >
            Hypo-Workflow <span style={{ fontWeight: 600 }}>3.0</span>
          </div>
          <Reveal f={f} at={brand + 14} dur={18}>
            <div style={{ fontFamily: F.cn, fontSize: 38, color: C.fg2, marginTop: 40 }}>
              一套“文档放哪、怎么写”的约定，加一个只读的检查工具 <Mono style={{ color: C.fg }}>hw</Mono>。
            </div>
          </Reveal>
        </div>
      )}
    </AbsoluteFill>
  );
};

