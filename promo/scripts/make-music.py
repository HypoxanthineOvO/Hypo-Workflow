#!/usr/bin/env python3
"""Synthesize the film score from src/timeline.json (no samples).

96 BPM, one bar = 2.5 s = 75 frames, so scene cuts land on bar lines.
Shape: dark drone + heartbeat (pains) -> comic blips and a punch (the usual
fix) -> clean pads (insight) -> pulse + arp (design) -> riser, impact on
`hit` (hw check red) -> major resolve -> final chord under the logo, fade out.

Output: public/music.wav (48 kHz, 16-bit stereo).
"""
import json
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt, lfilter

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "src/timeline.json").read_text())
FPS = TL["fps"]
EV = TL["ev"]
SC = TL["scenes"]
SR = 48000
DUR = TL["total"] / FPS
N = int(DUR * SR)
BEAT = 60 / TL["bpm"]
BAR = 4 * BEAT
rng = np.random.default_rng(3)

L = np.zeros(N + SR * 6)
R = np.zeros_like(L)


def t_of(frame):
    return frame / FPS


def mf(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(sig, at, pan=0.5, gain=1.0):
    i = int(at * SR)
    if i >= len(L):
        return
    e = min(len(L), i + len(sig))
    L[i:e] += sig[: e - i] * gain * np.sqrt(1 - pan)
    R[i:e] += sig[: e - i] * gain * np.sqrt(pan)


def lp(x, hz, order=2):
    return sosfilt(butter(order, hz / (SR / 2), output="sos"), x)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz / (SR / 2), btype="high", output="sos"), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo / (SR / 2), hi / (SR / 2)], btype="band", output="sos"), x)


def ar(n, a, r):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na) ** 2
    e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


# ---------------------------------------------------------------- voices
def pad(m, dur, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mf(m)
    out = np.zeros(n)
    for d in (-0.09, 0.0, 0.08):
        ff = f * 2 ** (d / 12)
        ph = rng.uniform(0, 6.28)
        out += np.sin(2 * np.pi * ff * t + ph)
        out += 0.18 * bright * np.sin(4 * np.pi * ff * t + ph)
        out += 0.07 * bright * np.sin(6 * np.pi * ff * t + ph)
    return out / 3 * ar(n, min(1.6, dur / 3), min(2.2, dur / 2))


def pluck(m, dur=1.2, dec=4.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mf(m)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * dec)
    s += 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t * dec * 2.2)
    s += 0.12 * np.sin(6 * np.pi * f * t) * np.exp(-t * dec * 3)
    return s * np.minimum(1, t / 0.004)


def kick(g=1.0):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    fr = 44 + 90 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return np.sin(ph) * np.exp(-t * 7) * g


def hat(dur=0.06):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-t * 70)


def tick(freq=2400, dur=0.05):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * np.exp(-t * 90)


def noise_sweep(dur, lo, hi, rise=True):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    blk = 2048
    for i in range(0, n, blk):
        p = i / n if rise else 1 - i / n
        c = lo * (hi / lo) ** p
        out[i : i + blk] = bp(x[i : i + blk + 0], c * 0.7, min(c * 1.4, SR / 2 - 100))[: blk]
    env = np.linspace(0, 1, n) ** 2.2 if rise else np.linspace(1, 0, n) ** 1.5
    return out * env


def boom():
    n = int(4.0 * SR)
    t = np.arange(n) / SR
    fr = 38 + 70 * np.exp(-t * 10)
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 1.3)
    s = np.tanh(s * 2.2) * 0.8
    nz = lp(rng.standard_normal(n), 2500) * np.exp(-t * 9) * 0.6
    return s + nz


def chime(ms, dur=4.0):
    out = None
    for k, m in enumerate(ms):
        p = pluck(m, dur, dec=1.1) + 0.3 * pluck(m + 12, dur, dec=2.0)
        out = p if out is None else out + p
    return out / len(ms)


# ---------------------------------------------------------------- score
def st(k):
    return t_of(SC[k][0])


t_pain, t_usual, t_ins, t_design = st("s2"), st("s7"), st("s8"), st("s9")
t_check, t_end = st("s14"), st("s15")
t_enter, t_hit, t_res = t_of(EV["enter"]), t_of(EV["hit"]), t_of(EV["resolve"])
t_logo = t_of(EV["logo"])

# 0. open: a single soft chord + typing clicks
for j, m in enumerate([57, 64, 69]):
    add(lp(pad(m, 4.0, 0.5), 1500), 0.0, 0.3 + 0.2 * j, 0.05)
