"""Merge the spoken-word timings with the on-screen text.

Text below is what the voice actually says (Malayalam-trained ASR, read by hand),
not the pasted script: the ElevenLabs take is a newer revision of it.

Each chunk = one breath-group from chunks.json. Each entry is a list of pages.
A word is (text, style, n, id?)  style: b bold / s serif accent / p pill
n = how many ASR words it covers. A page starting with '+' joins the previous page.
"""
import json

FPS = 30
TEXT = {
    0: [[("ഒരു", "b", 1), ("2GB", "p", 2, "gb2"), ("RAM", "b", 1)], [("server-ൽ", "b", 1), ("നിന്ന്", "b", 1)]],
    1: [[("കൂടുതൽ", "b", 1), ("users-നെ", "p", 1, "users")], [("handle", "b", 1), ("ചെയ്യണം!", "s", 1)]],
    2: [[("അപ്പോൾ", "b", 1), ("എന്താണ്", "b", 1), ("നല്ലത്?", "s", 1)]],
    3: [[("Redis", "p", 1), ("add", "b", 1), ("ആണോ?", "b", 1)]],
    4: [[("അതോ", "b", 1), ("RAM", "p", 1, "q_ram")], [("2GB-യിൽ", "b", 2), ("നിന്ന്", "b", 1)], [("8GB", "s", 2, "q_8gb"), ("ആക്കണോ?", "b", 1)]],
    5: [[("ഏതാണ്", "b", 1), ("കൂടുതൽ", "b", 1), ("users-നെ", "p", 1)], [("handle", "b", 1), ("ചെയ്യാൻ", "b", 1), ("സഹായിക്കുക?", "s", 1)]],
    6: [[("ആദ്യം", "b", 1), ("Redis!", "s", 2)]],
    7: [[("നമ്മുടെ", "b", 1), ("application-ൽ", "p", 1)], [("ഒരേ", "b", 1), ("data", "s", 1)], [("വീണ്ടും", "p", 1, "again1"), ("വീണ്ടും", "p", 1, "again2")], [("request", "b", 1), ("ചെയ്യുമ്പോൾ", "b", 1)]],
    8: [[("ഓരോ", "b", 1), ("തവണയും", "b", 1)], [("MongoDB-യിൽ", "p", 2), ("query", "b", 1)], [("അയക്കുന്നതിനു", "b", 1), ("പകരം", "s", 1)]],
    9: [[("Redis", "p", 2, "cache"), ("cache", "s", 1), ("ഉപയോഗിക്കാം", "b", 1)]],
    10: [[("അതിലൂടെ", "b", 1), ("repeated", "p", 1)], [("database", "b", 1), ("queries", "b", 1), ("കുറയ്ക്കാം", "s", 1, "fewer")]],
    11: [[("API", "p", 3), ("response", "b", 1)], [("വേഗത്തിലാക്കാം!", "s", 1, "faster")]],
    12: [[("പക്ഷേ", "p", 1), ("ഒരു", "b", 1), ("കാര്യം", "b", 1)], [("ശ്രദ്ധിക്കണം", "s", 1)]],
    13: [[("Redis-നും", "p", 1), ("RAM", "b", 1)], [("ആവശ്യമാണ്", "s", 1)]],
    14: [[("അതേ", "b", 1)]],
    15: [["+", ("2GB", "b", 2), ("server-ൽ", "b", 1)], [("Redis", "p", 1), ("കൂടി", "b", 1)], [("install", "s", 1, "install"), ("ചെയ്താൽ", "b", 1)]],
    16: [[("Memory usage", "p", 2), ("വീണ്ടും", "b", 1), ("കൂടും!", "s", 1, "more")]],
    17: [[("ഇനി", "b", 1), ("RAM upgrade", "p", 2), ("നോക്കാം", "b", 1)]],
    18: [[("2GB-യിൽ", "b", 2), ("നിന്ന്", "b", 1)], [("8GB", "s", 2, "up_8gb"), ("ആക്കിയാൽ", "b", 1)]],
    19: [[("Application-ന്", "b", 1), ("കൂടുതൽ", "b", 1)], [("memory", "p", 1), ("ലഭിക്കും", "s", 1)]],
    20: [[("Memory shortage", "p", 2), ("കുറയ്ക്കാം", "s", 1, "lessmem")]],
    21: [[("കൂടുതൽ", "b", 1), ("data", "s", 1)], [("cache", "p", 1, "cachemore"), ("ചെയ്യാനും", "b", 1), ("കഴിയും", "b", 1)]],
    22: [[("പക്ഷേ", "b", 1), ("CPU", "p", 3, "cpu")], [("bottleneck", "s", 1), ("ആണെങ്കിൽ", "b", 1)]],
    23: [[("RAM", "p", 1), ("കൂട്ടിയതുകൊണ്ടു", "b", 1)], [("മാത്രം", "b", 1), ("പ്രശ്നം", "b", 1)], [("പരിഹരിക്കാനാവില്ല", "s", 1)]],
    24: [[("അപ്പോൾ", "b", 1)]],
    25: [["+", ("ഏതാണ്", "b", 1), ("best?", "s", 1, "best")]],
    26: [[("Database requests", "p", 2, "r1"), ("കൂടുതലാണെങ്കിൽ", "b", 1)]],
    27: [[("Redis!", "s", 2, "a1")]],
    28: [[("Memory shortage", "p", 2, "r2"), ("ആണെങ്കിൽ", "b", 1)], [("RAM upgrade!", "s", 2, "a2")]],
    29: [[("CPU bottleneck", "p", 2, "r3"), ("ആണെങ്കിൽ", "b", 1)], [("More CPU power!", "s", 3, "a3")]],
    30: [[("പക്ഷേ", "b", 1)]],
    31: [["+", ("കൂടുതൽ", "b", 1), ("users-നെ", "b", 1)], [("handle", "b", 1), ("ചെയ്യാൻ", "b", 1)], [("ഇവ മാത്രം", "p", 2), ("പോരാ!", "s", 1, "notenough")]],
    32: [[("Proper", "b", 1), ("optimization", "s", 1, "o1")]],
    33: [[("Database", "b", 1), ("indexing", "s", 1, "o2")]],
    34: [[("Caching", "s", 1, "o3")]],
    35: [[("Horizontal", "b", 1), ("scaling", "s", 1, "o4")]],
    36: [[("ഓർക്കുക", "s", 1)]],
    37: [[("കൂടുതൽ", "b", 1), ("RAM", "p", 1)], [("എന്നത്", "b", 1), ("മാത്രം", "b", 1)], [("കൂടുതൽ", "b", 1), ("users", "s", 1, "eq1"), ("എന്നല്ല", "b", 1)]],
    38: [[("Redis", "p", 1), ("എന്നത്", "b", 1), ("മാത്രം", "b", 1)]],
    39: [[("Unlimited", "b", 1), ("performance", "s", 1, "eq2")], [("എന്നുമല്ല", "b", 1)]],
    40: [[("Right", "b", 1), ("optimization", "s", 1, "f1")]],
    41: [[("Right", "b", 1), ("resources", "s", 1, "f2")], [("Real", "b", 1), ("load testing", "s", 2, "f3")]],
    42: [[("Don't", "b", 1), ("guess", "s", 1, "guess")]],
    43: [[("Test", "p", 1, "test"), ("your", "b", 1), ("server", "s", 1)]],
}

