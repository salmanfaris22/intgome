import React from 'react';
import {Easing, interpolate, random} from 'remotion';
import {mouthOpen, mouthWide} from '../lib/lip';

export type Face = 'neutral' | 'happy' | 'shock' | 'cool' | 'sly' | 'wince' | 'wow';
export type Pose =
  | 'idle'
  | 'wave'
  | 'point'
  | 'shrug'
  | 'think'
  | 'present'
  | 'presentL'
  | 'cheer'
  | 'hips'
  | 'stop';

type Hand = 'open' | 'point' | 'fist';
type ArmPose = {a: number; b: number; hand: Hand};
type PoseDef = {l: ArmPose; r: ArmPose};

const IDLE_ARM: ArmPose = {a: 16, b: 8, hand: 'open'};

export const POSES: Record<Pose, PoseDef> = {
  idle: {l: IDLE_ARM, r: IDLE_ARM},
  wave: {l: IDLE_ARM, r: {a: 72, b: 92, hand: 'open'}},
  point: {l: IDLE_ARM, r: {a: 52, b: 112, hand: 'point'}},
  shrug: {l: {a: 58, b: 52, hand: 'open'}, r: {a: 58, b: 52, hand: 'open'}},
  think: {l: {a: 22, b: -28, hand: 'fist'}, r: {a: 30, b: -148, hand: 'fist'}},
  present: {l: IDLE_ARM, r: {a: 118, b: 14, hand: 'open'}},
  presentL: {l: {a: 118, b: 14, hand: 'open'}, r: IDLE_ARM},
  cheer: {l: {a: 142, b: 18, hand: 'fist'}, r: {a: 142, b: 18, hand: 'fist'}},
  hips: {l: {a: 44, b: -82, hand: 'fist'}, r: {a: 44, b: -82, hand: 'fist'}},
  stop: {l: IDLE_ARM, r: {a: 88, b: 58, hand: 'open'}},
};

const INK = '#140d0c';
const SKIN = '#ffe3cd';
const SKIN_SH = '#f7c8a6';
const HAIR = '#1b1417';
const HAIR_HI = '#57434c';
const HOOD = '#f5ede1';
const HOOD_SH = '#d8cabb';
const PANTS = '#272833';
const PANTS_HI = '#3d3f4e';
const OW = 7; // outline width

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const Tube: React.FC<{x1: number; y1: number; x2: number; y2: number; w: number; color: string}> = ({
  x1,
  y1,
  x2,
  y2,
  w,
  color,
}) => (
  <>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={w + OW * 2} strokeLinecap="round" />
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w} strokeLinecap="round" />
  </>
);

