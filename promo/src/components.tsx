import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "./theme";
import { seg, mix, lin } from "./util";

export const Backdrop: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill
      style={{
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.075) 1px, transparent 1.2px)",
        backgroundSize: "48px 48px",
        backgroundPosition: `${24 - (f * 0.05) % 48}px 24px`,
        opacity: 0.55,
      }}
    />
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 75% 70% at 50% 48%, rgba(6,7,8,0) 0%, rgba(6,7,8,0.55) 70%, rgba(6,7,8,0.95) 100%)",
      }}
    />
  </AbsoluteFill>
);

/** blur + rise + fade in starting at `at` */
export const Reveal: React.FC<{
  f: number;
  at: number;
  dur?: number;
  y?: number;
  blur?: number;
  out?: number;
  outDur?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ f, at, dur = 16, y = 18, blur = 8, out, outDur = 10, style, children }) => {
  const p = seg(f, at, at + dur);
  const o = out === undefined ? 1 : 1 - lin(f, out - outDur, out);
  return (
    <div
      style={{
        opacity: p * o,
        transform: `translateY(${mix(y, 0, p)}px)`,
        filter: p < 1 ? `blur(${mix(blur, 0, p)}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Mono: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({
  style,
  children,
}) => <span style={{ fontFamily: F.mono, ...style }}>{children}</span>;

export const Header: React.FC<{
  f: number;
  at: number;
  out: number;
  idx: string;
  title: React.ReactNode;
  sub: React.ReactNode;
  x?: number;
  y?: number;
  w?: number;
}> = ({ f, at, out, idx, title, sub, x = 160, y = 120, w }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w }}>
    <Reveal f={f} at={at} out={out} y={10} blur={4}>
      <Mono style={{ fontSize: 20, color: C.mint, letterSpacing: "0.18em" }}>
        {idx}
        <span style={{ color: C.fg3 }}> / 06</span>
      </Mono>
    </Reveal>
    <Reveal f={f} at={at + 4} out={out}>
      <div
        style={{
          fontFamily: F.cn,
          fontSize: 64,
          fontWeight: 600,
          color: C.fg,
          letterSpacing: "-0.01em",
          marginTop: 18,
          lineHeight: 1.1,
        }}
      >
        {title}
      </div>
    </Reveal>
    <Reveal f={f} at={at + 9} out={out}>
      <div
        style={{
          fontFamily: F.cn,
          fontSize: 30,
          fontWeight: 400,
          color: C.fg2,
          marginTop: 16,
        }}
      >
        {sub}
      </div>
    </Reveal>
  </div>
);

export const Panel: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  right?: React.ReactNode;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ x, y, w, h, label, right, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      border: `1px solid ${C.line}`,
      borderRadius: 14,
      background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))",
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      style={{
        height: 52,
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
      <span>
        <span style={{ color: C.fg4, marginRight: 14 }}>●●●</span>
        {label}
      </span>
      <span>{right}</span>
    </div>
    <div style={{ position: "relative", padding: "22px 28px" }}>{children}</div>
  </div>
);

const tc = (f: number) => {
  const s = Math.floor(f / 30);
  const p = (n: number) => String(n).padStart(2, "0");
  return `00:${p(Math.floor(s / 60))}:${p(s % 60)}:${p(f % 30)}`;
};

export const HUD: React.FC<{ f: number; brand: number; scene: string; hide: number }> = ({
  f,
  brand,
  scene,
  hide,
}) => {
  const base: React.CSSProperties = {
    position: "absolute",
    fontFamily: F.mono,
    fontSize: 15,
    letterSpacing: "0.16em",
    color: C.fg3,
    opacity: 0.8 * hide,
  };
  return (
    <AbsoluteFill>
      <div style={{ ...base, left: 64, top: 52, opacity: base.opacity! as number * brand }}>
        HYPO-WORKFLOW <span style={{ color: C.fg2 }}>3.0</span>
      </div>
      <div style={{ ...base, right: 64, top: 52, opacity: base.opacity! as number * brand }}>
        DOCS ⇄ CODE
      </div>
      <div style={{ ...base, left: 64, bottom: 48, color: C.fg4 }}>{tc(f)}</div>
      <div style={{ ...base, right: 64, bottom: 48, color: C.fg4 }}>{scene}</div>
    </AbsoluteFill>
  );
};
