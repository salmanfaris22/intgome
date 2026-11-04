"""prep.py N [N2 ...]: cut day N's voice from the source take, split into breath chunks,
Malayalam word ASR per chunk (vegam), lip-sync features. Output: reels/dNN/."""
import json, os, subprocess, sys, wave
import numpy as np
from scipy.signal import resample_poly
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cuts = {c['n']: c for c in json.load(open(f'{ROOT}/series/cuts.json'))}

def wav_read(p):
    w = wave.open(p); sr = w.getframerate()
    return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768, sr

def cut(n, d):
    c = cuts[n]; src = f"{ROOT}/{c['file']}"
    dur = c['end'] - c['start']
    af = f"atrim=start={c['start']:.3f}:end={c['end']:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={dur-0.06:.3f}:d=0.06"
    for name, sr in [('voice.wav', 44100), ('voice48.wav', 48000)]:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', af, '-ac', '1', '-ar', str(sr), '-c:a', 'pcm_s16le', f'{d}/{name}'], check=True)

def chunks(d):
    x, sr = wav_read(f'{d}/voice.wav')
    hop = int(sr * 0.01); win = int(sr * 0.03); n = (len(x) - win) // hop
    db = 20 * np.log10(np.array([np.sqrt(np.mean(x[i*hop:i*hop+win]**2) + 1e-12) for i in range(n)]) + 1e-9)
    sil = db < -42; runs = []; i = 0
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]: j += 1
            if (j - i) * 0.01 >= 0.13: runs.append((i * 0.01, j * 0.01))
            i = j
        else: i += 1
    out = []; t = 0
    for a, b in runs:
        if a > t: out.append((round(t, 2), round(a, 2)))
        t = b
    if t < n * 0.01: out.append((round(t, 2), round(n * 0.01, 2)))
    out = [c for c in out if c[1] - c[0] > 0.08]
    json.dump(out, open(f'{d}/chunks.json', 'w'))
    return out

def trim_repeats(ws):
    """Whisper sometimes loops at the end of a chunk: keep one copy of a repeated n-gram run."""
    t = [w['w'] for w in ws]
    for i in range(len(t)):
        for n in (1, 2, 3, 4):
            if i + 3 * n <= len(t) and t[i:i+n] == t[i+n:i+2*n] == t[i+2*n:i+3*n]:
                return ws[:i + n]
    return ws

def asr(d, ch):
    import mlx_whisper
    x, sr = wav_read(f'{d}/voice.wav')
    x16 = resample_poly(x, 16000, sr).astype(np.float32)
    PAD = 0.2; LEAD = 0.12; res = []
    for i, (a, b) in enumerate(ch):
        s0 = max(0.0, a - LEAD)
        seg = np.concatenate([np.zeros(int(PAD * 16000), np.float32), x16[int(s0 * 16000):int((b + LEAD) * 16000)], np.zeros(int(PAD * 16000), np.float32)])
        r = mlx_whisper.transcribe(seg, path_or_hf_repo=f'{ROOT}/tools/models/whisper-medium-ml-mlx', language='ml', word_timestamps=True,
                                   condition_on_previous_text=False, temperature=(0.0, 0.2), compression_ratio_threshold=2.2, fp16=True,
                                   sample_len=int((b - a) * 40 + 24))
        ws = []
        for s_ in r['segments']:
            for wd in s_.get('words', []):
                st = wd['start'] - PAD + s0
                if st > b + 0.05: continue
                ws.append({'w': wd['word'].strip(), 's': round(st, 3), 'e': round(min(wd['end'] - PAD + s0, b + 0.05), 3)})
        res.append({'i': i, 'a': a, 'b': b, 'words': trim_repeats([w for w in ws if w['w']])})
    json.dump(res, open(f'{d}/asr_words.json', 'w'), ensure_ascii=False, indent=0)
    with open(f'{d}/asr.txt', 'w') as fh:
        for r in res:
            fh.write(f"{r['i']:2d} {r['a']:6.2f}-{r['b']:6.2f} " + ' '.join(w['w'] for w in r['words']) + '\n')

def lips(d):
    x, sr = wav_read(f'{d}/voice.wav')
    fps = 30; hopf = sr / fps; N = int(len(x) / hopf) + 1; win = int(sr * 0.05)
    rms = np.zeros(N); cent = np.zeros(N)
    freqs = np.fft.rfftfreq(win, 1 / sr); hann = np.hanning(win)
    for k in range(N):
        c = int(k * hopf); a = max(0, c - win // 2); s = x[a:a + win]
        if len(s) < win: s = np.pad(s, (0, win - len(s)))
        rms[k] = np.sqrt(np.mean(s ** 2))
        S = np.abs(np.fft.rfft(s * hann)) + 1e-9
        cent[k] = (S * freqs).sum() / S.sum()
    ref = np.percentile(rms[rms > 0.01], 95)
    op = np.clip(rms / ref, 0, 1) ** 0.7; op[rms < 0.012] = 0
    json.dump({'fps': fps, 'open': [round(float(v), 3) for v in op], 'bright': [round(float(np.clip((v - 500) / 2500, 0, 1)), 3) for v in cent]}, open(f'{d}/lipsync.json', 'w'))

for n in [int(a) for a in sys.argv[1:]]:
    d = f'{ROOT}/reels/d{n:02d}'; os.makedirs(d, exist_ok=True)
    cut(n, d); ch = chunks(d); lips(d)
    if not os.path.exists(f'{d}/asr_words.json'): asr(d, ch)
    print(f'd{n:02d} done: {len(ch)} chunks', flush=True)
