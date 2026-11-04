"""Exact cut points between days: the quietest run just before each 'Day N'.
Approximate starts come from the turbo probes (pause ends / windows that begin with 'Day')."""
import json, subprocess, numpy as np
APPROX = {
 'A': [0, 39.72, 78.36, 115.54, 151.88, 188.74, 224.34, 258.58, 290.0, 323.34, 355.40, 386.44, 419.5, 450.36, 480.68],
 'B': [0, 37.47, 67.3, 102.90, 133.81, 162.26, 191.94, 223.46, 254.02, 282.70, 316.41, 347.4, 378.61, 409.20, 444.0],
}
SR = 16000
def load(f):
    return np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout,dtype=np.float32)
out = []
day = 1
for k in ['A','B']:
    f = f'source/voice_{k}.mp3'; x = load(f); dur = len(x)/SR
    hop = int(SR*0.01); n = len(x)//hop
    db = 20*np.log10(np.sqrt(np.array([np.mean(x[i*hop:(i+1)*hop]**2) for i in range(n)]))+1e-9)
    cuts = []
    for t in APPROX[k]:
        if t == 0: cuts.append(0.0); continue
        lo, hi = int((t-2.0)*100), int((t+0.8)*100)
        seg = db[lo:hi]
        # longest run under (min + 8 dB) — the breath gap between the CTA and "Day"
        thr = max(-48, seg.min() + 8)
        best=(0,lo); i=0
        while i < len(seg):
            if seg[i] < thr:
                j=i
                while j < len(seg) and seg[j] < thr: j+=1
                if j-i > best[0]: best=(j-i, lo+i)
                i=j
            else: i+=1
        run, s = best
        end = (s+run)/100
        cuts.append(round(max(s/100, end-0.08), 3))
        print(k, t, '-> gap', round(s/100,2), '..', round(end,2), f'({run*10} ms, thr {thr:.0f} dB)')
    for i, c in enumerate(cuts):
        e = cuts[i+1] if i+1 < len(cuts) else round(dur, 3)
        out.append({'n': day, 'file': f, 'start': c, 'end': e, 'dur': round(e-c, 2)})
        day += 1
json.dump(out, open('series/cuts.json','w'), indent=1)
print(len(out), 'days;', 'lengths', [o['dur'] for o in out])
