import json, mlx_whisper
prompt = "2GB RAM server, users, Redis, MongoDB, cache, API response, CPU bottleneck, database indexing, horizontal scaling, load testing."
r = mlx_whisper.transcribe('../assets/voice.wav', path_or_hf_repo='mlx-community/whisper-large-v3-turbo', language='en', task='transcribe',
    word_timestamps=True, initial_prompt=prompt, condition_on_previous_text=False, temperature=0.0)
json.dump(r, open('whisper_en.json','w'), ensure_ascii=False, indent=0)
print(r.get('language'))
for s in r['segments']:
    print(f"{s['start']:6.2f} {s['end']:6.2f} {s['text']}")
print('words', sum(len(s.get('words',[])) for s in r['segments']))