const HandShape: React.FC<{hand: Hand; accent: string}> = ({hand}) => {
  if (hand === 'point') {
    return (
      <g>
        <line x1={0} y1={6} x2={0} y2={46} stroke={INK} strokeWidth={20 + OW} strokeLinecap="round" />
        <line x1={0} y1={6} x2={0} y2={46} stroke={SKIN} strokeWidth={20 - 2} strokeLinecap="round" />
        <circle cx={0} cy={0} r={23} fill={SKIN} stroke={INK} strokeWidth={OW} />
        <path d="M -9 14 L 9 14" stroke={SKIN} strokeWidth={15} strokeLinecap="round" />
      </g>
    );
  }
  if (hand === 'fist') {
    return (
      <g>
        <circle cx={0} cy={2} r={24} fill={SKIN} stroke={INK} strokeWidth={OW} />
        <path d="M -12 12 Q -6 18 0 12 Q 6 18 12 12" fill="none" stroke={SKIN_SH} strokeWidth={4} strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      {[-20, -7, 7, 20].map((dx, i) => (
        <g key={i}>
          <line x1={dx * 0.6} y1={8} x2={dx} y2={34 - Math.abs(dx) * 0.28} stroke={INK} strokeWidth={13 + OW} strokeLinecap="round" />
        </g>
      ))}
      <circle cx={0} cy={0} r={24} fill={SKIN} stroke={INK} strokeWidth={OW} />
      {[-20, -7, 7, 20].map((dx, i) => (
        <line key={i} x1={dx * 0.6} y1={8} x2={dx} y2={34 - Math.abs(dx) * 0.28} stroke={SKIN} strokeWidth={13} strokeLinecap="round" />
      ))}
      <circle cx={0} cy={0} r={20} fill={SKIN} />
    </g>
  );
};

const Arm: React.FC<{side: -1 | 1; pose: ArmPose; accent: string}> = ({side, pose, accent}) => {
  const L1 = 80;
  const L2 = 76;
  const s = pose.a * -side;
  const e = pose.b * -side;
  return (
    <g transform={`translate(${300 + side * 96} 436) rotate(${s})`}>
      <Tube x1={0} y1={0} x2={0} y2={L1} w={46} color={HOOD} />
      <g transform={`translate(0 ${L1}) rotate(${e})`}>
        <Tube x1={0} y1={0} x2={0} y2={L2} w={42} color={HOOD} />
        <line x1={-20} y1={L2 + 6} x2={20} y2={L2 + 6} stroke={accent} strokeWidth={15} strokeLinecap="round" />
        <g transform={`translate(0 ${L2 + 26})`}>
          <HandShape hand={pose.hand} accent={accent} />
        </g>
      </g>
      {/* hide the joint seam between the two arm segments */}
      <circle cx={0} cy={L1} r={22} fill={HOOD} />
    </g>
  );
};

const Eye: React.FC<{x: number; face: Face; blink: number; side: -1 | 1}> = ({x, face, blink, side}) => {
  if (face === 'happy') {
    return (
      <path d={`M ${x - 26} 16 Q ${x} -18 ${x + 26} 16`} fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
    );
  }
  if (face === 'wince') {
    return (
      <path
        d={`M ${x - side * 24} -6 L ${x + side * 20} 10 L ${x - side * 24} 26`}
        fill="none"
        stroke={INK}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (face === 'shock') {
    return (
      <g>
        <ellipse cx={x} cy={8} rx={25} ry={29} fill="#fff" stroke={INK} strokeWidth={6} />
        <circle cx={x} cy={8} r={7.5} fill={INK} />
      </g>
    );
  }
  const closed = blink > 0.5;
  if (closed) {
    return <path d={`M ${x - 22} 12 Q ${x} 20 ${x + 22} 12`} fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />;
  }
  const ry = lerp(25, 6, blink);
  return (
    <g>
      <ellipse cx={x} cy={10} rx={20} ry={ry} fill={INK} />
      <circle cx={x + 6} cy={1} r={7} fill="#fff" />
      <circle cx={x - 7} cy={19} r={3.6} fill="#fff" opacity={0.85} />
      {face === 'wow' ? <path d={`M ${x - 4} 6 l 3 7 l 7 3 l -7 3 l -3 7 l -3 -7 l -7 -3 l 7 -3 Z`} fill="#fff" /> : null}
      {face === 'sly' ? (
        <rect x={x - 28} y={-22} width={56} height={30} fill={SKIN} />
      ) : null}
      {face === 'sly' ? (
        <line x1={x - 26} y1={8} x2={x + 26} y2={8} stroke={INK} strokeWidth={8} strokeLinecap="round" />
      ) : null}
    </g>
  );
};

const Shades: React.FC<{drop: number; accent: string}> = ({drop, accent}) => {
  const lens =
    'M -112 -8 L -16 -8 C -11 -8 -9 -4 -10 2 L -17 32 C -19 41 -26 46 -35 46 L -84 46 C -95 46 -102 40 -105 31 L -117 0 C -118 -5 -116 -8 -112 -8 Z';
  return (
    <g transform={`translate(0 ${drop})`} opacity={drop < -60 ? 0 : 1}>
      <path d={lens} fill="#0b0a0e" stroke={INK} strokeWidth={5} />
      <path d={lens} transform="scale(-1 1)" fill="#0b0a0e" stroke={INK} strokeWidth={5} />
      <rect x={-16} y={-8} width={32} height={12} fill="#0b0a0e" />
      <rect x={-122} y={-11} width={244} height={10} rx={5} fill="#0b0a0e" />
      <path d="M -94 6 L -72 34" stroke="#fff" strokeWidth={8} opacity={0.2} strokeLinecap="round" />
      <path d="M -76 4 L -62 22" stroke="#fff" strokeWidth={5} opacity={0.14} strokeLinecap="round" />
      <path d="M 40 6 L 62 34" stroke="#fff" strokeWidth={8} opacity={0.2} strokeLinecap="round" />
      <path d="M 58 4 L 72 22" stroke="#fff" strokeWidth={5} opacity={0.14} strokeLinecap="round" />
      <rect x={-112} y={-7} width={18} height={3} rx={1.5} fill={accent} opacity={0.9} />
    </g>
  );
};

const Mouth: React.FC<{open: number; wide: number; face: Face}> = ({open, wide, face}) => {
  const y = 66;
  if (open < 0.05) {
    if (face === 'shock') return <ellipse cx={0} cy={y + 6} rx={12} ry={15} fill="#5a1a1e" stroke={INK} strokeWidth={6} />;
    if (face === 'sly') return <path d={`M -14 ${y} L 14 ${y}`} stroke={INK} strokeWidth={7} strokeLinecap="round" />;
    return <path d={`M -19 ${y - 3} Q 0 ${y + 13} 19 ${y - 3}`} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />;
  }
  const rx = 12 + wide * 16 + open * 4;
  const ry = 4 + open * 21;
  return (
    <g>
      <ellipse cx={0} cy={y + ry * 0.45} rx={rx} ry={ry} fill="#5a1a1e" stroke={INK} strokeWidth={6} />
      {open > 0.3 ? (
        <path
          d={`M ${-rx * 0.62} ${y + ry * 0.45 - ry * 0.68} Q 0 ${y + ry * 0.45 - ry * 0.98} ${rx * 0.62} ${y + ry * 0.45 - ry * 0.68}`}
          fill="#fff"
          stroke="#fff"
          strokeWidth={3}
        />
      ) : null}
      {open > 0.45 ? <ellipse cx={0} cy={y + ry * 0.45 + ry * 0.5} rx={rx * 0.55} ry={ry * 0.32} fill="#e8707a" /> : null}
    </g>
  );
};

/** Head + hair. Local origin is the head centre. */
const Head: React.FC<{face: Face; blink: number; open: number; wide: number; shadesDrop: number; accent: string; hairSway: number}> = ({
  face,
  blink,
  open,
  wide,
  shadesDrop,
  accent,
  hairSway,
}) => {
  const browLift = face === 'shock' || face === 'wow' ? -14 : 0;
  return (
    <g>
      {/* back hair */}
      <path
        d="M -146 40 C -176 -96 -96 -190 2 -190 C 104 -190 176 -94 146 40 C 142 76 124 92 106 96 L -106 96 C -124 92 -142 76 -146 40 Z"
        fill={HAIR}
        stroke={INK}
        strokeWidth={OW}
        strokeLinejoin="round"
      />
      {/* ears */}
      <circle cx={-127} cy={22} r={21} fill={SKIN} stroke={INK} strokeWidth={OW} />
      <circle cx={127} cy={22} r={21} fill={SKIN} stroke={INK} strokeWidth={OW} />
      <path d="M -133 16 Q -124 22 -130 32" fill="none" stroke={SKIN_SH} strokeWidth={5} strokeLinecap="round" />
      <path d="M 133 16 Q 124 22 130 32" fill="none" stroke={SKIN_SH} strokeWidth={5} strokeLinecap="round" />
      {/* face */}
      <path
        d="M -126 -6 C -126 -92 -66 -132 0 -132 C 66 -132 126 -92 126 -6 C 126 74 70 120 0 120 C -70 120 -126 74 -126 -6 Z"
        fill={SKIN}
        stroke={INK}
        strokeWidth={OW}
      />
      {/* forehead shade under the fringe */}
      <path d="M -116 -38 Q 0 -8 116 -38 L 110 -80 L -110 -80 Z" fill={SKIN_SH} opacity={0.5} />
      {/* blush */}
      <ellipse cx={-84} cy={46} rx={27} ry={15} fill="#ff8f97" opacity={0.55} />
      <ellipse cx={84} cy={46} rx={27} ry={15} fill="#ff8f97" opacity={0.55} />
      {/* eyes */}
      <Eye x={-60} face={face} blink={blink} side={-1} />
      <Eye x={60} face={face} blink={blink} side={1} />
      {/* brows */}
      {face === 'sly' ? (
        <>
          <path d="M -88 -24 L -34 -16" stroke={INK} strokeWidth={8} strokeLinecap="round" />
          <path d="M 34 -30 Q 62 -44 88 -30" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
        </>
      ) : face === 'cool' ? null : (
        <>
          <path d={`M -84 ${-30 + browLift} Q -60 ${-40 + browLift} -36 ${-30 + browLift}`} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
          <path d={`M 36 ${-30 + browLift} Q 60 ${-40 + browLift} 84 ${-30 + browLift}`} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
        </>
      )}
      <Mouth open={open} wide={wide} face={face} />
      {/* shades */}
      <Shades drop={shadesDrop} accent={accent} />
      {/* fringe: side-swept tufts */}
      <path
        d="M -135 6 C -150 -100 -84 -176 6 -176 C 96 -176 152 -100 134 8 C 128 -22 116 -50 100 -66 C 100 -44 92 -30 78 -20 C 80 -46 72 -66 58 -80 C 50 -52 30 -30 4 -22 C 16 -44 16 -66 8 -84 C -8 -54 -36 -34 -70 -28 C -56 -44 -50 -60 -52 -76 C -74 -60 -96 -44 -106 -24 C -116 -14 -128 -6 -135 6 Z"
        fill={HAIR}
        stroke={INK}
        strokeWidth={OW}
        strokeLinejoin="round"
      />
      {/* hair highlights */}
      <path d="M -92 -112 Q -48 -158 20 -156" fill="none" stroke={HAIR_HI} strokeWidth={6} strokeLinecap="round" />
      <path d="M -66 -96 Q -36 -128 6 -132" fill="none" stroke={HAIR_HI} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      <path d="M 58 -146 Q 92 -124 106 -88" fill="none" stroke={HAIR_HI} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
      {/* ahoge */}
      <g transform={`rotate(${hairSway} 0 -176)`}>
        <path d="M -6 -174 C -14 -206 8 -226 30 -222 C 12 -216 6 -196 10 -174" fill={HAIR} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      </g>
      {/* sweat drop for shock */}
      {face === 'shock' ? (
        <path d="M 118 -80 C 104 -56 106 -44 118 -42 C 130 -44 132 -56 118 -80 Z" fill="#8fd3ff" stroke={INK} strokeWidth={5} />
      ) : null}
    </g>
  );
};

const Body: React.FC<{accent: string}> = ({accent}) => (
  <g>
    {/* legs */}
    <Tube x1={252} y1={606} x2={246} y2={770} w={70} color={PANTS} />
    <Tube x1={348} y1={606} x2={354} y2={770} w={70} color={PANTS} />
    <path d="M 226 690 Q 246 700 266 690" fill="none" stroke={PANTS_HI} strokeWidth={5} strokeLinecap="round" />
    <path d="M 334 708 Q 354 718 374 708" fill="none" stroke={PANTS_HI} strokeWidth={5} strokeLinecap="round" />
    <path d="M 224 752 Q 246 760 268 752" fill="none" stroke={PANTS_HI} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
    {/* sneakers */}
    {[-1, 1].map((d) => {
      const x = d < 0 ? 240 : 360;
      return (
        <g key={d} transform={`translate(${x} 806) scale(${d} 1)`}>
          <path
            d="M -46 -30 C -46 -44 34 -44 38 -30 C 62 -22 84 -6 84 14 C 84 24 76 28 66 28 L -44 28 C -54 28 -56 18 -54 2 Z"
            fill="#faf6ef"
            stroke={INK}
            strokeWidth={OW}
            strokeLinejoin="round"
          />
          <path d="M -54 14 L 84 14 C 84 24 76 28 66 28 L -44 28 C -52 28 -55 22 -54 14 Z" fill={accent} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
          <path d="M 2 -24 L 28 -8 M 16 -30 L 42 -14" stroke={INK} strokeWidth={5} strokeLinecap="round" opacity={0.75} />
        </g>
      );
    })}
    {/* torso: hoodie */}
    <path
      d="M 204 420 C 228 392 372 392 396 420 C 410 470 416 540 414 606 C 414 632 186 632 186 606 C 184 540 190 470 204 420 Z"
      fill={HOOD}
      stroke={INK}
      strokeWidth={OW}
      strokeLinejoin="round"
    />
    <path d="M 396 430 C 408 480 412 545 412 606 C 412 620 340 626 300 626 C 360 618 386 560 396 430 Z" fill={HOOD_SH} opacity={0.65} />
    {/* kangaroo pocket */}
    <path d="M 232 606 L 248 540 L 352 540 L 368 606" fill="none" stroke={HOOD_SH} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
    {/* ribbed hem */}
    <path d="M 190 598 Q 300 618 410 598" fill="none" stroke={HOOD_SH} strokeWidth={5} />
    {/* chest mark: a tiny code glyph */}
    <g transform="translate(300 500)">
      <rect x={-46} y={-25} width={92} height={50} rx={12} fill={accent} stroke={INK} strokeWidth={5} />
      <path d="M -22 -9 L -34 0 L -22 9 M 22 -9 L 34 0 L 22 9 M 7 -13 L -7 13" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </g>
);

const Neck: React.FC<{accent: string}> = ({accent}) => (
  <g>
    {/* hood collar + headphones around the neck */}
    <path d="M 226 412 C 244 372 356 372 374 412 C 356 448 244 448 226 412 Z" fill={HOOD_SH} stroke={INK} strokeWidth={OW} strokeLinejoin="round" />
    <path d="M 262 404 Q 300 438 338 404" fill={SKIN_SH} stroke={INK} strokeWidth={5} />
    <path d="M 214 410 C 226 462 374 462 386 410" fill="none" stroke={INK} strokeWidth={15} strokeLinecap="round" />
    <path d="M 214 410 C 226 462 374 462 386 410" fill="none" stroke={accent} strokeWidth={6} strokeLinecap="round" />
    <rect x={190} y={396} width={38} height={54} rx={15} fill="#26262e" stroke={INK} strokeWidth={6} />
    <rect x={372} y={396} width={38} height={54} rx={15} fill="#26262e" stroke={INK} strokeWidth={6} />
    <circle cx={209} cy={423} r={7} fill={accent} />
    <circle cx={391} cy={423} r={7} fill={accent} />
  </g>
);

export type PoseKey = {f: number; pose: Pose};
export type FaceKey = {f: number; face: Face};

const trackIndex = <T extends {f: number}>(t: T[], frame: number) => {
  let i = 0;
  for (let k = 0; k < t.length; k++) if (t[k].f <= frame) i = k;
  return i;
};

const armAt = (p: Pose, q: Pose, side: 'l' | 'r', t: number): ArmPose => {
  const a = POSES[p][side];
  const b = POSES[q][side];
  return {a: lerp(a.a, b.a, t), b: lerp(a.b, b.b, t), hand: t > 0.5 ? b.hand : a.hand};
};

export const Mascot: React.FC<{
  frame: number;
  poses: PoseKey[];
  faces: FaceKey[];
  accent: string;
  glow: string;
}> = ({frame, poses, faces, accent, glow}) => {
  const open = mouthOpen(frame);
  const wide = mouthWide(frame);

  const pi = trackIndex(poses, frame);
  const prev = poses[Math.max(0, pi - 1)].pose;
  const cur = poses[pi].pose;
  const pt = interpolate(frame, [poses[pi].f, poses[pi].f + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.8)),
  });
  const left = armAt(prev, cur, 'l', pt);
  const right = armAt(prev, cur, 'r', pt);
  if (cur === 'wave') right.b += Math.sin(frame * 0.5) * 16;
  if (cur === 'cheer') {
    left.a += Math.sin(frame * 0.4) * 6;
    right.a += Math.sin(frame * 0.4 + 1) * 6;
  }
  if (cur === 'idle' || cur === 'present' || cur === 'presentL') {
    left.a += Math.sin(frame * 0.09) * 2.5;
    if (cur !== 'present') right.a += Math.sin(frame * 0.09 + 1) * 2.5;
  }

  const fi = trackIndex(faces, frame);
  const face = faces[fi].face;
  const prevFace = faces[Math.max(0, fi - 1)].face;

  // Sunglasses drop on when the face becomes 'cool', lift off when it leaves.
  const coolIn = face === 'cool' ? (fi > 0 && prevFace === 'cool' ? 1 : interpolate(frame, [faces[fi].f, faces[fi].f + 7], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2.2))})) : 0;
  const coolOut = face !== 'cool' && prevFace === 'cool' ? interpolate(frame, [faces[fi].f, faces[fi].f + 6], [1, 0], {extrapolateRight: 'clamp'}) : 0;
  const shades = Math.max(coolIn, coolOut);
  const shadesDrop = lerp(-260, 0, shades);

  // Blinks at seeded intervals.
  const period = 104;
  const bi = Math.floor(frame / period);
  const at = Math.floor(random(`blink-${bi}`) * (period - 8));
  const local = frame - bi * period - at;
  const blink = local >= 0 && local < 5 ? [0.4, 0.9, 1, 0.8, 0.3][local] : 0;

  const breathe = Math.sin(frame * 0.07);
  const talkBob = open * 5;
  const headTilt = Math.sin(frame * 0.055) * 2.4 + Math.sin(frame * 0.17) * 1.1 * Math.min(1, open * 2);
  const headNod = -talkBob + Math.sin(frame * 0.14) * 1.5;
  const hairSway = Math.sin(frame * 0.2) * 7 + open * 8;

  return (
    <svg
      viewBox="-40 -40 680 920"
      width={680}
      height={920}
      style={{overflow: 'visible', filter: `drop-shadow(0 0 2px ${glow}) drop-shadow(0 0 16px ${glow})`}}
    >
      <g transform={`translate(0 ${breathe * 2.2})`}>
        <Body accent={accent} />
        <Arm side={-1} pose={left} accent={accent} />
        <Arm side={1} pose={right} accent={accent} />
        <Neck accent={accent} />
        <g transform={`translate(300 ${252 + headNod}) rotate(${headTilt} 0 130) scale(1.13)`}>
          <Head face={face} blink={blink} open={open} wide={wide} shadesDrop={shadesDrop} accent={accent} hairSway={hairSway} />
        </g>
      </g>
    </svg>
  );
};
