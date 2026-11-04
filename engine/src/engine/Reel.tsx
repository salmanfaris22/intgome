import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, Easing, Html5Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Mascot, type FaceKey, type PoseKey} from '../components/Mascot';
import {loadAllFonts} from '../lib/fonts';
import {energy, setLip} from '../lib/lip';
import {PACKS} from '../theme';
import {Background, Finish, GhostWord, worldAt} from './Background';
import {Caption} from './Caption';
import {CLAMP, makeF, ReelCtx} from './ctx';
import {Header} from './Header';
import {Beat} from './parts';
import {SCENES} from './scenes';
import {loadFont3d} from './three/Three';
import type {CamKind, ReelData} from './types';

const ease = Easing.inOut(Easing.cubic);

const camAt = (frame: number, cams: {from: number; kind: CamKind}[], total: number) => {
  let i = -1;
  cams.forEach((c, k) => {
    if (c.from <= frame) i = k;
  });
  const out = {x: 0, y: 0, rx: 0, ry: Math.sin(frame * 0.01) * 1.5, rz: 0, s: 1, blur: 0};
  if (i < 0) return out;
  const c = cams[i];
  const d = Math.max(1, (cams[i + 1]?.from ?? total) - c.from);
  const l = frame - c.from;
  const p = ease(Math.min(1, l / d));
  switch (c.kind) {
    case 'push':
      out.s = 1 + 0.075 * p;
      break;
    case 'pull':
      out.s = 1.075 - 0.075 * p;
      break;
    case 'orbitL':
      out.ry = 9 - 18 * p;
      break;
    case 'orbitR':
      out.ry = -9 + 18 * p;
      break;
    case 'tilt':
      out.rx = 12 - 12 * p;
      out.s = 1.04 - 0.04 * p;
      break;
    case 'whipL':
    case 'whipR': {
      const w = interpolate(l, [0, 9], [1, 0], {...CLAMP, easing: Easing.out(Easing.cubic)});
      out.x = (c.kind === 'whipL' ? -460 : 460) * w;
      out.blur = 18 * w;
      out.ry = (c.kind === 'whipL' ? 10 : -10) * w;
      break;
    }
    case 'roll': {
      const w = interpolate(l, [0, 16], [1, 0], {...CLAMP, easing: Easing.out(Easing.back(1.6))});
      out.rz = -7 * w;
      out.s = 1 + 0.1 * w;
      break;
    }
    case 'punch':
      out.s = 1 + 0.12 * interpolate(l, [0, 12], [1, 0], {...CLAMP, easing: Easing.out(Easing.cubic)});
      break;
    case 'rise':
      out.y = 70 - 90 * p;
      out.rx = -6 + 6 * p;
      break;
    default:
      break;
  }
  return out;
};

