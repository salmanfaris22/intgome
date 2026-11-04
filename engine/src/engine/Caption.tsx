import React from 'react';
import {Easing, interpolate} from 'remotion';
import {C, hasMl, type Pack} from '../theme';
import {CLAMP} from './ctx';
import type {CaptionPage, CaptionWord as W} from './types';

let ctx: CanvasRenderingContext2D | null = null;
const width = (txt: string, font: string) => {
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  ctx!.font = font;
  return ctx!.measureText(txt).width;
};

const stretchKw = (s?: string) => (s === '75%' ? 'condensed ' : s === '125%' ? 'expanded ' : '');
const shown = (w: W, pack: Pack) => (pack.upper && !hasMl(w.t) ? w.t.toUpperCase() : w.t);

const wordFont = (w: W, size: number, pack: Pack) => {
  const ml = hasMl(w.t);
  if (w.k === 's') {
    return ml
      ? `${pack.accentMlWeight} ${size * 0.95}px ${pack.accentMl}`
      : `${pack.accentLatinStyle} 400 ${size * (pack.accentLatinStyle === 'italic' ? 1.14 : 0.98)}px ${pack.accentLatin}`;
  }
  return ml ? `${stretchKw(pack.mlStretch)}${pack.mlWeight} ${size}px ${pack.ml}` : `${stretchKw(pack.displayStretch)}${pack.displayWeight} ${size}px ${pack.display}`;
};

const MAXW = 930;

/** Largest size where the page fits on one line, else two lines. */
const layout = (p: CaptionPage, pack: Pack) => {
  const gap = 0.3;
  const pad = (w: W) => (w.k === 'p' ? 28 : 0);
  const lineWidth = (ws: W[], size: number) => ws.reduce((sum, w) => sum + width(shown(w, pack), wordFont(w, size, pack)) + pad(w), 0) + gap * size * (ws.length - 1);
  const top = Math.round(100 * pack.sizeScale);
  const low = Math.round(76 * pack.sizeScale);
  for (let size = top; size >= low; size -= 4) {
    if (lineWidth(p.words, size) <= MAXW) return {size, lines: [p.words]};
  }
  // two lines max: shrink until the greedy wrap needs <= 2 lines
  const wrap = (size: number) => {
    const lines: W[][] = [[]];
    for (const w of p.words) {
      const cur = lines[lines.length - 1];
      if (cur.length && lineWidth([...cur, w], size) > MAXW) lines.push([w]);
      else cur.push(w);
    }
    return lines;
  };
  let size = Math.round(84 * pack.sizeScale);
  let lines = wrap(size);
  while (lines.length > 2 && size > 56) {
    size -= 4;
    lines = wrap(size);
  }
  const widest = Math.max(...lines.map((l) => lineWidth(l, size)));
  return {size: widest > MAXW ? Math.floor((size * MAXW) / widest) : size, lines};
};

