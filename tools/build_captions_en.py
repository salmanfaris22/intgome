"""English take: captions + time map from whisper_en.json word timings.

Each line is one on-screen page. Tokens must match the transcript word for word (checked).
  *word   serif accent     ^word   pill     a~b   one caption word covering two spoken words
  {id}    frame mark for scenes + SFX
  @12.34  this word starts what began at 12.34 s in the script timeline (first voice take)
"""
import json, re, wave

import numpy as np

FPS = 30
TAIL = 0.8  # seconds held on the end card

LINES = """
We@0 need to handle
^more~users{users}
on a ^2GB{gb2} RAM server
So@4.62 what's the
*better *solution?
Should we add ^Redis@6.41
or upgrade@7.56 ^RAM
from 2GB to *8GB?{q_8gb}
Which@11.2 one will help us
handle ^more~users?
First@14.15 *Redis
When@15.44 our ^application
receives *repeated{again1} requests
for the same *data
instead@18.91 of querying
^MongoDB every single time
we@21.69 can use ^Redis{cache} *caching
This@23.13 reduces ^repeated{fewer}
^database~queries
improves@25.6 ^API
*response{faster} times
^But@27.48 here's something
*important
^Redis@29.18 also requires *RAM
If@31.49 we *install Redis
on the same ^2GB server{install}
^memory~usage@34.26 will increase
*even *more{more}
Now@36.11 let's consider a
^RAM~upgrade
If@37.67 we upgrade
from 2GB to *8GB{up_8gb}
our@40.26 application gets
^more~memory
We@42.23 can reduce
^memory~pressure{lessmem}
and@43.69 ^cache{cachemore} *more *data
But@45.72 if the ^CPU{cpu}
is the *bottleneck
increasing@47.86 ^RAM alone
won't solve the *problem
So@50.74 what's the *best{best} *choice?
If@52.55{r1} ^database~requests
are the problem
*Redis@54.38{a1}
If@55.03{r2} ^memory is the problem
*upgrade{a2} *RAM
If@57.27{r3} ^CPU is the bottleneck
*more{a3} *CPU *power
But@60.18 to handle ^more~users
^these~alone are
*not{notenough} *enough
Proper@63.49 *optimization{o1}
Database@64.75 *indexing{o2}
*Caching@66.01{o3}
Horizontal@66.63 *scaling{o4}
*Remember@67.94
^more~RAM@68.88 doesn't
automatically mean
more *users{eq1}
^Redis@72.05 doesn't mean
unlimited@73.31 *performance{eq2}
Right@75.16 *optimization{f1}
Right@76.42 *resources{f2}
Real *load~testing{f3}
Don't@78.8 guess{guess}
Test@79.69{test} your server
"""

r = json.load(open("whisper_en.json"))
spoken = [w for s in r["segments"] for w in s["words"]]
norm = lambda t: re.sub(r"[^a-z0-9']", "", t.lower().replace("’", "'"))


def voice_islands(path="../assets/voice.wav", step=0.005):
    """Where the voice is actually sounding: (start, end) seconds, tiny dips merged and blips dropped."""
    wav = wave.open(path)
    sr = wav.getframerate()
    v = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    hop = int(sr * step)
    env = np.sqrt(np.convolve(v ** 2, np.ones(hop * 2) / (hop * 2), "same"))[::hop]
    db = 20 * np.log10(env + 1e-7)
    on = db > np.percentile(db, 10) + 14
    edges = np.flatnonzero(np.diff(np.r_[0, on.astype(np.int8), 0]))
    merged = []
    for a, b in zip(edges[::2], edges[1::2]):
        if merged and a - merged[-1][1] < 12:
            merged[-1][1] = b
        else:
            merged.append([a, b])
    return [(a * step, b * step) for a, b in merged if b - a >= 8]


# Whisper counts the silence before a phrase as part of its first word, up to 450 ms early here.
# When a word "starts" in silence, move the start to where the voice really begins.
islands = voice_islands()
moved = []
for w in spoken:
    # A start inside the last 120 ms of an island is only the previous word's tail dying away.
    if any(a <= w["start"] < b - 0.12 for a, b in islands):
        continue
    onset = next((a for a, _ in islands if a > w["start"]), None)
    if onset is not None and onset < w["end"] - 0.03:
        moved.append(onset - w["start"])
        w["start"] = onset
print(f"snapped {len(moved)} word starts to the voice, largest {max(moved) * 1000:.0f} ms")

pages, marks, knots = [], {}, [[0.0, 0.0]]
i = 0
for line in LINES.strip().splitlines():
    items = []
    for tok in line.split():
        anchor = re.search(r"@([\d.]+)", tok)
        mark = re.search(r"\{(\w+)\}", tok)
        tok = re.sub(r"@[\d.]+|\{\w+\}", "", tok)
        kind = "s" if tok[0] == "*" else "p" if tok[0] == "^" else "b"
        tok = tok.lstrip("*^")
        parts = tok.split("~")
        first = spoken[i]
        for part in parts:
            got = spoken[i]["word"]
            if norm(part) != norm(got):
                raise SystemExit(f"caption word {part!r} != spoken {got!r} at {spoken[i]['start']:.2f}")
            i += 1
        last = spoken[i - 1]
        # Captions read cleaner without commas and full stops; keep question marks.
        text = " ".join(parts).rstrip(".,")
        if last["word"].strip().endswith("?") and not text.endswith("?"):
            text += "?"
        s, e = round(first["start"] * FPS), round(last["end"] * FPS)
        items.append({"t": text, "k": kind, "s": s, "e": max(e, s + 3)})
        if mark:
            marks[mark.group(1)] = s
        if anchor and float(anchor.group(1)) > 0:
            knots.append([float(anchor.group(1)), round(first["start"], 2)])
    pages.append({"words": items})
if i != len(spoken):
    raise SystemExit(f"{len(spoken) - i} spoken words have no caption")

duration = 80.1175
knots.append([80.85, duration])
total = int(round((duration + TAIL) * FPS))

for p in pages:
    p["from"] = p["words"][0]["s"] - 2
for n, p in enumerate(pages):
    nxt = pages[n + 1]["from"] if n + 1 < len(pages) else total
    p["to"] = min(nxt, p["words"][-1]["e"] + 12)
    for j, w in enumerate(p["words"]):
        w["a"] = p["words"][j + 1]["s"] if j + 1 < len(p["words"]) else p["to"]

for a, b in zip(knots, knots[1:]):
    assert b[0] > a[0] and b[1] >= a[1], (a, b)

json.dump({"pages": pages, "marks": marks}, open("../video/src/data/captions.json", "w"), ensure_ascii=False, indent=0)
json.dump({"knots": knots, "total": total}, open("../video/src/data/warp.json", "w"))
print("pages", len(pages), "marks", len(marks), "knots", len(knots), "total frames", total, f"= {total / FPS:.2f}s")
print("shortest page", min(p["to"] - p["from"] for p in pages), "frames")
