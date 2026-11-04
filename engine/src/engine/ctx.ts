import {createContext, useContext} from 'react';
import {interpolate, spring} from 'remotion';
import type {Pack} from '../theme';
import type {Spec, T} from './types';

export type Ctx = {
  spec: Spec;
  pack: Pack;
  marks: Record<string, number>;
  frames: number;
  /** Time value -> frame. */
  F: (t: T) => number;
};

export const ReelCtx = createContext<Ctx>(null as unknown as Ctx);
export const useReel = () => useContext(ReelCtx);

export const makeF = (marks: Record<string, number>) => (t: T): number => {
  if (typeof t === 'number') return Math.round(t * 30);
  const m = /^@([\w-]+)\s*([+-]\s*[\d.]+)?$/.exec(t.trim());
  if (!m) throw new Error(`bad time ${t}`);
  const base = marks[m[1]];
  if (base === undefined) throw new Error(`unknown mark ${m[1]}`);
  return Math.round(base + (m[2] ? parseFloat(m[2].replace(/\s/g, '')) * 30 : 0));
};

export const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const pop = (f: number, from: number, damping = 13, stiffness = 170) =>
  spring({frame: f - from, fps: 30, config: {damping, stiffness, mass: 0.75}});

export const ramp = (f: number, a: number, b: number, from = 0, to = 1) => (b <= a ? (f >= a ? to : from) : interpolate(f, [a, b], [from, to], CLAMP));

export const pulse = (f: number, speed = 0.12) => 0.5 + 0.5 * Math.sin(f * speed);

/** Blend two hex colours. */
export const mixHex = (a: string, b: string, t: number) => {
  const p = (h: string, k: number) => parseInt(h.slice(1 + k * 2, 3 + k * 2), 16);
  return '#' + [0, 1, 2].map((k) => Math.round(p(a, k) + (p(b, k) - p(a, k)) * t).toString(16).padStart(2, '0')).join('');
};
