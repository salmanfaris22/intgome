import React from 'react';
import {FONT, SERIES_DAYS} from '../theme';

/** Series header: DAY 07 / 30 — SECTION, plus a progress line. */
export const Header: React.FC<{frame: number; total: number; accent: string; day: number; sections: {from: number; name: string}[]}> = ({frame, total, accent, day, sections}) => {
  let i = 0;
  sections.forEach((s, k) => {
    if (s.from <= frame) i = k;
  });
  const local = frame - sections[i].from;
  const name = sections[i].name;
  const shownN = Math.min(name.length, Math.floor(local / 1.1));
  const dot = 0.45 + 0.55 * Math.abs(Math.sin(frame * 0.09));
  return (
    <div style={{position: 'absolute', left: 64, right: 64, top: 226, fontFamily: FONT.mono}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, fontSize: 26, letterSpacing: 2, color: 'rgba(246,241,234,.56)'}}>
        <span style={{width: 11, height: 11, borderRadius: 6, background: accent, opacity: dot, boxShadow: `0 0 12px ${accent}`}} />
        <span style={{color: '#fff', fontWeight: 700}}>DAY {String(day).padStart(2, '0')}</span>
        <span>/ {SERIES_DAYS} —</span>
        <span>{name.slice(0, shownN)}</span>
      </div>
      <div style={{marginTop: 18, height: 2, background: 'rgba(255,255,255,.12)', position: 'relative'}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(frame / total) * 100}%`, background: accent, boxShadow: `0 0 12px ${accent}`}} />
      </div>
    </div>
  );
};
