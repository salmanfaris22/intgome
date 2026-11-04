"""Write engine/src/reels/index.ts from every reel that has spec + captions + lipsync."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = f'{ROOT}/engine/src/reels'
ids = sorted(d for d in os.listdir(src) if d.startswith('d') and all(os.path.exists(f'{src}/{d}/{x}') for x in ('spec.json', 'captions.json', 'lipsync.json')))
lines = ["import type {ReelData, Spec, Captions, Lip} from '../engine/types';"]
for d in ids:
    lines += [f"import {d}s from './{d}/spec.json';", f"import {d}c from './{d}/captions.json';", f"import {d}l from './{d}/lipsync.json';"]
lines.append('')
lines.append('const mk = (s: unknown, c: unknown, l: unknown): ReelData => {')
lines.append('  const spec = s as Spec & {tail?: number};')
lines.append('  const lip = l as Lip;')
lines.append('  return {spec, captions: c as Captions, lip, frames: lip.open.length + (spec.tail ?? 45)};')
lines.append('};')
lines.append('')
lines.append('export const REELS: Record<string, ReelData> = {')
for d in ids:
    lines.append(f"  {d}: mk({d}s, {d}c, {d}l),")
lines.append('};')
open(f'{src}/index.ts', 'w').write('\n'.join(lines) + '\n')
print('registered', ids)
