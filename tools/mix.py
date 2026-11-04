"""mix.py N: synthesised SFX from the reel's spec (scene types + marks) + low bed under the
voice, -14 LUFS -> engine/public/reels/dNN/mix.wav. Sound lands on the same times as the picture."""
import json, os, re, subprocess, sys, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000

def main(n):
    d = f'{ROOT}/reels/d{n:02d}'
    spec = json.load(open(f'{d}/spec.json'))
    marks = json.load(open(f'{ROOT}/engine/src/reels/d{n:02d}/captions.json'))['marks']
    rng = np.random.default_rng(n)
    vf = wave.open(f'{d}/voice48.wav')
    v = np.frombuffer(vf.readframes(vf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    lip = json.load(open(f'{d}/lipsync.json'))
    DUR = (len(lip['open']) + spec.get('tail', 45)) / 30
    N = int(DUR * SR)
    v = np.pad(v, (0, max(0, N - len(v))))[:N]

    def T(t):
        if isinstance(t, (int, float)):
            return float(t)
        m = re.match(r'^@([\w-]+)\s*([+-]\s*[\d.]+)?$', t.strip())
        return marks[m.group(1)] / 30 + (float(m.group(2).replace(' ', '')) if m.group(2) else 0)

    bp = lambda x, lo, hi: sosfilt(butter(2, [lo, hi], btype='band', fs=SR, output='sos'), x)
    lp = lambda x, hi: sosfilt(butter(2, hi, btype='low', fs=SR, output='sos'), x)

    def whoosh(dur=0.42):
        k = int(dur * SR); t = np.linspace(0, 1, k); x = rng.normal(0, 1, k)
        y = bp(x, 180, 700) * (1 - t) ** 1.2 + bp(x, 700, 2600) * np.sin(np.pi * t) * 0.8 + bp(x, 2600, 7500) * t ** 2 * 0.35
        y *= np.sin(np.pi * t ** 0.65) ** 2
        return y / (np.abs(y).max() + 1e-9)
    def tick(f=1900, dur=0.03):
        k = int(dur * SR); t = np.arange(k) / SR
        return (np.sin(2 * np.pi * f * t) * 0.7 + rng.normal(0, 0.3, k)) * np.exp(-t / 0.006)
    def pop(f0=620, f1=240, dur=0.09):
        k = int(dur * SR); t = np.arange(k) / SR
        return np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f1, k)) / SR) * np.exp(-t / 0.026)
    def boom(dur=0.95):
        k = int(dur * SR); t = np.arange(k) / SR
        x = np.sin(2 * np.pi * np.cumsum(38 + 62 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.3)
        return x + lp(rng.normal(0, 1, k), 1800) * np.exp(-t / 0.018) * 0.6
    def riser(dur):
        k = int(dur * SR); t = np.linspace(0, 1, k)
        x = np.sin(2 * np.pi * np.cumsum(170 + 900 * t ** 2.4) / SR) * 0.45 + bp(rng.normal(0, 1, k), 1500, 7000) * 0.5 * t
        return x * t ** 2.2 * np.minimum(1, (1 - t) * 60)
    def chime(f=880):
        k = int(0.42 * SR); t = np.arange(k) / SR
        x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t)
        return x * np.exp(-t / 0.11) * np.minimum(1, t / 0.002) / 1.7
    def thud():
        k = int(0.25 * SR); t = np.arange(k) / SR
        return np.sin(2 * np.pi * np.cumsum(90 + 120 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.06)

    L = np.zeros(N); R = np.zeros(N)
    def put(x, at, db, pan=0.0):
        i = int(at * SR)
        if i < 0 or i >= N: return
        x = x[:N - i]; g = 10 ** (db / 20)
        L[i:i + len(x)] += x * g * np.sqrt((1 - pan) / 2) * 1.41
        R[i:i + len(x)] += x * g * np.sqrt((1 + pan) / 2) * 1.41

    def typing(t0, chars, rate=1.7, db=-35):
        for k in range(chars):
            put(tick(2600 + rng.integers(-500, 500), 0.02), t0 + k / (rate * 30), db, 0.1 * ((k % 3) - 1))

    for h in spec.get('hits', []):
        put(boom(), T(h), -17)

    for i, s in enumerate(spec['scenes']):
        a = T(s['a']); ty = s['type']; pan = 0.3 if i % 2 else -0.3
        if i > 0 and ty != 'stamp':
            put(whoosh(0.42), a - 0.22, -23, pan)
        if ty == 'hook':
            put(riser(0.5), max(0, a), -30)
            put(thud(), a + 0.05, -16)
            kw = T(s.get('kwAt', a + 1.3))
            put(pop(900, 300, 0.12), kw, -17); put(chime(1175), kw + 0.03, -27)
        elif ty == 'prop':
            at = T(s.get('at', s['a']))
            put(whoosh(0.6)[::-1], at - 0.45, -26); put(thud(), at + 0.1, -19)
            for l in s.get('labels', []):
                put(pop(), T(l['t']), -22, -0.3 if l.get('x', 500) < 500 else 0.3)
            if 'openAt' in s:
                put(chime(988), T(s['openAt']), -25)
        elif ty in ('cards', 'icons', 'list'):
            for k, it in enumerate(s['items']):
                put(pop(560 + 60 * k, 240, 0.1), T(it['t']), -21, (-0.3, 0, 0.3)[k % 3])
                if ty == 'list':
                    put(chime(740 * 2 ** (k * 2 / 12)), T(it['t']) + 0.12, -29)
        elif ty == 'terminal':
            for ln in s['lines']:
                t0 = T(ln['t'])
                if ln.get('kind', 'out') == 'cmd':
                    typing(t0, len(ln['text']))
                elif ln.get('kind') == 'ok':
                    put(chime(1320), t0, -27)
                else:
                    put(tick(1500), t0, -31)
        elif ty == 'code':
            for ln in s['lines']:
                typing(T(ln['t']), min(40, len(ln['text'])), rate=2, db=-37)
        elif ty == 'chat':
            typing(T(s['q']['t']), min(30, len(s['q']['text'])), rate=1.4, db=-36)
            if 'ans' in s:
                put(pop(700, 350, 0.08), T(s['ans']['t']), -24)
        elif ty == 'compare':
            put(pop(), T(s['lt']), -20, -0.35); put(pop(), T(s['rt']), -20, 0.35)
            put(thud(), min(T(s['lt']), T(s['rt'])) + 0.14, -22)
        elif ty == 'stat':
            st = T(s.get('t', s['a'])); dur = s.get('dur', 24) / 30
            for k in range(10):
                put(tick(2200 + k * 90), st + k * dur / 10, -34, 0.2 if k % 2 else -0.2)
            put(chime(990), st + dur, -25)
        elif ty == 'flow':
            for k, nd in enumerate(s['nodes']):
                put(pop(600, 260, 0.1), T(nd['t']), -21, (-0.35, 0, 0.35)[k % 3])
        elif ty == 'word':
            st = T(s.get('t', s['a']))
            put(riser(0.35), st - 0.33, -28); put(boom(0.7), st, -18)
        elif ty == 'stamp':
            st = T(s.get('t', s['a']))
            put(thud(), st + 0.12, -14); put(boom(0.5), st + 0.12, -20)
        elif ty == 'bars':
            for k, it in enumerate(s['items']):
                put(whoosh(0.3), T(it['t']), -30, 0.2)
        elif ty == 'gauge':
            st = T(s.get('t', s['a'])); put(riser(0.85), st, -27); put(chime(880), st + 0.87, -27)
        elif ty == 'end':
            kw = T(s.get('kwAt', a)); put(chime(784), kw, -24); put(chime(1175), kw + 0.18, -28)
            typing(kw + 10 / 30, len(spec['keyword']), rate=0.5, db=-33)
            fo = T(s.get('followAt', a + 1.0))
            put(pop(), fo, -20); put(tick(1200, 0.04), fo + 24 / 30, -22); put(chime(1568), fo + 26 / 30, -27)

    # reverb tail on the SFX bus
    irn = int(0.75 * SR)
    ir = lp(rng.normal(0, 1, irn) * np.exp(-np.arange(irn) / SR / 0.16), 5000)
    ir /= np.sqrt((ir ** 2).sum())
    sL = L + fftconvolve(L, ir)[:N] * 0.32
    sR = R + fftconvolve(R, np.roll(ir, 241))[:N] * 0.32

    # low bed: dark drone that breathes, ducked under speech
    t = np.arange(N) / SR
    roots = [[55.0, 82.41, 110.0, 130.81, 164.81], [49.0, 73.42, 98.0, 116.54, 146.83], [58.27, 87.31, 116.54, 138.59, 174.61]][n % 3]
    bed = sum(np.sin(2 * np.pi * f * t + i) * (0.55 + 0.45 * np.sin(2 * np.pi * (0.03 + i * 0.013) * t + i)) / (1 + i * 0.5) for i, f in enumerate(roots))
    bed = lp(bed + bp(rng.normal(0, 1, N), 300, 1400) * 0.25, 900)
    bed /= np.abs(bed).max()
    env = lp(np.abs(v), 4); env = np.clip(env / (env.max() + 1e-9) * 3, 0, 1)
    fade = np.minimum(1, t / 1.2) * np.minimum(1, np.maximum(0, DUR - t) / 1.0)
    bed = bed * 10 ** (-7 * env / 20) * fade * 10 ** (-27 / 20)

    st_ = np.stack([v * 0.92 + (sL + bed) * 0.72, v * 0.92 + (sR + bed) * 0.72], 1)
    st_ /= max(1.0, np.abs(st_).max() / 0.97)
    raw = f'{d}/mix_raw.wav'
    with wave.open(raw, 'wb') as o:
        o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((st_ * 32767).astype(np.int16).tobytes())
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.2:LRA=9:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
    js = json.loads(r.stderr[r.stderr.rindex('{'):r.stderr.rindex('}') + 1])
    af = (f"loudnorm=I=-14:TP=-1.2:LRA=9:measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:"
          f"measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    out = f'{ROOT}/engine/public/reels/d{n:02d}'
    os.makedirs(out, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', af, '-ar', '48000', '-c:a', 'pcm_s16le', f'{out}/mix.wav'], check=True)
    print(f'd{n:02d} mix: {DUR:.2f}s, measured {js["input_i"]} LUFS -> -14')

if __name__ == '__main__':
    for a in sys.argv[1:]:
        main(int(a))
