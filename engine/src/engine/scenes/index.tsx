import React from 'react';
import {Easing, interpolate, random} from 'remotion';
import {C, FONT, HANDLE, hasMl, SERIES_DAYS, type Pack} from '../../theme';
import {CLAMP, pop, pulse, ramp} from '../ctx';
import {Icon} from '../Icons';
import {Check, Dots, Extrude, fitSize, Glass, IconTile, Label, PackText, Spotlight, Tag, Tilt} from '../parts';
import {FloorGlow, Prop3D, Stage3D, Title3D, type Finish, type PropKind, type ScreenSpec} from '../three/Three';
import type {SceneSpec, T} from '../types';

export type SceneProps = {
  s: SceneSpec;
  f: number;
  a: number; // start frame
  b: number; // end frame
  o: number; // exit opacity
  accent: string;
  pack: Pack;
  F: (t: T) => number;
  day: number;
  keyword: string;
  title: string;
  font3d: string;
};

const tone = (t: string | undefined, accent: string) => (t === 'bad' ? C.red : t === 'good' ? C.green : t === 'gold' ? C.gold : accent);
const at = (F: (t: T) => number, v: unknown, dflt: number) => (v === undefined || v === null ? dflt : F(v as T));

/* ---------- HOOK: DAY badge + 3D title + secret keyword chip ---------- */

const Hook: React.FC<SceneProps> = ({s, f, a, b, accent, pack, F, day, keyword, title, font3d}) => {
  const tDay = pop(f, a, 12, 160);
  const kwAt = at(F, s.kwAt, a + 40);
  const unlock = pop(f, kwAt, 12, 170);
  const finish = (s.finish as Finish) ?? 'white';
  const txt = (s.title as string) ?? title;
  const spin = interpolate(f, [a, a + 18], [-140, 0], {...CLAMP, easing: Easing.out(Easing.back(1.3))});
  return (
    <>
      <Spotlight o={0.9} color={accent} />
      <div style={{position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: Math.min(1, tDay * 1.5)}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 18, transform: `scale(${0.6 + 0.4 * tDay})`}}>
          <span style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 40, letterSpacing: 8, color: C.mono}}>DAY</span>
          <Extrude text={String(day).padStart(2, '0')} pack={pack} size={150} face="#ffffff" face2={accent} side={accent} depth={22} ry={spin} rx={8} glow={accent} />
          <span style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 40, letterSpacing: 4, color: C.mono}}>/{SERIES_DAYS}</span>
        </div>
      </div>
      <Stage3D top={330} height={420} accent={accent} orbit={Math.sin((f - a) * 0.02) * 0.18} lift={0.3}>
        <Title3D text={txt} font={font3d} f={f} from={a + 6} accent={accent} finish={finish} size={1.15} maxWidth={6.6} y={-0.15} out={s.outAt ? F(s.outAt as T) : 0} />
      </Stage3D>
      <div style={{position: 'absolute', top: 680, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div style={{opacity: ramp(f, a + 16, a + 26), transform: `translateY(${(1 - ramp(f, a + 16, a + 26)) * 30}px)`, display: 'flex', alignItems: 'center', gap: 16}}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 26px',
              borderRadius: 40,
              background: 'rgba(16,13,20,.92)',
              border: `2px solid ${unlock > 0.5 ? accent : 'rgba(255,255,255,.2)'}`,
              boxShadow: unlock > 0.5 ? `0 0 34px ${accent}88` : 'none',
            }}
          >
            <Icon name={unlock > 0.5 ? 'unlock' : 'lock'} size={40} color={unlock > 0.5 ? accent : '#fff'} />
            <span style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 28, letterSpacing: 4, color: C.mono}}>SECRET KEYWORD</span>
            <span
              style={{
                fontFamily: pack.display,
                fontWeight: pack.displayWeight,
                fontStretch: pack.displayStretch,
                fontSize: 40,
                color: '#120b08',
                background: accent,
                borderRadius: 12,
                padding: '2px 16px',
                transform: `scale(${unlock})`,
                display: 'inline-block',
                minWidth: 10,
              }}
            >
              {keyword}
            </span>
          </div>
        </div>
      </div>
      {f > b - 10 ? null : null}
    </>
  );
};

/* ---------- PROP: a real 3D object with floating tags ---------- */

type LabelSpec = {t: T; text: string; icon?: string; x: number; y: number; tone?: string; solid?: boolean};