for k in range(10):
    add(tick(1500 + 100 * (k % 3), 0.025), t_of(6) + k / FPS / 0.4, 0.6, 0.05)

# 1. pains: low A drone with a minor-2nd rub, heartbeat, an accent per pain
dlen = t_usual - t_pain + 1.0
dr = pad(33, dlen, 0.6) + 0.6 * pad(45, dlen, 0.6) + 0.2 * pad(46, dlen, 0.3)
dr = lp(dr, 750) * np.linspace(0.5, 1.0, int(dlen * SR))
add(dr, t_pain, 0.5, 0.30)
b = t_pain
while b < t_usual - 0.1:
    add(lp(kick(0.7), 400), b, 0.5, 0.32)
    add(lp(kick(0.4), 400), b + BEAT * 0.75, 0.5, 0.22)
    b += BEAT * 2
for k in ("s2", "s3", "s4", "s5", "s6"):
    add(lp(noise_sweep(0.5, 300, 3000, rise=False), 4000), st(k), 0.5, 0.12)
for fr in EV["p3Cuts"]:
    add(lp(boom(), 900)[: int(0.7 * SR)], t_of(fr), 0.5, 0.16)
    add(hp(rng.standard_normal(int(0.12 * SR)), 3000) * 0.5, t_of(fr), 0.5, 0.06)
add(lp(boom(), 900)[: int(1.2 * SR)], t_of(EV["p4Stale"]), 0.5, 0.18)
# rules piling up: rising ticks
for k in range(12):
    add(tick(900 * 2 ** (k / 14), 0.05), st("s2") + 4 / FPS + k * (76 / 12) / FPS, 0.4 + 0.02 * k, 0.06)

# 2. the usual fix: comic "blip" for each over-cautious reply, then the punch
for j, m in enumerate([45, 52, 57]):
    add(lp(pad(m, t_ins - t_usual + 0.5, 0.5), 1200), t_usual, 0.3 + 0.2 * j, 0.06)
for k, fr in enumerate(EV["gptPops"]):
    t0 = t_of(fr)
    for q, m in enumerate([76, 79, 84][: 2 + (k == 2)]):
        add(pluck(m + k * 2, 0.4, 9.0), t0 + q * 0.07, 0.5, 0.07)
    add(kick(0.5), t0, 0.5, 0.18)
add(boom(), t_of(EV["gptPunch"]), 0.5, 0.35)

# 3. insight: clean Am9 -> Fmaj7 pads, chime on the brand
for j, m in enumerate([45, 57, 60, 64, 71]):
    add(lp(pad(m, 2 * BAR + 1.0, 0.8), 2400), t_ins, 0.25 + 0.12 * j, 0.08)
for j, m in enumerate([41, 57, 60, 64, 67]):
    add(lp(pad(m, BAR + 1.5, 0.8), 2400), t_ins + 2 * BAR, 0.25 + 0.12 * j, 0.08)
add(chime([69, 76, 81, 83], 5.0), t_of(EV["brand"]), 0.5, 0.22)

# 4. design: Cmaj7 - G6 - Am9 - Fmaj7 pads, arp + pulse until the enter key
PROG = [[48, 55, 59, 64, 67], [43, 55, 59, 62, 64], [45, 57, 60, 64, 71], [41, 57, 60, 64, 67]]
ARP = [[67, 72, 76, 79], [67, 71, 74, 76], [69, 72, 76, 79], [69, 72, 76, 77]]
t = t_design
k = 0
while t < t_hit - 0.05:
    dur = min(2 * BAR, t_hit - t) + 1.5
    for j, m in enumerate(PROG[k % 4]):
        add(lp(pad(m, dur, 0.8), 2400), t, 0.25 + 0.12 * j, 0.07 if j else 0.09)
    t += 2 * BAR
    k += 1
