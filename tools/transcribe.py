import json, sys, mlx_whisper
audio, out, model = sys.argv[1], sys.argv[2], sys.argv[3]
prompt = "2GB RAM server users handle Redis MongoDB cache API response CPU bottleneck scaling load testing"
r = mlx_whisper.transcribe(audio, path_or_hf_repo=model, language="ml", task="transcribe",
    word_timestamps=True, initial_prompt=prompt, condition_on_previous_text=False, temperature=0.0)
json.dump(r, open(out,"w"), ensure_ascii=False, indent=0)
for s in r["segments"]:
    print(f'{s["start"]:6.2f} {s["end"]:6.2f} {s["text"]}')