const Prop: React.FC<SceneProps> = ({s, f, a, accent, pack, F}) => {
  const from = at(F, s.at, a);
  const openAt = s.openAt !== undefined ? F(s.openAt as T) : null;
  const open = openAt === null ? undefined : Math.min(1, pop(f, openAt, 14, 120));
  const labels = (s.labels as LabelSpec[]) ?? [];
  const second = s.second as {kind: PropKind; at?: T; x?: number; y?: number; s?: number; screen?: ScreenSpec} | undefined;
  const orbit = s.orbit === false ? 0 : Math.sin((f - a) * 0.016) * 0.35 + (s.turn as number ?? 0);
  return (
    <>
      <FloorGlow y={690} color={accent} o={ramp(f, from, from + 10)} w={640} />
      <Stage3D top={190} height={600} accent={accent} orbit={orbit} dolly={interpolate(f, [a, a + 120], [0, 1.4], CLAMP)} lift={0.8}>
        <Prop3D kind={s.kind as PropKind} f={f} from={from} accent={accent} s={(s.s as number) ?? 1.2} x={(s.x as number) ?? 0} y={(s.y as number) ?? 0.15} screen={s.screen as ScreenSpec} open={open} />
        {second ? <Prop3D kind={second.kind} f={f} from={at(F, second.at, from + 10)} accent={accent} x={second.x ?? 2.2} y={second.y ?? 0.8} s={second.s ?? 0.5} screen={second.screen} /> : null}
      </Stage3D>
      {labels.map((l, i) => {
        const t = pop(f, F(l.t), 12, 180);
        const bob = Math.sin(f * 0.05 + i * 1.7) * 8;
        return (
          <div key={i} style={{position: 'absolute', left: l.x, top: l.y + bob, opacity: Math.min(1, t * 1.4), transform: `perspective(900px) translateY(${(1 - t) * 40}px) rotateY(${l.x < 400 ? 18 : -18}deg) scale(${0.7 + 0.3 * t})`}}>
            <Tag text={l.text} icon={l.icon} color={tone(l.tone, accent)} pack={pack} size={40} solid={l.solid} />
          </div>
        );
      })}
    </>
  );
};

/* ---------- CARDS ---------- */

type CardSpec = {t: T; icon: string; title: string; sub?: string; tone?: string};

