import json, wave, numpy as np, mlx_whisper, sys
from scipy.signal import resample_poly
model=sys.argv[1]; out=sys.argv[2]
w=wave.open('../assets/voice.wav'); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
x16=resample_poly(x,16000,sr).astype(np.float32)
chunks=json.load(open('chunks.json'))
res=[]
for i,(a,b) in enumerate(chunks):
    seg=x16[max(0,int((a-0.12)*16000)):int((b+0.12)*16000)]
    seg=np.concatenate([np.zeros(3200,np.float32),seg,np.zeros(3200,np.float32)])
    r=mlx_whisper.transcribe(seg,path_or_hf_repo=model,language='ml',word_timestamps=False,condition_on_previous_text=False,
        temperature=(0.0,0.2,0.4,0.6,0.8,1.0),compression_ratio_threshold=1.6,logprob_threshold=-1.0,no_speech_threshold=None,verbose=None)
    t=r['text'].strip()
    res.append({'i':i,'a':a,'b':b,'text':t})
    print(f'{i:2d} {a:6.2f}-{b:6.2f} {t[:110]}',flush=True)
json.dump(res,open(out,'w'),ensure_ascii=False,indent=0)
