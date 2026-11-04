import * as THREE from 'three';
import {ICON_PATHS} from '../Icons';

/** Closed outlines for extruded 3D props (units ~ 1 = 1 world unit). */
const shield = () => {
  const s = new THREE.Shape();
  s.moveTo(0, 1.35);
  s.lineTo(1.1, 0.95);
  s.lineTo(1.1, 0.1);
  s.bezierCurveTo(1.1, -0.75, 0.5, -1.2, 0, -1.45);
  s.bezierCurveTo(-0.5, -1.2, -1.1, -0.75, -1.1, 0.1);
  s.lineTo(-1.1, 0.95);
  s.closePath();
  return s;
};
const check = () => {
  const s = new THREE.Shape();
  s.moveTo(-0.62, 0.05);
  s.lineTo(-0.38, 0.29);
  s.lineTo(-0.12, 0.03);
  s.lineTo(0.48, 0.63);
  s.lineTo(0.72, 0.39);
  s.lineTo(-0.12, -0.45);
  s.closePath();
  return s;
};
const bolt = () => {
  const s = new THREE.Shape();
  s.moveTo(0.25, 1.6);
  s.lineTo(-0.85, -0.1);
  s.lineTo(-0.05, -0.1);
  s.lineTo(-0.35, -1.6);
  s.lineTo(0.9, 0.35);
  s.lineTo(0.08, 0.35);
  s.closePath();
  return s;
};
const spark = () => {
  const s = new THREE.Shape();
  const R = 1.45;
  const r = 0.32;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) s.moveTo(x, y);
    else {
      // concave curve between tips
      const pa = ((i - 0.5) / 8) * Math.PI * 2 + Math.PI / 2;
      s.quadraticCurveTo(Math.cos(pa) * r * 0.6, Math.sin(pa) * r * 0.6, x, y);
    }
  }
  const pa = (7.5 / 8) * Math.PI * 2 + Math.PI / 2;
  s.quadraticCurveTo(Math.cos(pa) * r * 0.6, Math.sin(pa) * r * 0.6, Math.cos(Math.PI / 2) * R, Math.sin(Math.PI / 2) * R);
  return s;
};

const MAKERS: Record<string, () => THREE.Shape> = {shield, check, bolt, spark};

export const SHAPES = {
  shape: (k: string) => (MAKERS[k] ?? spark)(),
  icon: (name: string): string | null => (ICON_PATHS as Record<string, string>)[name] ?? null,
};
