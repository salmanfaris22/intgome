import json, wave, numpy as np
from scipy.signal import resample_poly
from faster_whisper import WhisperModel
from huggingface_hub import snapshot_download
p=snapshot_download("kurianbenoy/vegam-whisper-medium-ml", local_files_only=True)
m=WhisperModel(p, device="cpu", compute_type="int8")
w=wave.open('../assets/voice.wav'); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
x16=resample_poly(x,16000,sr).astype(np.float32)
chunks=json.load(open('chunks.json')); res=[]
PAD=0.2; LEAD=0.12
for i,(a,b) in enumerate(chunks):
    s0=max(0.0,a-LEAD)
    seg=x16[int(s0*16000):int((b+LEAD)*16000)]
    seg=np.concatenate([np.zeros(int(PAD*16000),np.float32),seg,np.zeros(int(PAD*16000),np.float32)])
    segs,info=m.transcribe(seg,language='ml',beam_size=5,condition_on_previous_text=False,vad_filter=False,no_speech_threshold=None,compression_ratio_threshold=1.8,word_timestamps=True)
    ws=[]
    for s in segs:
        for wd in (s.words or []):
            t0=round(wd.start-PAD+s0,3); t1=round(wd.end-PAD+s0,3)
            ws.append({'w':wd.word.strip(),'s':t0,'e':t1})
    res.append({'i':i,'a':a,'b':b,'words':ws})
    print(i,a,b,' | '.join(f"{x['w']}@{x['s']:.2f}" for x in ws),flush=True)
json.dump(res,open('asr_words.json','w'),ensure_ascii=False,indent=0)
