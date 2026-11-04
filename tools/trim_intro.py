"""trim_intro.py N...: cut the hook intro (Day N / title / Secret keyword X) off exports/dayNN_*_v1.mp4
-> exports/dayNN_*_v2.mp4 (+ copy to ~/Desktop/30-day-series). Cut = end of scene[0] (hook), frame-exact."""
import json, os, glob, subprocess, sys, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESK = os.path.expanduser('~/Desktop/30-day-series')
for n in map(int, sys.argv[1:]):
    s = json.load(open(f'{ROOT}/reels/d{n:02d}/spec.json'))
    assert s['scenes'][0]['type'] == 'hook'
    m = json.load(open(f'{ROOT}/engine/src/reels/d{n:02d}/captions.json'))['marks']
    nxt = min(v for v in m.values() if v > m['kw'])          # first spoken word after the keyword
    f = round(s['scenes'][0]['b'] * 30) + 1                    # +1 frame skips the hook's last fade frame
    if f > nxt - 2: f -= 1                                     # never clip the first word
    cut = f / 30
    src = glob.glob(f'{ROOT}/exports/day{n:02d}_*_v1.mp4')
    if not src: print(n, 'no v1 export'); continue
    dst = src[0].replace('_v1.mp4', '_v2.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src[0], '-ss', f'{cut:.4f}',
        '-vf', 'format=yuv420p', '-af', 'afade=t=in:d=0.04',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', dst], check=True)
    shutil.copy(dst, DESK)
    print(n, f'cut {cut:.2f}s ->', os.path.basename(dst))