const Cards: React.FC<SceneProps> = ({s, f, accent, pack, F}) => {
  const items = s.items as CardSpec[];
  const layout = (s.layout as string) ?? (items.length > 2 ? 'stack' : 'row');
  if (layout === 'row') {
    const n = items.length;
    const w = n === 1 ? 560 : n === 2 ? 420 : 300;
    const gap = 40;
    const x0 = 540 - (n * w + (n - 1) * gap) / 2;
    return (
      <>
        {items.map((c, i) => {
          const t = pop(f, F(c.t));
          const col = tone(c.tone, accent);
          return (
            <Tilt key={i} x={x0 + i * (w + gap)} y={330} w={w} t={t} ry={n === 1 ? -10 : i === 0 ? 14 : i === n - 1 ? -14 : 0} rx={6} rz={0}>
              <Glass glow={col} pad="30px 24px" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center'}}>
                <IconTile name={c.icon} color={col} size={n === 3 ? 110 : 130} t={pop(f, F(c.t) + 4, 10, 220)} />
                <PackText pack={pack} size={n === 3 ? 44 : 52} maxW={w - 52}>
                  {c.title}
                </PackText>
                {c.sub ? (
                  <PackText pack={pack} size={n === 3 ? 30 : 34} color={col} accent maxW={w - 52}>
                    {c.sub}
                  </PackText>
                ) : null}
              </Glass>
            </Tilt>
          );
        })}
      </>
    );
  }
  // stack
  return (
    <div style={{position: 'absolute', left: 110, top: 300, width: 860, transform: 'perspective(1500px) rotateX(6deg) rotateY(-9deg) rotateZ(1deg)'}}>
      {items.map((c, i) => {
        const t = pop(f, F(c.t));
        const col = tone(c.tone, accent);
        return (
          <div key={i} style={{marginBottom: 22, opacity: Math.min(1, t * 1.5), transform: `translateX(${(1 - t) * (i % 2 ? 120 : -120)}px) scale(${0.9 + 0.1 * t})`}}>
            <Glass glow={col} pad="18px 26px" radius={20} style={{display: 'flex', alignItems: 'center', gap: 24}}>
              <IconTile name={c.icon} color={col} size={92} />
              <div style={{display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0}}>
                <PackText pack={pack} size={48} maxW={640}>
                  {c.title}
                </PackText>
                {c.sub ? (
                  <PackText pack={pack} size={32} color={col} accent maxW={640}>
                    {c.sub}
                  </PackText>
                ) : null}
              </div>
            </Glass>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- TERMINAL ---------- */

type LineSpec = {t: T; text: string; kind?: 'cmd' | 'out' | 'ok' | 'err'};

const Terminal: React.FC<SceneProps> = ({s, f, a, accent, F}) => {
  const lines = s.lines as LineSpec[];
  const t = pop(f, a);
  return (
    <Tilt x={90} y={(s.y as number) ?? 320} w={900} t={t} ry={-10} rx={8} rz={-1}>
      <Glass glow={accent} pad="22px 30px 30px" style={{background: 'linear-gradient(160deg, rgba(14,16,22,.97), rgba(8,9,13,.98))'}}>
        <Dots title={(s.title as string) ?? 'terminal'} />
        <div style={{fontFamily: FONT.mono, fontSize: 34, lineHeight: 1.5}}>
          {lines.map((l, i) => {
            const st = F(l.t);
            if (f < st) return null;
            const kind = l.kind ?? (i === 0 ? 'cmd' : 'out');
            const n = kind === 'cmd' ? Math.min(l.text.length, Math.floor((f - st) * 1.7)) : l.text.length;
            const col = kind === 'ok' ? C.green : kind === 'err' ? C.red : kind === 'cmd' ? '#fff' : 'rgba(246,241,234,.62)';
            const typing = kind === 'cmd' && n < l.text.length;
            return (
              <div key={i} style={{display: 'flex', gap: 14, whiteSpace: 'nowrap', opacity: kind === 'cmd' ? 1 : ramp(f, st, st + 4)}}>
                {kind === 'cmd' ? <span style={{color: accent}}>$</span> : kind === 'ok' ? <span style={{color: C.green}}>✓</span> : kind === 'err' ? <span style={{color: C.red}}>✗</span> : <span style={{color: 'transparent'}}>$</span>}
                <span style={{color: col}}>
                  {l.text.slice(0, n)}
                  {typing || (i === lines.length - 1 && kind === 'cmd') ? <span style={{background: accent, color: 'transparent', opacity: Math.floor(f / 8) % 2 ? 1 : 0.2}}>_</span> : null}
                </span>
              </div>
            );
          })}
        </div>
      </Glass>
    </Tilt>
  );
};

/* ---------- CHAT ---------- */

const Chat: React.FC<SceneProps> = ({s, f, a, accent, pack, F}) => {
  const q = s.q as {t: T; text: string};
  const ans = s.ans as {t: T; text: string} | undefined;
  const t = pop(f, a);
  const qt = F(q.t);
  const qn = Math.min(q.text.length, Math.max(0, Math.floor((f - qt) * 1.4)));
  const words = ans ? ans.text.split(' ') : [];
  const an = ans ? Math.max(0, Math.min(words.length, Math.floor((f - F(ans.t)) / 2.2))) : 0;
  const bubble = (mine: boolean): React.CSSProperties => ({
    alignSelf: mine ? 'flex-end' : 'flex-start',
    maxWidth: 680,
    padding: '18px 24px',
    borderRadius: 26,
    borderBottomRightRadius: mine ? 6 : 26,
    borderBottomLeftRadius: mine ? 26 : 6,
    background: mine ? accent : 'rgba(255,255,255,.08)',
    color: mine ? '#100a08' : '#fff',
    border: mine ? 'none' : '1.5px solid rgba(255,255,255,.12)',
    fontSize: 34,
    lineHeight: 1.35,
  });
  return (
    <Tilt x={110} y={(s.y as number) ?? 300} w={860} t={t} ry={12} rx={6} rz={1}>
      <Glass glow={accent} pad="20px 26px 28px">
        <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20}}>
          <IconTile name={(s.icon as string) ?? 'ai'} color={accent} size={58} />
          <PackText pack={pack} size={34} maxW={560}>
            {(s.model as string) ?? 'AI Assistant'}
          </PackText>
          <span style={{marginLeft: 'auto', width: 12, height: 12, borderRadius: 6, background: C.green, boxShadow: `0 0 10px ${C.green}`}} />
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 16, fontFamily: hasMl(q.text) ? pack.ml : pack.display, fontWeight: 600}}>
          {f >= qt ? <div style={bubble(true)}>{q.text.slice(0, qn)}</div> : null}
          {ans && f >= F(ans.t) ? (
            <div style={{...bubble(false), fontFamily: hasMl(ans.text) ? pack.ml : pack.display}}>
              {an === 0 ? <span style={{letterSpacing: 6, opacity: 0.6}}>{'•••'.slice(0, 1 + (Math.floor(f / 5) % 3))}</span> : words.slice(0, an).join(' ')}
            </div>
          ) : null}
        </div>
      </Glass>
    </Tilt>
  );
};

/* ---------- COMPARE ---------- */

type Side = {title: string; icon?: string; items?: string[]; tone?: string; sub?: string};

const Compare: React.FC<SceneProps> = ({s, f, accent, pack, F}) => {
  const L = s.left as Side;
  const R = s.right as Side;
  const lt = pop(f, F(s.lt as T));
  const rt = pop(f, F(s.rt as T));
  const side = (d: Side, t: number, x: number, ry: number, from: number) => {
    const col = tone(d.tone, accent);
    return (
      <Tilt x={x} y={320} w={430} t={t} ry={ry} rx={6} rz={0}>
        <Glass glow={col} pad="24px 24px 28px" tint={col} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', minHeight: 330}}>
          {d.icon ? <IconTile name={d.icon} color={col} size={96} /> : null}
          <PackText pack={pack} size={46} maxW={375}>
            {d.title}
          </PackText>
          {d.sub ? (
            <PackText pack={pack} size={30} color={col} accent maxW={375}>
              {d.sub}
            </PackText>
          ) : null}
          {(d.items ?? []).map((it, i) => {
            const k = pop(f, from + 6 + i * 5, 12, 200);
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 12, opacity: k, transform: `translateY(${(1 - k) * 14}px)`}}>
                <Check t={k} size={30} bad={d.tone === 'bad'} />
                <PackText pack={pack} size={30} color="rgba(255,255,255,.86)" maxW={320}>
                  {it}
                </PackText>
              </div>
            );
          })}
        </Glass>
      </Tilt>
    );
  };
  const vsT = pop(f, Math.min(F(s.lt as T), F(s.rt as T)) + 4, 10, 200);
  return (
    <>
      {side(L, lt, 70, 16, F(s.lt as T))}
      {side(R, rt, 580, -16, F(s.rt as T))}
      <div style={{position: 'absolute', left: 540 - 50, top: 470, width: 100, height: 100, borderRadius: 50, background: '#0e0c12', border: `3px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${vsT}) rotate(${(1 - vsT) * -90}deg)`, boxShadow: `0 0 30px ${accent}88`, fontFamily: FONT.mono, fontWeight: 800, fontSize: 34, color: '#fff'}}>
        {(s.vs as string) ?? 'VS'}
      </div>
    </>
  );
};

