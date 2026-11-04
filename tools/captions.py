"""captions.py N: reels/dNN/text.txt + asr_words.json -> engine/src/reels/dNN/captions.json
(+ copies spec.json and lipsync.json into the engine).

text.txt: one line = one caption page. Lines starting with # are comments.
  word        bold (b)          *word   accent (s)         [word]  emphasis (p)
  a_b         one token shown as "a b"
  word@id     sets mark `id` at this word (scenes / SFX use '@id')
  word{3}     this token covers 3 ASR words (English terms the ASR spells as several)
Alignment is automatic (DP over the ASR words), so lines don't need to match chunks.
"""
import json, os, re, shutil, sys, unicodedata
from difflib import SequenceMatcher

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30

def norm(s):
    s = unicodedata.normalize('NFC', s.lower())
    return re.sub(r'[\s‌‍.,!?;:"\'()\-]', '', s)

def parse(path):
    pages = []
    for raw in open(path, encoding='utf-8'):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        toks = []
        for tok in line.split():
            k = 'b'
            if tok.startswith('*'):
                k, tok = 's', tok[1:]
            m = re.match(r'^\[(.+?)\](.*)$', tok)
            if m:
                k, tok = 'p', m.group(1) + m.group(2)
            mark = None
            m = re.search(r'@([\w-]+)', tok)
            if m:
                mark = m.group(1)
                tok = tok[:m.start()] + tok[m.end():]
            units = None
            m = re.search(r'\{(\d+)\}', tok)
            if m:
                units = int(m.group(1))
                tok = tok[:m.start()] + tok[m.end():]
            text = tok.replace('_', ' ')
            parts = [p for p in text.split(' ') if p]
            toks.append({'t': text, 'k': k, 'mark': mark, 'parts': parts, 'units': units or len(parts)})
        pages.append(toks)
    return pages

def align(units, asr):
    """Needleman-Wunsch: units (strings) vs ASR words. Returns asr index per unit or None."""
    n, m = len(units), len(asr)
    GAP = -0.45
    def sc(i, j):
        a, b = norm(units[i]), norm(asr[j]['w'])
        if not a or not b:
            return -0.2
        r = SequenceMatcher(None, a, b).ratio()
        return 2.2 * r - 0.7 if r > 0 else -0.25  # mismatch is cheaper than two gaps
    D = [[0.0] * (m + 1) for _ in range(n + 1)]
    P = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        D[i][0] = i * GAP; P[i][0] = 1
    for j in range(1, m + 1):
        D[0][j] = j * GAP; P[0][j] = 2
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            opts = [(D[i-1][j-1] + sc(i-1, j-1), 0), (D[i-1][j] + GAP, 1), (D[i][j-1] + GAP, 2)]
            D[i][j], P[i][j] = max(opts)
    res = [None] * n
    i, j = n, m
    while i > 0 or j > 0:
        p = P[i][j] if i > 0 and j > 0 else (1 if i > 0 else 2)
        if p == 0:
            res[i-1] = j-1; i -= 1; j -= 1
        elif p == 1:
            i -= 1
        else:
            j -= 1
    return res

def main(n):
    d = f'{ROOT}/reels/d{n:02d}'
    pages = parse(f'{d}/text.txt')
    chunks = json.load(open(f'{d}/asr_words.json'))
    asr = []
    for c in chunks:
        ws = c['words']
        for k, w in enumerate(ws):
            s, e = max(c['a'], w['s']), min(c['b'], max(w['e'], w['s'] + 0.06))
            if k == 0:
                s = c['a']  # first word: trust the waveform edge
            if k == len(ws) - 1:
                e = c['b']
            asr.append({'w': w['w'], 's': s, 'e': max(e, s + 0.05)})
    # unit list
    units, owner = [], []
    toks = [t for p in pages for t in p]
    for ti, t in enumerate(toks):
        parts = t['parts']
        for u in range(t['units']):
            units.append(parts[min(u, len(parts) - 1)] if t['units'] == len(parts) else t['t'])
            owner.append(ti)
    al = align(units, asr)
    # token times
    times = [None] * len(toks)
    for ti in range(len(toks)):
        idx = [al[u] for u in range(len(units)) if owner[u] == ti and al[u] is not None]
        if idx:
            times[ti] = [asr[min(idx)]['s'], asr[max(idx)]['e']]
    # fill unmatched tokens between neighbours, by text length
    total = chunks[-1]['b']
    i = 0
    while i < len(toks):
        if times[i] is not None:
            i += 1; continue
        j = i
        while j < len(toks) and times[j] is None:
            j += 1
        lo = times[i-1][1] if i > 0 else 0.0
        hi = times[j][0] if j < len(toks) else total
        if hi <= lo:
            hi = lo + 0.12 * (j - i)
        w = [max(2, len(toks[k]['t'])) for k in range(i, j)]
        t = lo
        for k, wk in zip(range(i, j), w):
            dur = (hi - lo) * wk / sum(w)
            times[k] = [t, t + dur]; t += dur
        i = j
    # monotonic clean-up
    prev = 0.0
    for t in times:
        t[0] = max(t[0], prev); t[1] = max(t[1], t[0] + 0.08); prev = t[0] + 0.04
    # pages
    out_pages, marks, k = [], {}, 0
    for p in pages:
        words = []
        for t in p:
            s, e = times[k]; k += 1
            words.append({'t': t['t'], 'k': t['k'], 's': round(s * FPS), 'e': round(e * FPS)})
            if t['mark']:
                marks[t['mark']] = round(s * FPS)
        out_pages.append({'words': words})
    end_frame = round(total * FPS)
    for i, p in enumerate(out_pages):
        p['from'] = p['words'][0]['s'] - 2
    for i, p in enumerate(out_pages):
        last = p['words'][-1]['e']
        nxt = out_pages[i + 1]['from'] if i + 1 < len(out_pages) else end_frame + 30
        p['to'] = min(nxt, last + 12)
        for j, w in enumerate(p['words']):
            w['a'] = p['words'][j + 1]['s'] if j + 1 < len(p['words']) else p['to']
    marks['_end'] = end_frame
    dst = f'{ROOT}/engine/src/reels/d{n:02d}'
    os.makedirs(dst, exist_ok=True)
    json.dump({'pages': out_pages, 'marks': marks}, open(f'{dst}/captions.json', 'w'), ensure_ascii=False)
    shutil.copy(f'{d}/lipsync.json', f'{dst}/lipsync.json')
    if os.path.exists(f'{d}/spec.json'):
        shutil.copy(f'{d}/spec.json', f'{dst}/spec.json')
    matched = sum(1 for a in al if a is not None)
    print(f'd{n:02d}: {len(out_pages)} pages, {len(toks)} tokens, units matched {matched}/{len(units)} (asr words {len(asr)})')
    for p in out_pages:
        print('  ', f"{p['from']/30:6.2f}-{p['to']/30:6.2f}", ' '.join(f"{w['t']}@{w['s']/30:.2f}" for w in p['words']))
    print('marks', {k: round(v / 30, 2) for k, v in marks.items()})

if __name__ == '__main__':
    for a in sys.argv[1:]:
        main(int(a))
