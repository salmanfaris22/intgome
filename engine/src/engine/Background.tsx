import React, {useMemo} from 'react';
import {AbsoluteFill, Img, random, staticFile} from 'remotion';
import {WORLD, type BgKind, type Mood} from '../theme';
import {mixHex} from './ctx';

/** Current glow colours, cross-fading over 14 frames at each world change. */
export const worldAt = (frame: number, segs: {from: number; world: Mood}[]) => {
  let i = 0;
  for (let k = 0; k < segs.length; k++) if (segs[k].from <= frame) i = k;
  const cur = WORLD[segs[i].world];
  const prev = WORLD[segs[Math.max(0, i - 1)].world];
  const t = Math.max(0, Math.min(1, (frame - segs[i].from) / 14));
  return {glow: mixHex(prev.glow, cur.glow, t), glow2: mixHex(prev.glow2, cur.glow2, t), accent: mixHex(prev.accent, cur.accent, t)};
};

const Dust: React.FC<{frame: number; n?: number}> = ({frame, n = 60}) => {
  const pts = useMemo(
    () =>
      new Array(n).fill(0).map((_, i) => ({
        x: random(`dx${i}`) * 1080,
        y: random(`dy${i}`) * 1920,
        r: 1 + random(`dr${i}`) * 3,
        v: 0.1 + random(`dv${i}`) * 0.45,
        p: random(`dp${i}`) * 6.28,
        o: 0.12 + random(`do${i}`) * 0.5,
      })),
    [n],
  );
  return (
    <AbsoluteFill>
      {pts.map((d, i) => {
        const y = (((d.y - frame * d.v) % 1920) + 1920) % 1920;
        const x = d.x + Math.sin(frame * 0.012 + d.p) * 22;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: d.r * 2, height: d.r * 2, borderRadius: '50%', background: '#fff', opacity: d.o * (0.55 + 0.45 * Math.sin(frame * 0.05 + d.p))}} />;
      })}
    </AbsoluteFill>
  );
};

const mask = 'linear-gradient(to bottom, transparent 0%, black 32%, black 72%, transparent 100%)';

const Floor: React.FC<{frame: number; kind: 'grid' | 'dots'}> = ({frame, kind}) => (
  <div
    style={{
      position: 'absolute',
      left: -900,
      right: -900,
      top: 1180,
      height: 1400,
      transformOrigin: '50% 0',
      transform: 'perspective(620px) rotateX(74deg)',
      backgroundImage:
        kind === 'grid'
          ? 'linear-gradient(#fff 1.5px, transparent 1.5px), linear-gradient(90deg, #fff 1.5px, transparent 1.5px)'
          : 'radial-gradient(circle, #fff 2.6px, transparent 3px)',
      backgroundSize: kind === 'grid' ? '84px 84px' : '46px 46px',
      backgroundPosition: `0 ${frame * 1.1}px`,
      opacity: kind === 'grid' ? 0.075 : 0.12,
      maskImage: mask,
      WebkitMaskImage: mask,
    }}
  />
);

