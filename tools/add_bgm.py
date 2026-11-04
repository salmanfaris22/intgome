"""add_bgm.py N...: lay the soft background music (source/bgm/bgm_music.wav = music stem of IG reel DfKFK7RJdjl,
split with demucs) under exports/dayNN_*_v2.mp4, ~17 dB under the voice (ref reel ratio), fade in/out, limiter.
Video is copied untouched. Overwrites v2 in place (+ Desktop copy)."""
import os, glob, subprocess, sys, shutil, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BGM = f'{ROOT}/source/bgm/bgm_music.wav'
DESK = os.path.expanduser('~/Desktop/30-day-series')
BGM_DB = float(os.environ.get('BGM_DB', '-37'))   # target integrated LUFS of the music alone
for n in map(int, sys.argv[1:]):
    src = glob.glob(f'{ROOT}/exports/day{n:02d}_*_v2.mp4')
    if not src: print(n, 'no v2'); continue
    src = src[0]; tmp = src.replace('.mp4', '.bgm.mp4')
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]))
    fc = (f'[1:a]atrim=0:{dur:.3f},loudnorm=I={BGM_DB}:TP=-6:LRA=7,aformat=sample_rates=48000:channel_layouts=stereo,'
          f'afade=t=in:d=0.4,afade=t=out:st={max(0, dur-2):.3f}:d=2[m];'
          f'[0:a]aformat=sample_rates=48000:channel_layouts=stereo[v];'
          f'[v][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89:level=false[a]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-stream_loop', '-1', '-i', BGM, '-filter_complex', fc,
        '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', tmp], check=True)
    os.replace(tmp, src); shutil.copy(src, DESK)
    print(n, 'bgm ->', os.path.basename(src))