chunks = json.load(open("chunks.json"))
asr = json.load(open("asr_words.json"))

pages, marks, report = [], {}, []
for c in asr:
    i, a, b, aw = c["i"], c["a"], c["b"], c["words"]
    groups = TEXT[i]
    flat = []
    for g in groups:
        for w in g:
            if w != "+":
                flat.append(w)
    need = sum(w[2] for w in flat)
    times = []
    # Whisper can repeat junk after a phrase ends (seen on chunk 5): keep the real words.
    if len(aw) > need:
        aw = aw[:need]
    if len(aw) == need and need > 0:
        k = 0
        for w in flat:
            times.append((aw[k]["s"], aw[k + w[2] - 1]["e"]))
            k += w[2]
        how = "asr"
    else:
        # ASR merged or split words here: share the phrase by written length.
        weight = [max(2, len(w[0])) for w in flat]
        tot = sum(weight)
        t = a
        for wg in weight:
            d = (b - a) * wg / tot
            times.append((t, t + d))
            t += d
        how = "prop"
    # Trust the waveform for phrase edges, the ASR for the inside.
    times[0] = (a, times[0][1])
    times[-1] = (times[-1][0], b)
    fixed, prev = [], a
    for s, e in times:
        s = max(prev, min(s, b - 0.03))
        e = max(s + 0.08, min(e, b))
        fixed.append((s, e))
        prev = s + 0.04
    report.append((i, how, len(aw), need))

    k = 0
    for g in groups:
        join = g[0] == "+"
        words = [w for w in g if w != "+"]
        items = []
        for w in words:
            s, e = fixed[k]
            k += 1
            items.append({"t": w[0], "k": w[1], "s": round(s * FPS), "e": round(e * FPS)})
            if len(w) > 3:
                marks[w[3]] = round(s * FPS)
        if join and pages:
            pages[-1]["words"] += items
        else:
            pages.append({"words": items, "chunk": i})

# Page windows: hold until the next page, but drop out during real pauses.
for p in pages:
    p["from"] = p["words"][0]["s"] - 2
for n, p in enumerate(pages):
    last = p["words"][-1]["e"]
    nxt = pages[n + 1]["from"] if n + 1 < len(pages) else 2450
    p["to"] = min(nxt, last + 12)
    # a word stays "active" until the next word in its page starts
    for j, w in enumerate(p["words"]):
        w["a"] = p["words"][j + 1]["s"] if j + 1 < len(p["words"]) else p["to"]

out = {"pages": pages, "marks": marks}
json.dump(out, open("../video/src/data/captions.json", "w"), ensure_ascii=False, indent=0)
print("pages", len(pages), "marks", len(marks))
print("fallback to length-based timing:", [(i, n, need) for i, how, n, need in report if how == "prop"])
