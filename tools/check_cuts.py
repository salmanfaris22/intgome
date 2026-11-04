import json, subprocess, numpy as np, mlx_whisper
c=json.load(open('../series/cuts.json')); cache={}
for o in c:
    f='../'+o['file']
    if f not in cache: cache[f]=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True).stdout,dtype=np.float32)
    a=cache[f]
    head=a[int(o['start']*16000):int((o['start']+2.6)*16000)]
    tail=a[int((o['end']-2.6)*16000):int(o['end']*16000)]
    tr=lambda s: mlx_whisper.transcribe(np.concatenate([np.zeros(3200,np.float32),s,np.zeros(3200,np.float32)]),path_or_hf_repo='mlx-community/whisper-large-v3-turbo',language='en',condition_on_previous_text=False,temperature=0.0)['text'].strip()
    print(f"D{o['n']:02d} {o['dur']:5.1f}s | {tr(head)[:48]:48s} | ...{tr(tail)[-44:]}",flush=True)