const Rings: React.FC<{frame: number; color: string}> = ({frame, color}) => (
  <AbsoluteFill>
    {new Array(7).fill(0).map((_, i) => {
      const p = ((frame * 0.004 + i / 7) % 1) * 1;
      const r = 120 + p * 1100;
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 540 - r,
            top: 1060 - r * 0.42,
            width: r * 2,
            height: r * 0.84,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            opacity: (1 - p) * 0.22,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

const Lines: React.FC<{frame: number; color: string}> = ({frame, color}) => {
  const ls = useMemo(() => new Array(16).fill(0).map((_, i) => ({x: random(`lx${i}`) * 1080, w: 1 + random(`lw${i}`) * 2, v: 2 + random(`lv${i}`) * 6, l: 200 + random(`ll${i}`) * 500, p: random(`lp${i}`) * 2400})), []);
  return (
    <AbsoluteFill>
      {ls.map((l, i) => {
        const y = ((l.p + frame * l.v) % 2400) - l.l;
        return <div key={i} style={{position: 'absolute', left: l.x, top: y, width: l.w, height: l.l, background: `linear-gradient(180deg, transparent, ${color}, transparent)`, opacity: 0.35}} />;
      })}
    </AbsoluteFill>
  );
};

const Beams: React.FC<{frame: number; color: string}> = ({frame, color}) => (
  <AbsoluteFill style={{overflow: 'hidden'}}>
    {[0, 1, 2].map((i) => {
      const a = Math.sin(frame * 0.012 + i * 2.1) * 18 + (i - 1) * 24;
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 540 - 160,
            top: -200,
            width: 320,
            height: 2400,
            transformOrigin: '50% 0',
            transform: `rotate(${a}deg)`,
            background: `linear-gradient(180deg, ${color}55, transparent 70%)`,
            filter: 'blur(30px)',
            opacity: 0.5,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

const Stars: React.FC<{frame: number}> = ({frame}) => {
  const st = useMemo(() => new Array(110).fill(0).map((_, i) => ({a: random(`sa${i}`) * Math.PI * 2, d: random(`sd${i}`), s: 0.4 + random(`ss${i}`)})), []);
  return (
    <AbsoluteFill>
      {st.map((s, i) => {
        // fly-through: each star moves outward from the vanishing point
        const z = (s.d + frame * 0.0035 * s.s) % 1;
        const r = 30 + z * z * 1300;
        const x = 540 + Math.cos(s.a) * r;
        const y = 820 + Math.sin(s.a) * r * 1.3;
        const size = 1 + z * 4;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%', background: '#fff', opacity: Math.min(1, z * 2.2) * 0.75}} />;
      })}
    </AbsoluteFill>
  );
};

export const Background: React.FC<{frame: number; glow: string; glow2: string; pulse: number; kind: BgKind; accent: string}> = ({frame, glow, glow2, pulse, kind, accent}) => {
  const cy = 62 + Math.sin(frame * 0.02) * 2;
  const grow = 58 + pulse * 7;
  return (
    <AbsoluteFill style={{background: '#07060a'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 66% ${grow}% at 50% ${cy}%, ${glow}cc 0%, ${glow2}88 42%, transparent 76%)`}} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse 80% 30% at 50% 88%, ${glow2}aa 0%, transparent 72%)`}} />
      {kind === 'grid' || kind === 'dots' ? <Floor frame={frame} kind={kind} /> : null}
      {kind === 'rings' ? <Rings frame={frame} color={accent} /> : null}
      {kind === 'lines' ? <Lines frame={frame} color={accent} /> : null}
      {kind === 'beams' ? <Beams frame={frame} color={accent} /> : null}
      {kind === 'stars' ? <Stars frame={frame} /> : <Dust frame={frame} n={kind === 'grid' ? 70 : 40} />}
    </AbsoluteFill>
  );
};

/** Big outlined word behind everything. */
export const GhostWord: React.FC<{text: string; frame: number; from: number; font: string}> = ({text, frame, from, font}) => {
  const t = frame - from;
  return (
    <div
      style={{
        position: 'absolute',
        top: 800,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        fontFamily: font,
        fontWeight: 800,
        fontSize: 300,
        lineHeight: 1,
        letterSpacing: -6,
        whiteSpace: 'nowrap',
        color: 'transparent',
        WebkitTextStroke: '2px rgba(255,255,255,0.07)',
        opacity: Math.min(1, t / 12),
        transform: `translateX(${40 - t * 0.5}px)`,
      }}
    >
      {text}
    </div>
  );
};

/** Film grain + vignette, drawn over everything. */
export const Finish: React.FC<{frame: number}> = ({frame}) => {
  const x = Math.floor(random(`gx${Math.floor(frame / 2)}`) * 512);
  const y = Math.floor(random(`gy${Math.floor(frame / 2)}`) * 512);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 88% 78% at 50% 50%, transparent 52%, rgba(0,0,0,0.72) 100%)'}} />
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.075, mixBlendMode: 'overlay'}}>
        <Img src={staticFile('img/grain.png')} style={{position: 'absolute', left: -x, top: -y, width: 1600, height: 2432, objectFit: 'cover'}} />
      </div>
    </AbsoluteFill>
  );
};
