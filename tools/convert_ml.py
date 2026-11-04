"""Convert thennal/whisper-medium-ml (HF PyTorch) to an mlx_whisper model folder (GPU)."""
import json, os, torch, numpy as np, mlx.core as mx
from huggingface_hub import hf_hub_download
repo = 'thennal/whisper-medium-ml'
cfg = json.load(open(hf_hub_download(repo, 'config.json')))
sd = torch.load(hf_hub_download(repo, 'pytorch_model.bin'), map_location='cpu', weights_only=True)
def remap(k):
    k = k.replace('model.', '', 1)
    for a, b in [('.layers', '.blocks'), ('.self_attn_layer_norm', '.attn_ln'), ('.self_attn', '.attn'), ('.encoder_attn_layer_norm', '.cross_attn_ln'),
                 ('.encoder_attn.', '.cross_attn.'), ('.final_layer_norm', '.mlp_ln'), ('.q_proj', '.query'), ('.k_proj', '.key'), ('.v_proj', '.value'),
                 ('.out_proj', '.out'), ('.fc1', '.mlp1'), ('.fc2', '.mlp2'), ('decoder.embed_positions.weight', 'decoder.positional_embedding'),
                 ('decoder.embed_tokens', 'decoder.token_embedding'), ('encoder.layer_norm', 'encoder.ln_post'), ('decoder.layer_norm', 'decoder.ln')]:
        k = k.replace(a, b)
    return k
out = {}
for k, v in sd.items():
    if k in ('proj_out.weight',) or 'encoder.embed_positions' in k: continue
    nk = remap(k); a = v.float().numpy()
    if nk.startswith('encoder.conv') and nk.endswith('weight'): a = a.transpose(0, 2, 1)  # torch (O,I,K) -> mlx (O,K,I)
    out[nk] = mx.array(a).astype(mx.float16)
dims = {'n_mels': cfg['num_mel_bins'], 'n_audio_ctx': cfg['max_source_positions'], 'n_audio_state': cfg['d_model'], 'n_audio_head': cfg['encoder_attention_heads'],
        'n_audio_layer': cfg['encoder_layers'], 'n_vocab': cfg['vocab_size'], 'n_text_ctx': cfg['max_target_positions'], 'n_text_state': cfg['d_model'],
        'n_text_head': cfg['decoder_attention_heads'], 'n_text_layer': cfg['decoder_layers']}
d = 'models/whisper-medium-ml-mlx'
mx.save_safetensors(f'{d}/weights.safetensors', out)
json.dump(dims, open(f'{d}/config.json', 'w'), indent=1)
print('saved', len(out), 'tensors', dims)