t = t_design
i = 0
while t < t_enter - 0.05:
    chord = ARP[int((t - t_design) // (2 * BAR)) % 4]
    m = chord[[0, 2, 1, 3, 2, 0, 3, 1][i % 8]]
    add(pluck(m, 0.9, 5.0), t, 0.3 + 0.4 * ((i * 3) % 4) / 3, 0.07)
    add(pluck(m + 12, 0.5, 8.0), t + BEAT * 0.75, 0.75, 0.016)
    t += BEAT / 2
    i += 1
t = t_design
while t < t_enter - 0.05:
    add(kick(0.8), t, 0.5, 0.30)
    add(hat(), t + BEAT / 2, 0.62, 0.05)
    t += BEAT
for fr in EV["s9Cards"] + EV["s10Reads"] + EV["s12Trailers"]:
    add(tick(1800, 0.05), t_of(fr), 0.55, 0.07)
for fr in EV["s13Chips"]:
    add(tick(2600, 0.04), t_of(fr) + 8 / FPS, 0.5, 0.05)
add(lp(noise_sweep(0.9, 200, 1600, rise=False), 2000), t_of(EV["s11Fold"]), 0.5, 0.10)
add(lp(boom(), 600)[: int(1.2 * SR)], t_of(EV["s13Drain"]), 0.5, 0.12)

# 5. hw check: typing, riser, impact, fix, resolve
for k in range(8):
    add(tick(1500 + 120 * (k % 3), 0.025), t_of(EV["typeStart"]) + k / FPS / 0.45, 0.6, 0.06)
add(tick(900, 0.08), t_enter, 0.5, 0.12)
rise_len = t_hit - t_enter
add(noise_sweep(rise_len, 300, 9000), t_enter, 0.5, 0.11)
sw = pad(45, rise_len + 0.05, 1.0) * np.linspace(0, 1, int((rise_len + 0.05) * SR)) ** 2
add(lp(sw, 1500), t_enter, 0.5, 0.10)
add(boom(), t_hit, 0.5, 0.65)
cl = sum(pad(m, 2.6, 1.2) for m in (33, 45, 46, 52, 58)) / 5
add(lp(cl, 1800), t_hit, 0.5, 0.42)
add(hp(rng.standard_normal(int(0.25 * SR)) * np.exp(-np.arange(int(0.25 * SR)) / SR * 16), 2000), t_hit, 0.5, 0.10)
for k in range(2):
    add(lp(kick(0.6), 300), t_of(EV["fix"]) + k * BEAT, 0.5, 0.26)
add(chime([72, 76, 79, 83, 86], 4.0), t_res, 0.5, 0.24)
for j, m in enumerate([48, 55, 64, 67, 71, 74]):
    add(lp(pad(m, t_end - t_res + 1.5, 0.8), 2600), t_res, 0.3 + 0.08 * j, 0.06)

# 6. end: final Cmaj9 under the logo, long tail
add(noise_sweep(t_logo - t_end, 300, 4000), t_end, 0.5, 0.05)
for j, m in enumerate([36, 48, 55, 64, 67, 71, 74]):
    add(lp(pad(m, DUR - t_logo + 3, 0.9), 3000), t_logo, 0.2 + 0.1 * j, 0.07)
add(chime([72, 79, 84, 86, 88], 6.0), t_logo, 0.5, 0.22)
add(lp(boom(), 200)[: int(3 * SR)], t_logo, 0.5, 0.20)

# ---------------------------------------------------------------- master
def reverb(x, wet=0.28):
    y = np.zeros_like(x)
    for d, g in ((1557, 0.84), (1617, 0.83), (1491, 0.85), (1422, 0.86), (1277, 0.87), (1356, 0.86)):
        a = np.zeros(d + 1)
        a[0], a[d] = 1, -g
        y += lfilter([1.0], a, x)
    y /= 6
    for d in (225, 556, 441):
        b = np.zeros(d + 1)
        b[0], b[d] = -0.5, 1
        a = np.zeros(d + 1)
        a[0], a[d] = 1, -0.5
        y = lfilter(b, a, y)
    return x * (1 - wet) + lp(y, 5000) * wet


L2, R2 = reverb(L[:N]), reverb(R[:N] * 1.0)
# predelay offset for width
R2 = np.concatenate([np.zeros(240), R2[:-240]]) * 0.5 + R2 * 0.5
st = np.stack([L2, R2], axis=1)
st = hp(st.T, 28).T
fade_in = np.minimum(1, np.arange(N) / (0.6 * SR))
fade_out = np.clip((DUR - np.arange(N) / SR) / 3.0, 0, 1) ** 1.6
st *= (fade_in * fade_out)[:, None]
st = np.tanh(st * 1.4) / 1.4
peak = np.max(np.abs(st))
st = st / peak * 0.80
pcm = (st * 32767).astype("<i2")
out = ROOT / "public/music.wav"
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
rms = np.sqrt(np.mean(st**2))
print(f"wrote {out} {DUR:.2f}s peak 0.80 rms {20*np.log10(rms):.1f} dBFS hit at {t_hit:.2f}s")
