"""Sound design: all SFX and the low bed are synthesised here, then mixed under the voice.
Times come from the same marks that drive the picture, so sound lands with the visuals."""
import json, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
W = json.load(open("../video/src/data/warp.json"))
DUR = W["total"] / 30


def w(t):
    """Script seconds to seconds in the current take (same map as src/lib/warp.ts)."""
    k = W["knots"]
    return float(np.interp(t, [a for a, _ in k], [b for _, b in k]))


N = int(DUR * SR)
rng = np.random.default_rng(7)
M = json.load(open("../video/src/data/captions.json"))["marks"]
sec = {k: v / 30 for k, v in M.items()}


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, hi):
    return sosfilt(butter(2, hi, btype="low", fs=SR, output="sos"), x)


def whoosh(d=0.42):
    n = int(d * SR)
    t = np.linspace(0, 1, n)
    x = rng.normal(0, 1, n)
    low, mid, high = bp(x, 180, 700), bp(x, 700, 2600), bp(x, 2600, 7500)
    env = np.sin(np.pi * t ** 0.65) ** 2
    y = low * (1 - t) ** 1.2 + mid * np.sin(np.pi * t) * 0.8 + high * t ** 2 * 0.35
    return y * env / (np.abs(y).max() + 1e-9)


def tick(f=1900, d=0.03):
    n = int(d * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * 0.7 + rng.normal(0, 0.3, n)) * np.exp(-t / 0.006)


