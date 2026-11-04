import numpy as np, wave, json
from scipy.signal import butter, sosfiltfilt
w=wave.open('../assets/voice.wav'); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
print('peak',float(np.abs(x).max()),'rms dB',float(20*np.log10(np.sqrt(np.mean(x**2)))))
# F0 median
sos=butter(4,[60,900],btype='band',fs=sr,output='sos'); y=sosfiltfilt(sos,x)
fr=int(sr*0.04); hop=int(sr*0.02); f0=[]
for i in range(0,len(y)-fr,hop):
    s=y[i:i+fr]
    if np.sqrt(np.mean(s**2))<0.03: continue
    s=s-s.mean(); c=np.correlate(s,s,'full')[fr-1:]; c=c/ (c[0]+1e-9)
    lo=int(sr/400); hi=int(sr/70); k=lo+int(np.argmax(c[lo:hi]))
    if c[k]>0.5: f0.append(sr/k)
f0=np.array(f0); print('voiced frames',len(f0),'F0 median',round(float(np.median(f0)),1),'p10',round(float(np.percentile(f0,10)),1),'p90',round(float(np.percentile(f0,90)),1))
# per-video-frame features at 30 fps for lip sync
fps=30; hopf=sr/fps; N=int(len(x)/hopf)+1; win=int(sr*0.05)
rms=np.zeros(N); cent=np.zeros(N)
freqs=np.fft.rfftfreq(win,1/sr); hann=np.hanning(win)
for n in range(N):
    c=int(n*hopf); a=max(0,c-win//2); s=x[a:a+win]
    if len(s)<win: s=np.pad(s,(0,win-len(s)))
    rms[n]=np.sqrt(np.mean(s**2))
    S=np.abs(np.fft.rfft(s*hann))+1e-9
    cent[n]=(S*freqs).sum()/S.sum()
ref=np.percentile(rms[rms>0.01],95)
op=np.clip(rms/ref,0,1)**0.7
op[rms<0.012]=0
json.dump({'fps':fps,'open':[round(float(v),3) for v in op],'bright':[round(float(np.clip((v-500)/2500,0,1)),3) for v in cent]},open('lipsync.json','w'))
print('frames',N,'mean open',round(float(op.mean()),3))
