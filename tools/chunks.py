import numpy as np, json, wave, sys
w=wave.open('../assets/voice.wav'); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
hop=int(sr*0.01); win=int(sr*0.03)
n=(len(x)-win)//hop
rms=np.array([np.sqrt(np.mean(x[i*hop:i*hop+win]**2)+1e-12) for i in range(n)])
db=20*np.log10(rms+1e-9)
thr=-42
sil=db<thr
# find silent runs >= 0.13 s
runs=[];i=0
while i<n:
    if sil[i]:
        j=i
        while j<n and sil[j]: j+=1
        if (j-i)*0.01>=0.13: runs.append((i*0.01,j*0.01))
        i=j
    else: i+=1
chunks=[];t=0
for a,b in runs:
    if a>t: chunks.append((round(t,2),round(a,2)))
    t=b
if t<n*0.01: chunks.append((round(t,2),round(n*0.01,2)))
json.dump(chunks,open('chunks.json','w'))
print(len(chunks),'chunks, total',round(n*0.01,2))
print(' '.join(f'{a:.2f}-{b:.2f}' for a,b in chunks))