/* ---------- LIST ---------- */

type ItemSpec = {t: T; text: string; icon?: string; tone?: string};

const List: React.FC<SceneProps> = ({s, f, a, accent, pack, F}) => {
  const items = s.items as ItemSpec[];
  const big = items.length <= 3;
  const dense = items.length >= 5;
  return (
    <div style={{position: 'absolute', left: 120, top: (s.y as number) ?? 300, width: 840, transform: 'perspective(1500px) rotateX(7deg) rotateY(-8deg) rotateZ(1.2deg)'}}>
      {s.title ? (
        <div style={{opacity: ramp(f, a, a + 8), marginBottom: 18}}>
          <Label color={accent} size={28}>
            {s.title as string}
          </Label>
        </div>
      ) : null}
      {items.map((it, i) => {
        const t = pop(f, F(it.t));
        const col = tone(it.tone, accent);
        return (
          <div key={i} style={{opacity: Math.min(1, t * 1.5), transform: `translateY(${(1 - t) * 50}px) scale(${0.9 + 0.1 * t})`, marginBottom: dense ? 9 : 16}}>
            <Glass glow={t > 0.5 ? col : undefined} pad={big ? '16px 26px' : dense ? '7px 20px' : '12px 22px'} radius={18} style={{display: 'flex', alignItems: 'center', gap: 22}}>
              {s.numbered ? (
                <span style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: big ? 40 : 32, color: col, width: big ? 60 : 50}}>{String(i + 1).padStart(2, '0')}</span>
              ) : it.icon ? (
                <IconTile name={it.icon} color={col} size={big ? 74 : dense ? 52 : 60} />
              ) : (
                <Check t={pop(f, F(it.t) + 4, 10, 230)} size={big ? 50 : 42} bad={it.tone === 'bad'} />
              )}
              <PackText pack={pack} size={big ? 50 : dense ? 35 : 40} maxW={s.numbered ? 680 : 650}>
                {it.text}
              </PackText>
            </Glass>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- STAT: big counting number ---------- */

const Stat: React.FC<SceneProps> = ({s, f, a, accent, pack, F}) => {
  const st = at(F, s.t, a);
  const dur = (s.dur as number) ?? 24;
  const p = interpolate(f, [st, st + dur], [0, 1], {...CLAMP, easing: Easing.out(Easing.cubic)});
  const from = (s.from as number) ?? 0;
  const to = s.to as number;
  const v = from + (to - from) * p;
  const dec = (s.dec as number) ?? 0;
  const txt = `${(s.prefix as string) ?? ''}${v.toLocaleString('en-IN', {minimumFractionDigits: dec, maximumFractionDigits: dec})}${(s.suffix as string) ?? ''}`;
  const t = pop(f, st, 11, 150);
  const finalTxt = `${(s.prefix as string) ?? ''}${to.toLocaleString('en-IN', {minimumFractionDigits: dec, maximumFractionDigits: dec})}${(s.suffix as string) ?? ''}`;
  const px = fitSize(finalTxt, pack, (s.size as number) ?? 190, 880);
  const fin = (s.finish as string) ?? 'gold';
  const face = fin === 'gold' ? '#fff3b0' : fin === 'white' ? '#ffffff' : '#ffffff';
  const face2 = fin === 'gold' ? '#ffc629' : fin === 'white' ? '#cfd2da' : accent;
  const side = fin === 'gold' ? '#b07a0a' : fin === 'white' ? '#6a6f7c' : accent;
  return (
    <>
      <Spotlight o={0.7} color={fin === 'gold' ? '#ffd9a8' : accent} />
      <div style={{position: 'absolute', top: 330, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: Math.min(1, t * 1.5), transform: `scale(${0.7 + 0.3 * t})`}}>
        <Extrude text={txt} pack={pack} size={px} face={face} face2={face2} side={side} depth={20} rx={10} ry={Math.sin((f - st) * 0.03) * 12} glow={face2} />
      </div>
      {s.label ? (
        <div style={{position: 'absolute', top: 610, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: ramp(f, st + 8, st + 16)}}>
          <Tag text={s.label as string} icon={s.icon as string} color={accent} pack={pack} size={38} />
        </div>
      ) : null}
    </>
  );
};

/* ---------- FLOW: nodes + connectors + packets ---------- */

type NodeSpec = {t: T; icon: string; label: string; tone?: string};

const Flow: React.FC<SceneProps> = ({s, f, accent, pack, F}) => {
  const nodes = s.nodes as NodeSpec[];
  const n = nodes.length;
  const size = n >= 4 ? 140 : 180;
  const span = n >= 4 ? 780 : 680;
  const xs = nodes.map((_, i) => 540 - span / 2 + (n === 1 ? span / 2 : (i * span) / (n - 1)));
  const y = (s.y as number) ?? 450;
  return (
    <div style={{position: 'absolute', inset: 0, transform: 'perspective(1600px) rotateX(10deg)'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {nodes.slice(1).map((nd, i) => {
          const t0 = F(nodes[i].t);
          const t1 = F(nd.t);
          const p = ramp(f, t0 + 4, t1);
          const x0 = xs[i] + size / 2 - 8;
          const x1 = xs[i + 1] - size / 2 + 8;
          const len = x1 - x0;
          return (
            <g key={i}>
              <line x1={x0} y1={y} x2={x0 + len * p} y2={y} stroke={accent} strokeWidth={5} strokeDasharray="14 10" strokeDashoffset={-f * 2} opacity={0.85} />
              {p >= 1 && s.packets !== false
                ? [0, 1].map((k) => {
                    const q = (((f - t1) * 0.025 + k * 0.5) % 1 + 1) % 1;
                    return <circle key={k} cx={x0 + len * q} cy={y} r={9} fill="#fff" opacity={0.9} style={{filter: `drop-shadow(0 0 8px ${accent})`}} />;
                  })
                : null}
            </g>
          );
        })}
      </svg>
      {nodes.map((nd, i) => {
        const t = pop(f, F(nd.t), 11, 190);
        const col = tone(nd.tone, accent);
        return (
          <div key={i} style={{position: 'absolute', left: xs[i] - 140, top: y - size / 2, width: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, opacity: Math.min(1, t * 1.5), transform: `translateY(${(1 - t) * 40}px)`}}>
            <IconTile name={nd.icon} color={col} size={size} t={0.6 + 0.4 * t} />
            <PackText pack={pack} size={n >= 4 ? 30 : 38} maxW={n >= 4 ? 230 : 270}>
              {nd.label}
            </PackText>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- WORD: huge kinetic word (3D) ---------- */

const Word: React.FC<SceneProps> = ({s, f, a, accent, pack, F, font3d}) => {
  const st = at(F, s.t, a);
  const text = s.text as string;
  const fin = (s.finish as Finish) ?? 'gold';
  const sub = s.sub as string | undefined;
  const subT = at(F, s.subT, st + 10);
  const use3d = !hasMl(text) && s.three !== false;
  const t = pop(f, st, 11, 150);
  return (
    <>
      <Spotlight o={0.85} color={fin === 'gold' ? '#ffd9a8' : accent} />
      {use3d ? (
        <Stage3D top={250} height={440} accent={accent} orbit={Math.sin((f - st) * 0.02) * 0.25} lift={0.2}>
          <Title3D text={text} font={font3d} f={f} from={st} accent={accent} finish={fin} size={(s.size as number) ?? 1.4} maxWidth={7.6} stagger={1.6} />
        </Stage3D>
      ) : (
        <div style={{position: 'absolute', top: 360, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: Math.min(1, t * 1.5), transform: `scale(${0.6 + 0.4 * t})`}}>
          <Extrude
            text={text}
            pack={pack}
            size={fitSize(text, pack, (s.px as number) ?? 150, 900)}
            face={fin === 'gold' ? '#fff3b0' : '#ffffff'}
            face2={fin === 'gold' ? '#ffc629' : fin === 'accent' ? accent : '#d6d9e0'}
            side={fin === 'gold' ? '#b07a0a' : accent}
            depth={18}
            rx={10}
            ry={interpolate(f, [st, st + 16], [-70, 0], {...CLAMP, easing: Easing.out(Easing.back(1.4))}) + Math.sin((f - st) * 0.03) * 8}
            glow={fin === 'gold' ? '#ffc629' : accent}
          />
        </div>
      )}
      {sub ? (
        <div style={{position: 'absolute', top: 650, left: 0, right: 0, textAlign: 'center', opacity: ramp(f, subT, subT + 8), transform: `translateY(${(1 - ramp(f, subT, subT + 8)) * 24}px)`}}>
          <PackText pack={pack} size={58} color={accent} accent maxW={960}>
            {sub}
          </PackText>
        </div>
      ) : null}
    </>
  );
};

/* ---------- CODE ---------- */

const KW = /\b(const|let|await|async|function|return|import|from|export|if|else|new|for|of|def|class|true|false|null|SELECT|FROM|WHERE|CREATE|INDEX|ON|FROM|RUN|COPY|CMD|EXPOSE)\b/;
const tokenize = (line: string, accent: string) =>
  line.split(/(\s+|[(){}[\].,;:=<>+\-*/'"`])/).map((tok, i) => {
    let color = '#e8e4dc';
    if (KW.test(tok)) color = accent;
    else if (/^\d+$/.test(tok)) color = C.gold;
    else if (/^[A-Z][a-zA-Z]+$/.test(tok)) color = '#7fd1ff';
    else if (/^[(){}[\].,;:=<>+\-*/]$/.test(tok)) color = 'rgba(246,241,234,.5)';
    return (
      <span key={i} style={{color}}>
        {tok}
      </span>
    );
  });

const Code: React.FC<SceneProps> = ({s, f, a, accent, F}) => {
  const lines = s.lines as {t: T; text: string}[];
  const t = pop(f, a);
  return (
    <Tilt x={80} y={(s.y as number) ?? 310} w={920} t={t} ry={11} rx={7} rz={1}>
      <Glass glow={accent} pad="22px 28px 28px" style={{background: 'linear-gradient(160deg, rgba(16,15,24,.97), rgba(9,8,14,.98))'}}>
        <Dots title={(s.title as string) ?? 'index.js'} />
        <div style={{fontFamily: FONT.mono, fontSize: 32, lineHeight: 1.55}}>
          {lines.map((l, i) => {
            const st = F(l.t);
            if (f < st) return null;
            const n = Math.min(l.text.length, Math.floor((f - st) * 2));
            return (
              <div key={i} style={{display: 'flex', gap: 20, whiteSpace: 'pre'}}>
                <span style={{color: 'rgba(246,241,234,.25)', width: 34, textAlign: 'right'}}>{i + 1}</span>
                <span>{tokenize(l.text.slice(0, n), accent)}</span>
              </div>
            );
          })}
        </div>
      </Glass>
    </Tilt>
  );
};

/* ---------- BARS ---------- */

const Bars: React.FC<SceneProps> = ({s, f, a, accent, pack, F}) => {
  const items = s.items as {label: string; v: number; t: T; tone?: string; text?: string}[];
  const t = pop(f, a);
  return (
    <Tilt x={100} y={(s.y as number) ?? 300} w={880} t={t} ry={-9} rx={7} rz={-1}>
      <Glass glow={accent} pad="22px 30px 16px">
        {s.title ? (
          <Label color="#fff" style={{marginBottom: 22}}>
            {s.title as string}
          </Label>
        ) : null}
        {items.map((it, i) => {
          const p = interpolate(f, [F(it.t), F(it.t) + 18], [0, 1], {...CLAMP, easing: Easing.out(Easing.cubic)});
          const col = tone(it.tone, accent);
          return (
            <div key={i} style={{marginBottom: 14}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 6}}>
                <PackText pack={pack} size={32} maxW={560}>
                  {it.label}
                </PackText>
                <span style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 32, color: col, opacity: p}}>{it.text ?? `${Math.round(it.v * p)}${(s.unit as string) ?? '%'}`}</span>
              </div>
              <div style={{height: 28, borderRadius: 10, background: 'rgba(255,255,255,.07)', overflow: 'hidden'}}>
                <div style={{width: `${it.v * p}%`, height: '100%', borderRadius: 10, background: `linear-gradient(90deg, ${col}aa, ${col})`, boxShadow: `0 0 20px ${col}88`}} />
              </div>
            </div>
          );
        })}
      </Glass>
    </Tilt>
  );
};

/* ---------- GAUGE ---------- */

const Gauge: React.FC<SceneProps> = ({s, f, a, accent, pack, F}) => {
  const st = at(F, s.t, a);
  const p = interpolate(f, [st, st + 26], [(s.from as number) ?? 0, (s.to as number) ?? 100], {...CLAMP, easing: Easing.out(Easing.back(1.2))});
  const jitter = f > st + 26 ? Math.sin(f * 0.9) * 0.6 : 0;
  const ang = -120 + ((p + jitter) / 100) * 240;
  const col = p > 70 ? (s.goodHigh === false ? C.red : C.green) : p > 40 ? C.gold : s.goodHigh === false ? C.green : C.red;
  const t = pop(f, a);
  return (
    <div style={{position: 'absolute', left: 540 - 260, top: 300, width: 520, height: 420, opacity: Math.min(1, t * 1.5), transform: `perspective(1200px) rotateX(14deg) scale(${0.8 + 0.2 * t})`}}>
      <svg width={520} height={400} viewBox="-260 -260 520 400" style={{overflow: 'visible'}}>
        <path d="M -207 120 A 240 240 0 1 1 207 120" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={34} strokeLinecap="round" />
        <path d="M -207 120 A 240 240 0 1 1 207 120" fill="none" stroke={col} strokeWidth={34} strokeLinecap="round" pathLength={100} strokeDasharray={`${p} 100`} style={{filter: `drop-shadow(0 0 14px ${col})`}} />
        <g transform={`rotate(${ang})`}>
          <path d="M -10 0 L 0 -200 L 10 0 Z" fill="#fff" />
        </g>
        <circle r={26} fill="#15131b" stroke="#fff" strokeWidth={5} />
      </svg>
      <div style={{position: 'absolute', top: 250, left: 0, right: 0, textAlign: 'center'}}>
        <span style={{fontFamily: pack.display, fontWeight: pack.displayWeight, fontSize: 92, color: '#fff', textShadow: `0 0 30px ${col}`}}>{s.text ? (s.text as string) : `${Math.round(p)}`}</span>
      </div>
      {s.label ? (
        <div style={{position: 'absolute', top: -40, left: 0, right: 0, textAlign: 'center'}}>
          <Label color={C.mono}>{s.label as string}</Label>
        </div>
      ) : null}
    </div>
  );
};

/* ---------- ICONS grid ---------- */

const Icons: React.FC<SceneProps> = ({s, f, accent, pack, F}) => {
  const items = s.items as {t: T; icon: string; label: string; tone?: string}[];
  const cols = (s.cols as number) ?? Math.min(3, items.length);
  const rows = Math.ceil(items.length / cols);
  const tile = rows > 1 ? 128 : 170;
  const step = rows > 1 ? 212 : 260;
  const cw = 310;
  const x0 = 540 - (cols * cw) / 2;
  return (
    <div style={{position: 'absolute', inset: 0, transform: 'perspective(1500px) rotateX(8deg)'}}>
      {items.map((it, i) => {
        const t = pop(f, F(it.t), 10, 200);
        const r = Math.floor(i / cols);
        const c = i % cols;
        const col = tone(it.tone, accent);
        return (
          <div key={i} style={{position: 'absolute', left: x0 + c * cw, top: ((s.y as number) ?? (rows > 1 ? 280 : 330)) + r * step, width: cw, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: Math.min(1, t * 1.6), transform: `translateZ(${(1 - t) * -300}px) rotateY(${(1 - t) * 90}deg)`}}>
            <IconTile name={it.icon} color={col} size={tile} />
            <PackText pack={pack} size={40} maxW={290}>
              {it.label}
            </PackText>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- STAMP overlay ---------- */

const Stamp: React.FC<SceneProps> = ({s, f, a, accent, pack, F}) => {
  const st = at(F, s.t, a);
  const t = interpolate(f, [st, st + 6], [0, 1], {...CLAMP, easing: Easing.out(Easing.back(2.4))});
  const col = s.color === 'bad' ? C.red : s.color === 'good' ? C.green : s.color === 'gold' ? C.gold : accent;
  const shake = f >= st + 4 && f < st + 12 ? (random(`st${f}`) - 0.5) * 10 : 0;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: Math.min(585, (s.y as number) ?? 520), display: 'flex', justifyContent: 'center', opacity: t > 0 ? 1 : 0}}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '14px 36px',
          border: `6px solid ${col}`,
          borderRadius: 18,
          color: col,
          background: 'rgba(10,8,12,.72)',
          transform: `translate(${shake}px, ${shake * 0.5}px) rotate(${(s.rot as number) ?? -8}deg) scale(${2.2 - 1.2 * t})`,
          opacity: Math.min(1, t * 2),
          boxShadow: `0 0 40px ${col}66`,
        }}
      >
        {s.icon ? <Icon name={s.icon as string} size={72} color={col} sw={4} /> : null}
        <PackText pack={pack} size={84} color={col} maxW={s.icon ? 760 : 860}>
          {s.text as string}
        </PackText>
      </div>
    </div>
  );
};

/* ---------- END: comment keyword + follow ---------- */

const End: React.FC<SceneProps> = ({s, f, a, b, accent, pack, F, day, keyword, font3d}) => {
  const kwT = at(F, s.kwAt, a + 4);
  const folT = at(F, s.followAt, Math.max(a + 30, b - 50));
  const typed = Math.min(keyword.length, Math.max(0, Math.floor((f - kwT - 10) / 2)));
  const card = pop(f, kwT + 6, 12, 170);
  const fol = pop(f, folT, 11, 170);
  const press = f > folT + 22 && f < folT + 30 ? 0.94 : 1;
  const followed = f >= folT + 26;
  return (
    <>
      <Spotlight o={0.9} color={accent} />
      <div style={{position: 'absolute', top: 285, left: 0, right: 0, textAlign: 'center', opacity: ramp(f, a, a + 8)}}>
        <Label color={C.mono} size={30}>
          COMMENT
        </Label>
      </div>
      <Stage3D top={290} height={250} accent={accent} orbit={Math.sin((f - a) * 0.03) * 0.25} lift={0.1} dolly={2.4}>
        <Title3D text={keyword} font={font3d} f={f} from={kwT} accent={accent} finish="gold" size={1.6} maxWidth={7} stagger={2} />
      </Stage3D>
      {/* IG-style comment box with the keyword being typed */}
      <div style={{position: 'absolute', left: 150, top: 545, width: 780, opacity: Math.min(1, card * 1.4), transform: `perspective(1200px) rotateX(${(1 - card) * 30}deg) translateY(${(1 - card) * 40}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '16px 22px', borderRadius: 40, background: 'rgba(255,255,255,.08)', border: '1.5px solid rgba(255,255,255,.18)'}}>
          <div style={{width: 54, height: 54, borderRadius: 27, background: `linear-gradient(135deg, ${accent}, #ffffff55)`, flex: 'none'}} />
          <span style={{fontFamily: pack.display, fontWeight: 600, fontSize: 36, color: '#fff', flex: 1, whiteSpace: 'nowrap'}}>
            {keyword.slice(0, typed)}
            <span style={{opacity: Math.floor(f / 8) % 2 ? 1 : 0, color: accent}}>|</span>
          </span>
          <span style={{fontFamily: pack.display, fontWeight: 700, fontSize: 32, color: typed >= keyword.length ? '#4aa3ff' : 'rgba(74,163,255,.4)'}}>Post</span>
        </div>
      </div>
      {/* Follow card */}
      <div style={{position: 'absolute', left: 190, top: 632, width: 700, opacity: Math.min(1, fol * 1.4), transform: `translateY(${(1 - fol) * 60}px) scale(${(0.85 + 0.15 * fol) * press})`}}>
        <Glass glow={accent} pad="14px 18px" radius={60} style={{display: 'flex', alignItems: 'center', gap: 18}}>
          <div style={{width: 64, height: 64, borderRadius: 32, border: `3px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', background: '#120f16'}}>
            <Icon name="code" size={36} color={accent} />
          </div>
          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <span style={{fontFamily: pack.display, fontWeight: 700, fontSize: 32, color: '#fff'}}>{HANDLE}</span>
            <span style={{fontFamily: FONT.mono, fontSize: 22, color: C.mono}}>
              DAY {String(day).padStart(2, '0')}/{SERIES_DAYS} · {day < SERIES_DAYS ? `DAY ${String(day + 1).padStart(2, '0')} NEXT` : 'SERIES COMPLETE'}
            </span>
          </div>
          <div style={{padding: '12px 26px', borderRadius: 30, background: followed ? 'rgba(255,255,255,.12)' : accent, color: followed ? '#fff' : '#120b08', fontFamily: pack.display, fontWeight: 800, fontSize: 30, whiteSpace: 'nowrap'}}>
            {followed ? 'Following ✓' : 'Follow'}
          </div>
        </Glass>
      </div>
    </>
  );
};

export const SCENES: Record<string, React.FC<SceneProps>> = {
  hook: Hook,
  prop: Prop,
  cards: Cards,
  terminal: Terminal,
  chat: Chat,
  compare: Compare,
  list: List,
  stat: Stat,
  flow: Flow,
  word: Word,
  code: Code,
  bars: Bars,
  gauge: Gauge,
  icons: Icons,
  stamp: Stamp,
  end: End,
};

export const pulseGlow = pulse;
