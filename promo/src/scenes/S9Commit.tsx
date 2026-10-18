import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, F } from "../theme";
import { seg, lin, mix, EV, rel, typed } from "../util";
import { Header, Mono, Panel } from "../components";

const TR = EV.s12Trailers.map((x) => rel("s12", x));
const TRAILERS = [
  { k: "Feature", v: "同步", note: "动了哪个功能" },
  { k: "Code", v: "web/src/sync.js: retryQueue, mergeChanges", note: "精确到函数" },
  { k: "Docs", v: "docs/需求/同步.md", note: "改了哪些文档" },
  { k: "Verified", v: "两台设备同时改同一事项，只挂起冲突项", note: "在哪亲眼看到" },
];

export const S9: React.FC = () => {
  const f = useCurrentFrame();
  const subject = "同步：冲突时只重试相关操作";
  return (
    <AbsoluteFill style={{ opacity: 1 - lin(f, 140, 150) }}>
      <Header f={f} at={2} out={400} idx="04" usual="另写变更日志、进度报告" title="commit 即记录" sub="每次提交带四个字段：哪个功能、哪段代码、哪份文档、在哪亲眼看到。" />
      <Panel
        x={160}
        y={420}
        w={1600}
        h={520}
        label="git log -1"
        right={<span style={{ color: C.fg4 }}>a3f9e21</span>}
        style={{ opacity: seg(f, 10, 26), transform: `translateY(${mix(20, 0, seg(f, 10, 26))}px)` }}
      >
        <div style={{ fontFamily: F.mono, fontSize: 30, lineHeight: "48px", color: C.fg }}>
          {typed(subject, f, 20, 0.7)}
          <span style={{ opacity: f > 20 && f < 56 && Math.floor(f / 8) % 2 === 0 ? 1 : 0, color: C.mint }}>▍</span>
        </div>
        <div
          style={{
            fontFamily: F.cn,
            fontSize: 24,
            lineHeight: "40px",
            color: C.fg2,
            marginTop: 14,
            opacity: seg(f, 34, 48),
          }}
        >
          前端重试队列改为按 opId 单独重试，失败的操作不再拖住整页保存。
        </div>
        <div style={{ height: 1, background: C.line, margin: "26px 0 22px" }} />
        {TRAILERS.map((t, i) => {
          const p = seg(f, TR[i], TR[i] + 14);
          return (
            <div
              key={t.k}
              style={{
                display: "flex",
                alignItems: "baseline",
                height: 52,
                opacity: p,
                transform: `translateX(${mix(-16, 0, p)}px)`,
              }}
            >
              <Mono style={{ width: 170, fontSize: 28, color: C.mint }}>{t.k}:</Mono>
              <Mono style={{ flex: 1, fontSize: 28, color: C.fg }}>{t.v}</Mono>
              <span style={{ fontFamily: F.cn, fontSize: 21, color: C.fg3 }}>{t.note}</span>
            </div>
          );
        })}
      </Panel>
    </AbsoluteFill>
  );
};