export const Reel: React.FC<{data: ReelData; id: string}> = ({data, id}) => {
  const {spec, captions, lip, frames} = data;
  setLip(lip);
  const frame = useCurrentFrame();
  const base = PACKS[(spec.pack ?? spec.n - 1) % PACKS.length];
  const pack = useMemo(() => ({...base, fx: spec.fx ?? base.fx, bg: spec.bg ?? base.bg}), [base, spec.fx, spec.bg]);
  const F = useMemo(() => makeF(captions.marks), [captions.marks]);
  const [handle] = useState(() => delayRender('fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([loadAllFonts(), loadFont3d(pack.three)])
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch(cancelRender);
  }, [handle, pack.three]);

  const worlds = useMemo(() => spec.worlds.map(([t, w]) => ({from: F(t), world: w})), [spec, F]);
  const sections = useMemo(() => spec.sections.map(([t, name]) => ({from: F(t), name})), [spec, F]);
  const cams = useMemo(() => (spec.cams ?? []).map(([t, kind]) => ({from: F(t), kind})), [spec, F]);
  const hits = useMemo(() => (spec.hits ?? []).map((t) => F(t)), [spec, F]);
  const scenes = useMemo(() => spec.scenes.map((s) => ({s, a: F(s.a), b: F(s.b)})), [spec, F]);
  const poses: PoseKey[] = useMemo(() => spec.poses.map(([t, pose]) => ({f: F(t), pose})), [spec, F]);
  const faces: FaceKey[] = useMemo(() => {
    let last: FaceKey['face'] = 'neutral';
    return spec.poses.map(([t, , face]) => {
      if (face) last = face;
      return {f: F(t), face: last};
    });
  }, [spec, F]);
  const places = useMemo(
    () =>
      (spec.places ?? [[0, 'c', 0.78]]).map(([t, where, sc]) => ({
        f: F(t),
        x: where === 'l' ? 290 : where === 'r' ? 790 : where === 'c' ? 540 : (where as number),
        s: sc ?? 0.78,
      })),
    [spec, F],
  );
  const hides = useMemo(() => (spec.hideMascot ?? []).map(([a, b]) => [F(a), F(b)] as [number, number]), [spec, F]);
  const capYs = useMemo(() => (spec.captionY ?? []).map(([t, y]) => ({f: F(t), y})), [spec, F]);

  const {glow, glow2, accent} = worldAt(frame, worlds);
  const e = energy(frame);
  let kick = 0;
  for (const h of hits) {
    const d = frame - h;
    if (d >= 0 && d < 24) kick += Math.exp(-d / 6);
  }
  const cam = camAt(frame, cams, frames);
  const zoom = (1 + 0.012 * e + 0.022 * kick + Math.sin(frame * 0.012) * 0.004) * cam.s;
  const drift = Math.sin(frame * 0.017) * 5;

  // mascot place (eased between places)
  let pi = 0;
  places.forEach((p, k) => {
    if (p.f <= frame) pi = k;
  });
  const cur = places[pi];
  const prev = places[Math.max(0, pi - 1)];
  const pt = interpolate(frame, [cur.f, cur.f + 12], [0, 1], {...CLAMP, easing: Easing.bezier(0.3, 1.3, 0.5, 1)});
  const mx = prev.x + (cur.x - prev.x) * pt;
  const ms = prev.s + (cur.s - prev.s) * pt;
  let hide = 0;
  for (const [a, b] of hides) {
    hide = Math.max(hide, Math.min(interpolate(frame, [a - 8, a + 4], [0, 1], CLAMP), interpolate(frame, [b - 6, b + 8], [1, 0], CLAMP)));
  }
  const my = 1610 + hide * 900;

  let capY = 842;
  capYs.forEach((c) => {
    if (c.f <= frame) capY = c.y;
  });

  const ghost = (spec.ghosts ?? []).map(([a, b, text]) => ({a: F(a), b: F(b), text})).find((g) => frame >= g.a && frame < g.b);
  const ctx = useMemo(() => ({spec, pack, marks: captions.marks, frames, F}), [spec, pack, captions.marks, frames, F]);

  return (
    <ReelCtx.Provider value={ctx}>
      <AbsoluteFill style={{background: '#07060a'}}>
        <Html5Audio src={staticFile(`reels/${id}/mix.wav`)} />
        {ready ? (
          <>
            <AbsoluteFill style={{transform: `translateX(${cam.x * 0.25}px) scale(${1 + (zoom - 1) * 0.4})`}}>
              <Background frame={frame} glow={glow} glow2={glow2} pulse={e + kick * 0.7} kind={pack.bg} accent={accent} />
            </AbsoluteFill>
            <AbsoluteFill
              style={{
                transform: `perspective(1800px) translate(${cam.x}px, ${drift + cam.y}px) rotateX(${cam.rx}deg) rotateY(${cam.ry}deg) rotateZ(${cam.rz}deg) scale(${zoom})`,
                transformOrigin: '50% 45%',
                filter: cam.blur > 0.5 ? `blur(${cam.blur}px)` : undefined,
              }}
            >
              {ghost ? <GhostWord text={ghost.text} frame={frame} from={ghost.a} font={pack.display} /> : null}
              {scenes.map(({s, a, b}, i) => {
                const Comp = SCENES[s.type];
                if (!Comp) return null;
                return (
                  <Beat key={i} f={frame} a={a} b={b} out={(s.out as number) ?? 7}>
                    {(o) => <Comp s={s} f={frame} a={a} b={b} o={o} accent={accent} pack={pack} F={F} day={spec.n} keyword={spec.keyword} title={spec.title} font3d={pack.three} />}
                  </Beat>
                );
              })}
            </AbsoluteFill>
            <AbsoluteFill style={{transform: `translate(${cam.x * 0.7}px, ${drift * 0.6}px) scale(${1 + (zoom - 1) * 0.6})`, transformOrigin: '50% 80%'}}>
              <div
                style={{
                  position: 'absolute',
                  left: mx - 190 * (ms / 0.7),
                  top: my - 22,
                  width: 380 * (ms / 0.7),
                  height: 54,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse, rgba(0,0,0,.62), transparent 70%)',
                }}
              />
              <div style={{position: 'absolute', left: mx - 340 * ms, top: my - 876 * ms, width: 680, height: 920, transform: `scale(${ms})`, transformOrigin: '0 0'}}>
                <Mascot frame={frame} poses={poses} faces={faces} accent={accent} glow={`${accent}aa`} />
              </div>
            </AbsoluteFill>
            <Caption frame={frame} accent={accent} pages={captions.pages} pack={pack} y={capY} dx={cam.x * 0.5} />
            <Header frame={frame} total={frames} accent={accent} day={spec.n} sections={sections} />
            <Finish frame={frame} />
          </>
        ) : null}
      </AbsoluteFill>
    </ReelCtx.Provider>
  );
};
