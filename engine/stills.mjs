// node stills.mjs D01 outdir 0,60,120 ...  -> one bundle, many stills
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
const [,, id, outDir, list] = process.argv;
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), enableCaching: true});
const browserExecutable = '/Users/jeffry/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const chromiumOptions = {gl: 'angle'};
const composition = await selectComposition({serveUrl, id, browserExecutable, chromiumOptions});
for (const f of list.split(',').map(Number)) {
  try {
    await renderStill({serveUrl, composition, frame: f, output: path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`), imageFormat: 'jpeg', jpegQuality: 88, browserExecutable, chromiumOptions});
    process.stdout.write(`${f} `);
  } catch (e) {
    console.log(`\nFRAME ${f} FAILED: ${String(e.message).split('\n').slice(0, 6).join(' | ')}`);
  }
}
console.log('done');
