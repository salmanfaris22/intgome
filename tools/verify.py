"""verify.py N: export specs + offset of the reel's voice inside the final file (start/middle/end must be ~0 ms)."""
import glob, json, subprocess, sys
import numpy as np
from scipy.signal import fftconvolve
ROOT = __file__.rsplit('/tools/', 1)[0]
SR = 8000
def load(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32)
for a in sys.argv[1:]:
    n = int(a); f = sorted(glob.glob(f'{ROOT}/exports/day{n:02d}_*_v*.mp4'))[-1]
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_rate:format=duration,size', '-of', 'json', f], capture_output=True, text=True).stdout)
    v = [s for s in pr['streams'] if s.get('width')][0]; au = [s for s in pr['streams'] if s.get('sample_rate')][0]
    x = load(f); y = load(f'{ROOT}/reels/d{n:02d}/voice48.wav')
    offs = []
    for t0 in [2, len(y) / SR / 2, len(y) / SR - 8]:
        i = int(t0 * SR); m = int(5 * SR)
        seg = x[max(0, i - SR):i + m + SR]; ref = y[i:i + m]
        c = fftconvolve(seg, ref[::-1], mode='full')
        offs.append(round(((np.argmax(np.abs(c)) - (len(ref) - 1)) / SR - (i - max(0, i - SR)) / SR) * 1000, 1))
    lu = subprocess.run(['ffmpeg', '-hide_banner', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = lu[lu.rindex('I:'):].split('\n')[0]
    print(f"{f.rsplit('/',1)[1]}: {v['width']}x{v['height']} {v['codec_name']} {v['pix_fmt']} {v['r_frame_rate']} | {au['codec_name']} {au['sample_rate']} | {float(pr['format']['duration']):.2f}s {int(pr['format']['size'])/1e6:.1f} MB | voice offset ms {offs} | {I.strip()}")
