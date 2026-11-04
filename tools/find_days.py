import json, re, subprocess, sys, numpy as np, mlx_whisper
out={}
for f in sys.argv[1:-1]:
    r=subprocess.run(['ffmpeg','-hide_banner','-i',f,'-af','silencedetect=noise=-38dB:d=0.3','-f','null','-'],capture_output=True,text=True).stderr
    ends=[float(m) for m in re.findall(r'silence_end: ([0-9.]+)',r)]
    cands=[0.0]+ends
    x=subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True).stdout
    a=np.frombuffer(x,dtype=np.float32)
    hits=[]
    for t in cands:
        seg=a[max(0,int((t-0.05)*16000)):int((t+2.4)*16000)]
        if len(seg)<8000: continue
        seg=np.concatenate([np.zeros(3200,np.float32),seg,np.zeros(3200,np.float32)])
        res=mlx_whisper.transcribe(seg,path_or_hf_repo='mlx-community/whisper-large-v3-turbo',language='en',condition_on_previous_text=False,temperature=0.0)
        txt=res['text'].strip()
        m=re.search(r'\bDay\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b',txt,re.I)
        if m:
            hits.append([round(t,2),txt]); print(f[-50:-40],round(t,2),txt,flush=True)
    out[f]=hits
json.dump(out,open(sys.argv[-1],'w'),ensure_ascii=False,indent=0)
