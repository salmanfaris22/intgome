import json, wave, numpy as np, sys
from scipy.signal import resample_poly
from faster_whisper import WhisperModel
from huggingface_hub import snapshot_download
p=snapshot_download("kurianbenoy/vegam-whisper-medium-ml", local_files_only=True)
m=WhisperModel(p, device="cpu", compute_type="int8")
w=wave.open('../assets/voice.wav'); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
x16=resample_poly(x,16000,sr).astype(np.float32)
chunks=json.load(open('chunks.json')); res=[]
for i,(a,b) in enumerate(chunks):
    seg=x16[max(0,int((a-0.12)*16000)):int((b+0.12)*16000)]
    seg=np.concatenate([np.zeros(3200,np.float32),seg,np.zeros(3200,np.float32)])
    segs,info=m.transcribe(seg,language='ml',beam_size=5,condition_on_previous_text=False,vad_filter=False,no_speech_threshold=None,compression_ratio_threshold=1.8)
    t=' '.join(s.text.strip() for s in segs)
    res.append({'i':i,'a':a,'b':b,'text':t}); print(f'{i:2d} {a:6.2f}-{b:6.2f} {t[:120]}',flush=True)
json.dump(res,open('asr_vegam.json','w'),ensure_ascii=False,indent=0)
