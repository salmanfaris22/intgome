import json, wave, numpy as np, mlx_whisper, sys
w=wave.open('../assets/voice.wav'); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
from scipy.signal import resample_poly
x16=resample_poly(x,16000,sr).astype(np.float32)
chunks=json.load(open('chunks.json'))
res=[]
for i,(a,b) in enumerate(chunks):
    seg=x16[max(0,int((a-0.1)*16000)):int((b+0.1)*16000)]
    seg=np.concatenate([np.zeros(1600,np.float32),seg,np.zeros(1600,np.float32)])
    r=mlx_whisper.transcribe(seg,path_or_hf_repo='mlx-community/whisper-large-v3-turbo',language='ml',word_timestamps=False,condition_on_previous_text=False,temperature=0.0,verbose=None)
    t=r['text'].strip()
    res.append({'i':i,'a':a,'b':b,'text':t})
    print(f'{i:2d} {a:6.2f}-{b:6.2f} {t[:90]}',flush=True)
json.dump(res,open('chunk_asr.json','w'),ensure_ascii=False,indent=0)
