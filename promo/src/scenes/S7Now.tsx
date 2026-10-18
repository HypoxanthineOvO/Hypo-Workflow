import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F } from "../theme";
import { seg, segIO, lin, mix, EV, rel } from "../util";
import { Header, Mono } from "../components";

const OLD = [
  "2026-10-09 最新：前台 5 秒检查，后台 30 秒",
  "2026-10-11 补充（覆盖上条）：冲突时整页重试",
  "2026-10-12 更正：上条作废，恢复整页快照",
  "2026-10-13 最新裁决：同步改为逐操作",
  "2026-10-14 最新（覆盖上条…）：后台约 15 秒",
];
const FOLD = rel("s7", EV.s7Fold);
const LH = 54;

export const S7: React.FC = () => {
  const f = useCurrentFrame();
  const fold = segIO(f, FOLD, FOLD + 18);
  const now = seg(f, FOLD + 12, FOLD + 30);
  const git = seg(f, FOLD + 30, FOLD + 46);
  return (
    <AbsoluteFill style={{ opacity: 1 - lin(f, 115, 125) }}>
      <Header f={f} at={2} out={400} idx="02" title="只写现在" sub="规则改了，就改写那一条。历史交给 git。" />
      <div style={{ position: "absolute", left: 160, top: 450, width: 1600 }}>
        <Mono style={{ fontSize: 22, color: C.fg3 }}>docs/需求/同步.md</Mono>
        <div style={{ fontFamily: F.cn, fontSize: 34, color: C.fg, fontWeight: 600, marginTop: 22 }}>
          ## 规则
        </div>
        <div style={{ position: "relative", marginTop: 16, height: OLD.length * LH }}>
          {OLD.map((t, i) => {
            const p = seg(f, 6 + i * 4, 20 + i * 4);
            const y = mix(i * LH, 0, fold);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: y,
                  left: 0,
                  fontFamily: F.mono,
                  fontSize: 27,
                  lineHeight: `${LH}px`,
                  color: C.fg2,
                  opacity: p * (1 - fold) * (i === OLD.length - 1 ? 1 : 0.75),
                  whiteSpace: "nowrap",
                  filter: fold > 0 ? `blur(${fold * 6}px)` : undefined,
                }}
              >
                <span style={{ color: C.fg4, marginRight: 20 }}>-</span>
                {t}
              </div>
            );
          })}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              fontFamily: F.cn,
              fontSize: 34,
              lineHeight: `${LH}px`,
              color: C.fg,
              opacity: now,
              transform: `translateY(${mix(10, 0, now)}px)`,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontFamily: F.mono, color: C.fg4, marginRight: 20 }}>-</span>
            逐操作同步；前台 5 秒、后台约 15 秒检查；冲突只挂起相关操作。
          </div>
          <Mono
            style={{
              position: "absolute",
              top: LH + 26,
              left: 46,
              fontSize: 21,
              color: C.fg3,
              opacity: git,
            }}
          >
            <span style={{ color: C.mint }}>git log</span> -- docs/需求/同步.md{"   "}
            <span style={{ color: C.fg4 }}>5 commits</span>
          </Mono>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const WORDS = [
  { t: "这验证了接口，不能声称页面可用。", tag: "免责尾巴" },
  { t: "（已核验）", tag: "自证标注" },
  { t: "不代表生产环境同样成立。", tag: "免责尾巴" },
  { t: "见 M1 / C27 阶段报告", tag: "内部编号" },
];
const STR = EV.s8Strikes.map((x) => rel("s8", x));

export const S8: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: 1 - lin(f, 90, 100) }}>
      <Header f={f} at={0} out={400} idx="03" title="说人话" sub="免责腔、自证标注、要查表的编号，hw 都会报出来。" />
      <div style={{ position: "absolute", left: 160, top: 470, width: 1600 }}>
        {WORDS.map((w, i) => {
          const p = seg(f, 4 + i * 4, 18 + i * 4);
          const s = seg(f, STR[i], STR[i] + 10);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 36,
                height: 82,
                opacity: p * mix(1, 0.8, s),
              }}
            >
              <div style={{ position: "relative", display: "inline-block" }}>
                <span style={{ fontFamily: F.cn, fontSize: 40, color: s > 0.5 ? C.fg2 : C.fg }}>{w.t}</span>
                <div
                  style={{
                    position: "absolute",
                    left: -6,
                    top: "56%",
                    height: 3,
                    width: `calc(${s * 100}% + 12px)`,
                    background: C.red,
                  }}
                />
              </div>
              <Mono style={{ fontSize: 19, color: C.red, opacity: s, letterSpacing: "0.08em" }}>
                {w.tag}
              </Mono>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
