#!/usr/bin/env python3
"""Synthesize the film score from src/timeline.json (no samples).

96 BPM, one bar = 2.5 s = 75 frames, so scene cuts land on bar lines.
Shape: dark drone (problem) -> collapse to silence -> clean pads (insight)
-> pulse + arp (design) -> riser, impact on `hit` (hw check red) -> major
resolve -> final chord under the logo, fade out.

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
t_s2 = t_of(SC["s2"][0])
t_col = t_of(EV["s3Collapse"])
t_three = t_of(EV["s3Three"])
t_s4 = t_of(SC["s4"][0])
t_s6 = t_of(SC["s6"][0])
t_s10 = t_of(SC["s10"][0])
t_enter = t_of(EV["s10Enter"])
t_hit = t_of(EV["hit"])
t_res = t_of(EV["s10Resolve"])
t_s11 = t_of(SC["s11"][0])
t_s12 = t_of(SC["s12"][0])
t_logo = t_of(EV["s12Logo"])

# 1. problem: low A drone with a minor 2nd rub, slowly opening filter
dr = pad(33, t_col + 0.3, 0.6) + 0.6 * pad(45, t_col + 0.3, 0.6) + 0.22 * pad(46, t_col + 0.3, 0.3)
dr = lp(dr, 700)
dr *= np.linspace(0.4, 1.0, len(dr))
add(dr, 0.0, 0.5, 0.30)
# counter ticks while the number climbs (S1)
for k in range(28):
    tt = t_of(18) + (t_of(110) - t_of(18)) * (1 - (1 - k / 28) ** 1.8)
    add(tick(3000 + 40 * (k % 5), 0.03), tt, 0.3 + 0.4 * (k % 2), 0.05)
# soft heartbeat pulse through the pain montage
b = t_s2
while b < t_col - 0.1:
    add(lp(kick(0.7), 400), b, 0.5, 0.35)
    add(lp(kick(0.4), 400), b + BEAT * 0.75, 0.5, 0.25)
    b += BEAT * 2
# accents on each pain beat cut and on "B breaks"
for fr in [SC["s2"][0]] + EV["s2Cuts"]:
    add(lp(noise_sweep(0.5, 300, 3000, rise=False), 4000), t_of(fr), 0.5, 0.12)
add(lp(boom(), 900)[: int(1.5 * SR)], t_of(EV["s2Break"]), 0.5, 0.22)
# version flips: rising ticks
for k, fr in enumerate(EV["s3Flips"]):
    add(tick(900 * 2 ** (k / 10), 0.06), t_of(fr), 0.35 + 0.03 * k, 0.11)
add(noise_sweep(t_col - t_of(EV["s3Flips"][0]), 400, 6000), t_of(EV["s3Flips"][0]), 0.5, 0.05)
# collapse -> near silence, then "3.0" chime
add(lp(boom(), 300)[: int(2.0 * SR)], t_col, 0.5, 0.18)
add(chime([69, 76, 81, 83], 5.0), t_three, 0.5, 0.20)

# 2. insight + design: Am9 - Fmaj7 - Cmaj7 - G6 pads, 2 bars each
PROG = [[45, 57, 60, 64, 71], [41, 57, 60, 64, 67], [48, 55, 59, 64, 67], [43, 55, 59, 62, 64]]
t = t_s4
k = 0
while t < t_hit - 0.05:
    dur = min(2 * BAR, t_hit - t) + 1.5
    for j, m in enumerate(PROG[k % 4]):
        g = 0.07 if j else 0.09
        add(lp(pad(m, dur, 0.8), 2400), t, 0.25 + 0.12 * j, g)
    t += 2 * BAR
    k += 1

# arp from the design section until the enter key
ARP = [[69, 72, 76, 79], [69, 72, 76, 77], [67, 72, 76, 79], [67, 71, 74, 76]]
t = t_s6
i = 0
while t < t_enter - 0.05:
    chord = ARP[int((t - t_s4) // (2 * BAR)) % 4]
    m = chord[[0, 2, 1, 3, 2, 0, 3, 1][i % 8]]
    add(pluck(m, 0.9, 5.0), t, 0.3 + 0.4 * ((i * 3) % 4) / 3, 0.075)
    add(pluck(m + 12, 0.5, 8.0), t + BEAT * 0.75, 0.75, 0.018)
    t += BEAT / 2
    i += 1

# pulse: kick on beats, hats on offbeats, design section only
t = t_s6
while t < t_enter - 0.05:
    add(kick(0.8), t, 0.5, 0.33)
    add(hat(), t + BEAT / 2, 0.62, 0.05)
    t += BEAT
# a soft tick for each map card / trailer / strike
for fr in EV["s6Cards"] + EV["s9Trailers"]:
    add(tick(1800, 0.05), t_of(fr), 0.55, 0.07)
for fr in EV["s8Strikes"]:
    add(hp(noise_sweep(0.18, 2000, 8000), 1500), t_of(fr), 0.45, 0.05)
add(lp(noise_sweep(0.9, 200, 1600, rise=False), 2000), t_of(EV["s7Fold"]), 0.5, 0.10)

# 3. hw check: typing clicks, riser, impact
for k in range(8):
    add(tick(1500 + 120 * (k % 3), 0.025), t_of(EV["s10TypeStart"]) + k * (1 / FPS) / 0.45, 0.6, 0.06)
add(tick(900, 0.08), t_enter, 0.5, 0.12)
rise_len = t_hit - t_enter
add(noise_sweep(rise_len, 300, 9000), t_enter, 0.5, 0.11)
sw = pad(45, rise_len + 0.05, 1.0) * np.linspace(0, 1, int((rise_len + 0.05) * SR)) ** 2
add(lp(sw, 1500), t_enter, 0.5, 0.10)
# impact: sub boom + dissonant cluster (A + Bb + E)
add(boom(), t_hit, 0.5, 0.65)
cl = sum(pad(m, 3.2, 1.2) for m in (33, 45, 46, 52, 58)) / 5
add(lp(cl, 1800), t_hit, 0.5, 0.42)
add(hp(rng.standard_normal(int(0.25 * SR)) * np.exp(-np.arange(int(0.25 * SR)) / SR * 16), 2000), t_hit, 0.5, 0.10)
# fix: dull pulse while the doc is edited
for k in range(3):
    add(lp(kick(0.6), 300), t_of(EV["s10Fix"]) + k * BEAT, 0.5, 0.28)
# resolve: bright Cmaj9 chime + pad
add(chime([72, 76, 79, 83, 86], 5.0), t_res, 0.5, 0.24)
for j, m in enumerate([48, 55, 64, 67, 71, 74]):
    add(lp(pad(m, t_s11 - t_res + 2.0, 0.8), 2600), t_res, 0.3 + 0.08 * j, 0.06)

# 4. board / handoff: lighter groove, Fmaj7 - G6 - Am9
t = t_s11
k = 0
for ch in ([41, 57, 60, 64, 67], [43, 55, 59, 62, 64], [45, 57, 60, 64, 71]):
    dur = BAR + 1.5
    for j, m in enumerate(ch):
        add(lp(pad(m, dur, 0.8), 2400), t + k * BAR, 0.25 + 0.12 * j, 0.065)
    k += 1
t = t_s11
i = 0
while t < t_s12 - 0.2:
    add(pluck([72, 76, 79, 81][i % 4], 0.8, 6.0), t, 0.3 + 0.4 * (i % 2), 0.05)
    if i % 2 == 0:
        add(kick(0.55), t, 0.5, 0.2)
    t += BEAT / 2
    i += 1
for fr in EV["s11Chips"]:
    add(tick(2600, 0.04), t_of(fr) + 8 / FPS, 0.5, 0.05)
add(lp(boom(), 600)[: int(1.2 * SR)], t_of(EV["s11Drain"]), 0.5, 0.12)

# 5. end: final Fmaj9 -> Cmaj9 under the logo, long tail
add(noise_sweep(t_logo - t_s12, 300, 4000), t_s12, 0.5, 0.05)
for j, m in enumerate([36, 48, 55, 64, 67, 71, 74]):
    add(lp(pad(m, DUR - t_logo + 3, 0.9), 3000), t_logo, 0.2 + 0.1 * j, 0.07)
add(chime([72, 79, 84, 86, 88], 7.0), t_logo, 0.5, 0.22)
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
fade_out = np.clip((DUR - np.arange(N) / SR) / 3.2, 0, 1) ** 1.6
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
