"""Usage: verify_sync.py <final.mp4>. Prints the offset of assets/voice.mp3 inside the file."""
import subprocess, sys
import numpy as np
from scipy.signal import fftconvolve
SR=8000
def load(p):
    r=subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True)
    return np.frombuffer(r.stdout,dtype=np.float32)
a=load(sys.argv[1]); b=load('../assets/voice.mp3')
print('final s',round(len(a)/SR,3),'voice s',round(len(b)/SR,3))
# offset of the voice inside the final file at the start, middle and end
def off(x,y):
    c=fftconvolve(x,y[::-1],mode='full'); return (np.argmax(np.abs(c))-(len(y)-1))/SR
for name,t0 in [('start',2),('middle',40),('end',72)]:
    n=int(6*SR); i=int(t0*SR)
    print(name,'offset ms',round((off(a[i-SR:i+n+SR],b[i:i+n])-1)*1000,1))