const Word: React.FC<{w: W; f: number; size: number; accent: string; pack: Pack; last: boolean}> = ({w, f, size, accent, pack, last}) => {
  const fx = pack.fx;
  const said = interpolate(f, [w.s - 2, w.s + 3], [0, 1], {...CLAMP, easing: Easing.out(Easing.cubic)});
  const active = f >= w.s - 1 && f < w.a;
  const ml = hasMl(w.t);
  const txt = shown(w, pack);

  let transform = '';
  let opacity = 1;
  let filter: string | undefined;
  if (fx === 'pop') {
    transform = `translateY(${interpolate(said, [0, 1], [12, 0])}px) scale(${interpolate(f, [w.s - 2, w.s + 2, w.s + 7], [0.94, 1.07, 1], CLAMP)})`;
    opacity = interpolate(said, [0, 1], [0.26, 1]);
  } else if (fx === 'type') {
    opacity = interpolate(f, [w.s - 1, w.s + 1], [0, 1], CLAMP);
  } else if (fx === 'flip') {
    const t = interpolate(f, [w.s - 3, w.s + 5], [0, 1], {...CLAMP, easing: Easing.out(Easing.back(1.6))});
    transform = `perspective(700px) rotateX(${(1 - t) * -95}deg)`;
    opacity = interpolate(f, [w.s - 3, w.s], [0, 1], CLAMP);
  } else if (fx === 'mask') {
    const t = interpolate(f, [w.s - 3, w.s + 5], [0, 1], {...CLAMP, easing: Easing.out(Easing.exp)});
    transform = `translateY(${(1 - t) * 105}%)`;
  } else if (fx === 'marker') {
    opacity = interpolate(said, [0, 1], [0.3, 1]);
    transform = `translateY(${interpolate(said, [0, 1], [6, 0])}px)`;
  } else if (fx === 'blur') {
    const t = interpolate(f, [w.s - 3, w.s + 5], [0, 1], {...CLAMP, easing: Easing.out(Easing.cubic)});
    transform = `scale(${1.28 - 0.28 * t})`;
    opacity = t;
    filter = t < 1 ? `blur(${(1 - t) * 14}px)` : undefined;
  }

  const base: React.CSSProperties = {display: 'inline-block', whiteSpace: 'nowrap', transform, opacity, filter, transformOrigin: '50% 100%'};
  const shadow = '0 4px 18px rgba(0,0,0,.75)';

  let el: React.ReactNode;
  if (w.k === 's') {
    el = (
      <span
        style={{
          ...base,
          color: accent,
          fontFamily: ml ? pack.accentMl : pack.accentLatin,
          fontStyle: ml ? 'normal' : pack.accentLatinStyle,
          fontWeight: ml ? pack.accentMlWeight : 400,
          fontSize: ml ? size * 0.95 : size * (pack.accentLatinStyle === 'italic' ? 1.14 : 0.98),
          transform: `${transform} ${pack.accentSkew ? `skewX(${pack.accentSkew}deg)` : ''}`,
          textShadow: `0 0 26px ${accent}88, ${shadow}`,
        }}
      >
        {txt}
      </span>
    );
  } else {
    const pill = w.k === 'p' && (fx === 'pop' ? active : fx === 'marker' ? f >= w.s - 1 : false);
    const sweep = fx === 'marker' && w.k === 'p' ? interpolate(f, [w.s - 1, w.s + 6], [0, 100], CLAMP) : 100;
    const under = w.k === 'p' && fx !== 'pop' && fx !== 'marker';
    el = (
      <span
        style={{
          ...base,
          position: 'relative',
          fontFamily: ml ? pack.ml : pack.display,
          fontWeight: ml ? pack.mlWeight : pack.displayWeight,
          fontStretch: ml ? pack.mlStretch : pack.displayStretch,
          fontSize: size,
          letterSpacing: ml ? 0 : (pack.displayTrack * size) / 100,
          color: pill ? '#120b08' : under ? accent : C.white,
          background: pill ? (fx === 'marker' ? `linear-gradient(90deg, ${accent} ${sweep}%, transparent ${sweep}%)` : accent) : 'transparent',
          borderRadius: fx === 'marker' ? 6 : 18,
          padding: w.k === 'p' ? '0 14px' : 0,
          boxShadow: pill && fx === 'pop' ? `0 0 34px ${accent}aa` : 'none',
          textShadow: pill ? 'none' : under ? `0 0 22px ${accent}77, ${shadow}` : shadow,
        }}
      >
        {txt}
        {under ? (
          <span
            style={{
              position: 'absolute',
              left: 14,
              bottom: -4,
              height: 6,
              borderRadius: 3,
              width: `calc(${interpolate(f, [w.s, w.s + 8], [0, 100], CLAMP)}% - 28px)`,
              background: accent,
              boxShadow: `0 0 14px ${accent}`,
            }}
          />
        ) : null}
      </span>
    );
  }
  if (fx === 'mask') {
    return <span style={{display: 'inline-block', overflow: 'hidden', paddingBottom: size * 0.12, marginBottom: -size * 0.12, lineHeight: 1.3}}>{el}</span>;
  }
  if (fx === 'type' && last && f >= w.s - 1) {
    const blink = Math.floor(f / 8) % 2 === 0 ? 1 : 0.15;
    return (
      <span style={{display: 'inline-flex', alignItems: 'center'}}>
        {el}
        <span style={{display: 'inline-block', width: size * 0.42, height: size * 0.9, marginLeft: size * 0.12, background: accent, opacity: blink, boxShadow: `0 0 18px ${accent}`}} />
      </span>
    );
  }
  return el;
};

export const Caption: React.FC<{frame: number; accent: string; pages: CaptionPage[]; pack: Pack; y?: number; dx?: number}> = ({frame, accent, pages, pack, y = 842, dx = 0}) => {
  const p = pages.find((pg) => frame >= pg.from && frame < pg.to);
  if (!p) return null;
  const {size, lines} = layout(p, pack);
  const exit = interpolate(frame, [p.to - 3, p.to], [1, 0.6], CLAMP);
  // last word said so far (for the typing cursor)
  let lastIdx = -1;
  p.words.forEach((w, i) => {
    if (frame >= w.s - 1) lastIdx = i;
  });
  let k = 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        right: 40,
        top: y,
        transform: `translate(${dx}px, -50%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        opacity: exit,
        lineHeight: 1.28,
      }}
    >
      {lines.map((l, i) => (
        <div key={i} style={{display: 'flex', gap: size * 0.3, alignItems: 'baseline', justifyContent: 'center'}}>
          {l.map((w, j) => {
            const idx = k++;
            return <Word key={j} w={w} f={frame} size={size} accent={accent} pack={pack} last={idx === lastIdx} />;
          })}
        </div>
      ))}
    </div>
  );
};
