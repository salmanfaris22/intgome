"""Malayalam captions over the English take.

Takes the v1 pages (timed to the Malayalam voice) and moves every frame through the same
script -> take map the scenes use, so each phrase lands on its English equivalent.
Timing is per phrase, not per word: the two languages have different word order.
"""
import json

import numpy as np

FPS = 30

warp_data = json.load(open("../video/src/data/warp.json"))
knots = warp_data["knots"]
src = [a for a, _ in knots]
dst = [b for _, b in knots]


def warp(frame):
    return int(round(float(np.interp(frame / FPS, src, dst)) * FPS))


# page text -> word index to split at; the two-line version touched the mascot's hair
SPLIT = {"അപ്പോൾ എന്താണ് നല്ലത്?": 2}

pages = []
for p in json.load(open("captions_v1.json"))["pages"]:
    words = [{"t": w["t"], "k": w["k"], "s": warp(w["s"]), "e": warp(w["e"]), "a": warp(w["a"])} for w in p["words"]]
    cut = SPLIT.get(" ".join(w["t"] for w in words))
    start, end = warp(p["from"]), warp(p["to"])
    if cut:
        mid = words[cut]["s"] - 2
        words[cut - 1]["a"] = mid
        pages.append({"words": words[:cut], "from": start, "to": mid})
        pages.append({"words": words[cut:], "from": mid, "to": end})
    else:
        pages.append({"words": words, "from": start, "to": end})

for a, b in zip(pages, pages[1:]):
    assert a["to"] <= b["from"] + 2, (a["to"], b["from"])

json.dump({"pages": pages}, open("../video/src/data/captions_ml.json", "w"), ensure_ascii=False, indent=0)

spans = sorted((p["to"] - p["from"], " ".join(w["t"] for w in p["words"])) for p in pages)
print("pages", len(pages))
print("shortest", [(n, t) for n, t in spans[:6]])
