import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, hasMl, type Pack} from '../theme';
import {CLAMP, mixHex} from './ctx';
import {Icon} from './Icons';

/** Mount children only inside [a, b] frames; hands them an exit opacity. */
export const Beat: React.FC<{f: number; a: number; b: number; out?: number; children: (o: number) => React.ReactNode}> = ({
  f,
  a,
  b,
  out = 7,
  children,
}) => {
  if (f < a - 1 || f > b + 1) return null;
  const o = interpolate(f, [b - out, b], [1, 0], CLAMP);
  return <div style={{position: 'absolute', inset: 0, opacity: o}}>{children(o)}</div>;
};

/** Tilted 3D plane that swings in. `t` is the entrance progress 0..1. */
export const Tilt: React.FC<{
  x: number;
  y: number;
  w?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  t?: number;
  z?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({x, y, w, rx = 7, ry = -14, rz = 2, t = 1, z = 0, children, style}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      opacity: Math.min(1, t * 1.6),
      transform: `perspective(1500px) translateZ(${z}px) translateY(${(1 - t) * 90}px) rotateX(${rx + (1 - t) * 14}deg) rotateY(${ry + (1 - t) * -26}deg) rotateZ(${rz}deg) scale(${0.82 + 0.18 * t})`,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Glass: React.FC<{children: React.ReactNode; glow?: string; pad?: number | string; radius?: number; style?: React.CSSProperties; tint?: string}> = ({
  children,
  glow,
  pad = 26,
  radius = 24,
  style,
  tint,
}) => (
  <div
    style={{
      position: 'relative',
      padding: pad,
      borderRadius: radius,
      background: tint
        ? `linear-gradient(155deg, ${tint}33, rgba(15,13,19,.95) 60%)`
        : 'linear-gradient(155deg, rgba(38,33,42,.94), rgba(15,13,19,.96))',
      border: `1.5px solid ${glow ?? 'rgba(255,255,255,.13)'}`,
      boxShadow: glow
        ? `0 26px 60px rgba(0,0,0,.65), 0 0 34px ${glow}66, inset 0 1px 0 rgba(255,255,255,.1)`
        : '0 26px 60px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.1)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Dots: React.FC<{title?: string}> = ({title}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16}}>
    {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
      <span key={c} style={{width: 13, height: 13, borderRadius: 7, background: c}} />
    ))}
    {title ? <span style={{marginLeft: 10, fontFamily: FONT.mono, fontSize: 22, color: C.mono}}>{title}</span> : null}
  </div>
);

export const Label: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties}> = ({children, size = 25, color = C.mono, style}) => (
  <div style={{fontFamily: FONT.mono, fontSize: size, letterSpacing: 3, color, fontWeight: 600, ...style}}>{children}</div>
);

export const Check: React.FC<{t: number; size?: number; color?: string; bad?: boolean}> = ({t, size = 40, color = C.green, bad}) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{transform: `scale(${t})`, flex: 'none', filter: `drop-shadow(0 0 8px ${bad ? C.red : color})`}}>
    <circle cx={20} cy={20} r={19} fill={bad ? C.red : color} />
    {bad ? (
      <path d="M 13 13 L 27 27 M 27 13 L 13 27" fill="none" stroke="#1a0606" strokeWidth={4.6} strokeLinecap="round" strokeDasharray={40} strokeDashoffset={40 * (1 - t)} />
    ) : (
      <path d="M 11 21 L 18 28 L 30 13" fill="none" stroke="#06140c" strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={34} strokeDashoffset={34 * (1 - t)} />
    )}
  </svg>
);

let mctx: CanvasRenderingContext2D | null = null;
const stretchKw = (st?: string) => (st === '75%' ? 'condensed ' : st === '125%' ? 'expanded ' : '');
/** Largest size <= base where the text fits in maxW px, in the pack's font. */
export const fitSize = (text: string, pack: Pack, base: number, maxW: number, accent = false) => {
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  const ml = hasMl(text);
  const font = accent
    ? ml
      ? `${pack.accentMlWeight} ${base}px ${pack.accentMl}`
      : `${pack.accentLatinStyle} 400 ${base}px ${pack.accentLatin}`
    : ml
      ? `${stretchKw(pack.mlStretch)}${pack.mlWeight} ${base}px ${pack.ml}`
      : `${stretchKw(pack.displayStretch)}${pack.displayWeight} ${base}px ${pack.display}`;
  mctx!.font = font;
  const t = pack.upper && !ml ? text.toUpperCase() : text;
  const w = mctx!.measureText(t).width + (ml ? 0 : (pack.displayTrack * base * t.length) / 100);
  return w > maxW ? Math.max(12, Math.floor((base * maxW) / w)) : base;
};

