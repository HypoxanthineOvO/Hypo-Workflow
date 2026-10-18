import { interpolate, Easing } from "remotion";
import T from "./timeline.json";

export const TL = T;
export const EV = T.ev;
export const S = T.scenes as unknown as Record<string, [number, number]>;
/** event frame relative to a scene's start */
export const rel = (scene: string, abs: number) => abs - S[scene][0];

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const expo = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);

export const seg = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { ...CL, easing: expo });
export const segIO = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { ...CL, easing: inOut });
export const lin = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], CL);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** enter/exit envelope: 0→1 over [a, a+i], 1→0 over [b-o, b] */
export const env = (f: number, a: number, b: number, i = 12, o = 12) =>
  Math.min(seg(f, a, a + i), 1 - segIO(f, b - o, b));

/** chars typed of a string, starting at frame `start`, `cpf` chars/frame */
export const typed = (s: string, f: number, start: number, cpf = 1) =>
  s.slice(0, Math.max(0, Math.floor((f - start) * cpf)));

export const rand = (seed: number) => {
  let x = Math.sin(seed * 9301.17 + 49297.3) * 233280.5;
  return x - Math.floor(x);
};