def pop(f0=620, f1=240, d=0.09):
    n = int(d * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(np.linspace(f0, f1, n)) / SR
    return np.sin(ph) * np.exp(-t / 0.026)


def boom(d=0.95):
    n = int(d * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(38 + 62 * np.exp(-t / 0.05)) / SR
    x = np.sin(ph) * np.exp(-t / 0.3)
    click = lp(rng.normal(0, 1, n), 1800) * np.exp(-t / 0.018) * 0.6
    return x + click


def riser(d):
    n = int(d * SR)
    t = np.linspace(0, 1, n)
    ph = 2 * np.pi * np.cumsum(170 + 900 * t ** 2.4) / SR
    x = np.sin(ph) * 0.45 + bp(rng.normal(0, 1, n), 1500, 7000) * 0.5 * t
    return x * t ** 2.2 * np.minimum(1, (1 - t) * 60)


def chime(f=880):
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t)
    return x * np.exp(-t / 0.11) * np.minimum(1, t / 0.002) / 1.7


def alert():
    n = int(0.13 * SR)
    t = np.arange(n) / SR
    x = lp(np.sign(np.sin(2 * np.pi * 620 * t)), 2400)
    return x * np.minimum(1, t / 0.004) * np.minimum(1, (0.13 - t) / 0.02)


L = np.zeros(N)
R = np.zeros(N)


def put(x, at, gain_db, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    x = x[: N - i]
    g = 10 ** (gain_db / 20)
    L[i : i + len(x)] += x * g * np.sqrt((1 - pan) / 2) * 1.41
    R[i : i + len(x)] += x * g * np.sqrt((1 + pan) / 2) * 1.41


# Section changes
for t in [14.15, 27.48, 36.11, 45.72, 50.74, 60.18, 67.94]:
    put(whoosh(0.5), w(t) - 0.3, -19)
# Scene changes inside sections
for t, p in [(2.46, 0.3), (4.6, -0.3), (15.44, -0.25), (18.91, 0.25), (23.13, -0.25), (25.6, 0.25), (29.18, -0.2), (40.26, 0.2), (52.55, -0.2), (63.49, 0.25), (68.9, -0.2), (75.16, 0.2)]:
    put(whoosh(0.34), w(t) - 0.2, -25, p)

# Impacts
for t, g in [(sec["gb2"], -14), (w(14.25), -17), (sec["up_8gb"], -13), (sec["notenough"], -15), (sec["guess"], -16), (sec["test"], -13)]:
    put(boom(), t, g)

# Count-up riser on "more users", tick under the numbers, landing into the 2GB boom
hook = sec["users"] - 0.25
put(riser(sec["gb2"] - hook), hook, -24)
for k in range(12):
    put(tick(2200 + k * 90), hook + k * (sec["gb2"] - hook) / 12, -35, 0.2 if k % 2 else -0.2)

# Cards landing
put(pop(), w(6.41), -20, -0.35)
put(pop(), w(7.56), -20, 0.35)
put(pop(900, 300, 0.12), w(11.2), -17)
put(chime(740), sec["q_8gb"], -30, 0.35)

# Log lines
for k in range(14):
    t = w(15.55) + k * 10 / 30
    if t > w(18.8):
        break
    put(tick(1500), t, -33, 0.15)

# Packets to the database, then cache hits
t = w(18.95)
while t < sec["cache"]:
    put(tick(800, 0.04), t, -35, -0.2)
    t += 11 / 30
put(pop(), sec["cache"], -18)
for k in range(1, 5):
    put(chime(1320), sec["cache"] + k * 11 / 30 + 0.1, -35, 0.1)

# Bars falling, needle swing
put(whoosh(0.5)[::-1], sec["fewer"], -28)
put(riser(0.38), sec["faster"] - 0.34, -27)
put(chime(990), sec["faster"], -25)

# Warning
put(pop(500, 180, 0.14), w(27.55), -16)

# Typing "sudo apt install redis"
for k in range(22):
    put(tick(2600 + rng.integers(-500, 500), 0.02), w(31.5) + k * 2.4 / 30, -36, 0.1)
put(pop(420, 160, 0.14), sec["install"] + 0.2, -19)

# Memory alarm
for k in range(4):
    put(alert(), w(34.3) + k * 0.42, -30)

# RAM slides in, upgrade lands
put(whoosh(0.5), w(36.0), -22, 0.4)
put(chime(660), sec["up_8gb"] + 0.05, -26)
put(chime(1760), sec["lessmem"], -31)
put(whoosh(0.4), sec["cachemore"], -30)

# CPU heat
put(riser(0.9), sec["cpu"], -27)
for k in range(5):
    put(alert(), w(47.0) + k * 0.5, -36)

# Checks and answers
for k in ["a1", "a2", "a3"]:
    put(chime(880), sec[k], -24)
    put(pop(), sec[k], -26)
for k in ["r1", "r2", "r3"]:
    put(pop(520, 260, 0.07), sec[k], -26, -0.2)
for i, k in enumerate(["o1", "o2", "o3", "o4"]):
    put(chime(740 * 2 ** (i * 2 / 12)), sec[k], -26, 0.15)
for i, k in enumerate(["f1", "f2", "f3"]):
    put(chime(660 * 2 ** (i * 4 / 12)), sec[k], -25)
for k in ["eq1", "eq2"]:
    put(pop(320, 130, 0.14), sec[k] - 0.2, -18)

# Reverb tail on the SFX bus
ir_n = int(0.75 * SR)
ir = rng.normal(0, 1, ir_n) * np.exp(-np.arange(ir_n) / SR / 0.16)
ir = lp(ir, 5000)
ir /= np.sqrt((ir ** 2).sum())
wetL = fftconvolve(L, ir)[:N]
wetR = fftconvolve(R, ir[::-1] * 0 + np.roll(ir, 241))[:N]
sfxL, sfxR = L + wetL * 0.32, R + wetR * 0.32

# Voice
subprocess.run("ffmpeg -v error -y -i ../assets/voice.mp3 -ar 48000 -ac 1 -c:a pcm_s16le voice48.wav".split(), check=True)
vf = wave.open("voice48.wav")
v = np.frombuffer(vf.readframes(vf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
v = np.pad(v, (0, max(0, N - len(v))))[:N]

# Low bed: dark drone that breathes, ducked under speech, tracks each section's mood.
t = np.arange(N) / SR
chord = [55.0, 82.41, 110.0, 130.81, 164.81]
bed = sum(np.sin(2 * np.pi * f * t + i) * (0.55 + 0.45 * np.sin(2 * np.pi * (0.03 + i * 0.013) * t + i)) / (1 + i * 0.5) for i, f in enumerate(chord))
air = bp(rng.normal(0, 1, N), 300, 1400) * 0.25
bed = lp(bed + air, 900)
bed /= np.abs(bed).max()
env = lp(np.abs(v), 4)
env = np.clip(env / (env.max() + 1e-9) * 3, 0, 1)
duck = 10 ** (-7 * env / 20)
fade = np.minimum(1, t / 1.2) * np.minimum(1, np.maximum(0, DUR - t) / 1.0)
tension = np.ones(N)
for a, b, lvl in [(w(34.2), w(36.0), 1.5), (w(45.7), w(50.6), 1.5), (w(67.9), w(75), 1.2), (w(78.8), DUR, 1.45)]:
    tension[int(a * SR) : int(b * SR)] = lvl
tension = lp(tension, 3)
bed = bed * duck * fade * tension * 10 ** (-27 / 20)

UNDER = 0.72
mixL = v * 0.92 + (sfxL + bed) * UNDER
mixR = v * 0.92 + (sfxR + bed) * UNDER
st = np.stack([mixL, mixR], 1)
pk = np.abs(st).max()
print("pre-limit peak", round(float(pk), 3))
st = st / max(1.0, pk / 0.97)
pcm = (st * 32767).astype(np.int16)
with wave.open("mix_raw.wav", "wb") as o:
    o.setnchannels(2)
    o.setsampwidth(2)
    o.setframerate(SR)
    o.writeframes(pcm.tobytes())

# Instagram-level loudness: two-pass EBU R128
r = subprocess.run("ffmpeg -hide_banner -i mix_raw.wav -af loudnorm=I=-14:TP=-1.2:LRA=9:print_format=json -f null -".split(), capture_output=True, text=True)
js = json.loads(r.stderr[r.stderr.rindex("{") : r.stderr.rindex("}") + 1])
af = (
    f"loudnorm=I=-14:TP=-1.2:LRA=9:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
    f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true"
)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "mix_raw.wav", "-af", af, "-ar", "48000", "-c:a", "pcm_s16le", "../video/public/mix.wav"], check=True)
print("measured", js["input_i"], "LUFS ->", js["output_i"] if "output_i" in js else "-14 target")