/** Text in the reel's font pack: picks the Malayalam or latin family by script. */
export const PackText: React.FC<{
  pack: Pack;
  children: string;
  size: number;
  color?: string;
  accent?: boolean;
  maxW?: number;
  style?: React.CSSProperties;
}> = ({pack, children, size: base, color = '#fff', accent, maxW, style}) => {
  const ml = hasMl(children);
  const size = maxW ? fitSize(children, pack, base, maxW, accent) : base;
  if (accent) {
    return (
      <span
        style={{
          fontFamily: ml ? pack.accentMl : pack.accentLatin,
          fontStyle: ml ? 'normal' : pack.accentLatinStyle,
          fontWeight: ml ? pack.accentMlWeight : 400,
          fontSize: ml ? size * 0.95 : size * (pack.accentLatinStyle === 'italic' ? 1.14 : 0.98),
          color,
          display: 'inline-block',
          transform: pack.accentSkew ? `skewX(${pack.accentSkew}deg)` : undefined,
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      style={{
        fontFamily: ml ? pack.ml : pack.display,
        fontWeight: ml ? pack.mlWeight : pack.displayWeight,
        fontStretch: ml ? pack.mlStretch : pack.displayStretch,
        letterSpacing: ml ? 0 : (pack.displayTrack * size) / 100,
        textTransform: pack.upper && !ml ? 'uppercase' : undefined,
        fontSize: size,
        color,
        whiteSpace: 'nowrap',
        display: 'inline-block',
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/**
 * CSS 3D extruded text: stacked layers in depth. Works for Malayalam because the
 * browser shapes every layer (three.js text can't shape Malayalam).
 */
export const Extrude: React.FC<{
  text: string;
  pack: Pack;
  size: number;
  face?: string;
  face2?: string;
  side?: string;
  depth?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  glow?: string;
  style?: React.CSSProperties;
}> = ({text, pack, size, face = '#ffffff', face2, side = '#8a8a96', depth = 16, rx = 0, ry = 0, rz = 0, glow, style}) => {
  const ml = hasMl(text);
  const font: React.CSSProperties = {
    fontFamily: ml ? pack.ml : pack.display,
    fontWeight: ml ? pack.mlWeight : pack.displayWeight,
    fontStretch: ml ? pack.mlStretch : pack.displayStretch,
    letterSpacing: ml ? 0 : (pack.displayTrack * size) / 100,
    textTransform: pack.upper && !ml ? 'uppercase' : undefined,
    fontSize: size,
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
  };
  const step = Math.max(1.2, size / 70);
  return (
    <div style={{position: 'relative', display: 'inline-block', transformStyle: 'preserve-3d', transform: `perspective(1400px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`, ...style}}>
      {new Array(depth).fill(0).map((_, i) => {
        const k = depth - i;
        return (
          <div
            key={i}
            aria-hidden
            style={{
              ...font,
              position: 'absolute',
              left: 0,
              top: 0,
              color: mixHex(side, '#000000', (k / depth) * 0.75),
              transform: `translateZ(${-k * step}px)`,
            }}
          >
            {text}
          </div>
        );
      })}
      <div
        style={{
          ...font,
          position: 'relative',
          color: face,
          background: face2 ? `linear-gradient(180deg, ${face} 20%, ${face2} 95%)` : undefined,
          WebkitBackgroundClip: face2 ? 'text' : undefined,
          WebkitTextFillColor: face2 ? 'transparent' : undefined,
          filter: glow ? `drop-shadow(0 0 28px ${glow}aa)` : undefined,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const Spotlight: React.FC<{o: number; color?: string; x?: number}> = ({o, color = '#fff', x = 540}) => (
  <div
    style={{
      position: 'absolute',
      left: x - 520,
      top: -60,
      width: 1040,
      height: 1500,
      opacity: o * 0.4,
      filter: 'blur(16px)',
      clipPath: 'polygon(43% 0, 57% 0, 92% 100%, 8% 100%)',
      background: `linear-gradient(180deg, ${color} 0%, ${color}66 42%, transparent 90%)`,
    }}
  />
);

/** Small rounded tag: icon + text. */
export const Tag: React.FC<{text: string; icon?: string; color: string; pack: Pack; size?: number; solid?: boolean; style?: React.CSSProperties}> = ({
  text,
  icon,
  color,
  pack,
  size = 34,
  solid,
  style,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.32,
      padding: `${size * 0.32}px ${size * 0.6}px`,
      borderRadius: size * 0.5,
      background: solid ? color : 'rgba(20,17,24,.92)',
      border: `2px solid ${color}`,
      boxShadow: `0 14px 30px rgba(0,0,0,.5), 0 0 22px ${color}55`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {icon ? <Icon name={icon} size={size * 1.05} color={solid ? '#0d0a0c' : color} sw={3.6} /> : null}
    <PackText pack={pack} size={size} color={solid ? '#0d0a0c' : '#fff'} maxW={560}>
      {text}
    </PackText>
  </div>
);

/** Icon in a glowing rounded tile. */
export const IconTile: React.FC<{name: string; color: string; size?: number; t?: number}> = ({name, color, size = 120, t = 1}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.26,
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(150deg, ${color}38, rgba(14,12,18,.96) 70%)`,
      border: `2px solid ${color}aa`,
      boxShadow: `0 18px 40px rgba(0,0,0,.55), 0 0 30px ${color}44, inset 0 1px 0 rgba(255,255,255,.15)`,
      transform: `scale(${t})`,
    }}
  >
    <Icon name={name} size={size * 0.56} color={color} sw={3.4} />
  </div>
);
