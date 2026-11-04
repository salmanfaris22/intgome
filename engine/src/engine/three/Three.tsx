import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import React, {useMemo} from 'react';
import {spring, staticFile} from 'remotion';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {TextGeometry} from 'three/examples/jsm/geometries/TextGeometry.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {Font} from 'three/examples/jsm/loaders/FontLoader.js';
import {TTFLoader} from 'three/examples/jsm/loaders/TTFLoader.js';
import {SHAPES} from './shapes';

/* ---------- fonts ---------- */

const fonts: Record<string, Font> = {};
export const loadFont3d = async (name: string) => {
  if (fonts[name]) return;
  const buf = await fetch(staticFile(`fonts3d/${name}.ttf`)).then((r) => r.arrayBuffer());
  fonts[name] = new Font(new TTFLoader().parse(buf) as never);
};

/* ---------- stage ---------- */

const Env: React.FC = () => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
  }, [gl, scene]);
  return null;
};

const Cam: React.FC<{pos: [number, number, number]; look?: [number, number, number]; fov: number}> = ({pos, look = [0, 0, 0], fov}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...pos);
  camera.fov = fov;
  camera.lookAt(...look);
  camera.updateProjectionMatrix();
  return null;
};

/**
 * A WebGL layer for the stage area. `orbit` (radians) swings the camera around the
 * subject, `dolly` moves it closer, so props get real 3D camera moves.
 */
export const Stage3D: React.FC<{
  top?: number;
  height?: number;
  accent: string;
  orbit?: number;
  lift?: number;
  dolly?: number;
  fov?: number;
  children: React.ReactNode;
}> = ({top = 150, height = 1000, accent, orbit = 0, lift = 0.6, dolly = 0, fov = 30, children}) => {
  const r = 9 - dolly;
  const pos: [number, number, number] = [Math.sin(orbit) * r, lift + Math.sin(orbit * 0.5) * 0.4, Math.cos(orbit) * r];
  return (
    <div style={{position: 'absolute', left: 0, top, width: 1080, height}}>
      <ThreeCanvas width={1080} height={height} gl={{antialias: true, alpha: true}} dpr={1}>
        <Env />
        <Cam pos={pos} fov={fov} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[4, 6, 7]} intensity={2.2} />
        <directionalLight position={[-6, 2, -4]} intensity={2.4} color={accent} />
        <pointLight position={[0, -3, 4]} intensity={6} distance={14} color={accent} />
        {children}
      </ThreeCanvas>
    </div>
  );
};

/* ---------- 3D type ---------- */

const sp = (f: number, from: number, damping = 12, stiffness = 140) => spring({frame: f - from, fps: 30, config: {damping, stiffness, mass: 0.8}});

export type Finish = 'chrome' | 'gold' | 'accent' | 'white' | 'glass';

const faceMat = (finish: Finish, accent: string) => {
  switch (finish) {
    case 'gold':
      return new THREE.MeshPhysicalMaterial({color: '#ffcf4a', metalness: 1, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15});
    case 'chrome':
      return new THREE.MeshPhysicalMaterial({color: '#e9edf5', metalness: 1, roughness: 0.12, clearcoat: 1});
    case 'accent':
      return new THREE.MeshPhysicalMaterial({color: accent, metalness: 0.35, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1});
    case 'glass':
      return new THREE.MeshPhysicalMaterial({color: '#ffffff', metalness: 0, roughness: 0.05, transmission: 0.92, thickness: 0.6, ior: 1.45, clearcoat: 1});
    default:
      return new THREE.MeshPhysicalMaterial({color: '#fbf7f0', metalness: 0.05, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2});
  }
};

/**
 * Extruded 3D title, one mesh per letter so letters flip in one after another.
 * Latin only (no Malayalam shaping in three.js).
 */
export const Title3D: React.FC<{
  text: string;
  font: string;
  f: number;
  from: number;
  accent: string;
  finish?: Finish;
  side?: string;
  size?: number;
  depth?: number;
  maxWidth?: number;
  y?: number;
  z?: number;
  stagger?: number;
  sway?: number;
  out?: number;
}> = ({text, font, f, from, accent, finish = 'white', side, size = 1, depth = 0.38, maxWidth = 7.4, y = 0, z = 0, stagger = 2.2, sway = 1, out = 0}) => {
  const fnt = fonts[font];
  const built = useMemo(() => {
    if (!fnt) return null;
    const res = (fnt.data as {resolution: number}).resolution;
    const glyphs = (fnt.data as {glyphs: Record<string, {ha: number}>}).glyphs;
    const front = faceMat(finish, accent);
    const sideMat = new THREE.MeshPhysicalMaterial({color: side ?? accent, metalness: 0.75, roughness: 0.32, clearcoat: 0.6});
    // '\n' splits lines; each line is centred, lines stack downwards
    const rows = text.split('\n');
    const letters: {geo: THREE.BufferGeometry | null; x: number; y: number}[] = [];
    let width = 0;
    rows.forEach((row, r) => {
      let x = 0;
      const start = letters.length;
      for (const ch of row) {
        const adv = ((glyphs[ch]?.ha ?? res * 0.3) * size) / res;
        if (ch === ' ') {
          x += adv;
          continue;
        }
        const g = new TextGeometry(ch, {font: fnt, size, depth, curveSegments: 6, bevelEnabled: true, bevelThickness: size * 0.035, bevelSize: size * 0.022, bevelSegments: 3});
        g.computeBoundingBox();
        const bb = g.boundingBox!;
        const cx = (bb.min.x + bb.max.x) / 2;
        g.translate(-cx, -size * 0.36, -depth / 2);
        letters.push({geo: g, x: x + cx, y: ((rows.length - 1) / 2 - r) * size * 1.22});
        x += adv;
      }
      for (let k = start; k < letters.length; k++) letters[k].x -= x / 2;
      width = Math.max(width, x);
    });
    return {letters, width, mats: [front, sideMat]};
  }, [fnt, text, size, depth, finish, accent, side]);
  if (!built) return null;
  const fit = Math.min(1, maxWidth / built.width);
  const ent = sp(f, from, 14, 120);
  const leave = out ? sp(f, out, 16, 160) : 0;
  return (
    <group position={[0, y, z]} scale={fit * (0.86 + 0.14 * ent)} rotation={[Math.sin(f * 0.035) * 0.06 * sway, Math.sin(f * 0.025) * 0.2 * sway, 0]}>
      {built.letters.map((l, i) => {
        if (!l.geo) return null;
        const t = sp(f, from + i * stagger, 11, 150);
        const gone = leave ? sp(f, out + i * 1.2, 14, 170) : 0;
        return (
          <mesh
            key={i}
            geometry={l.geo}
            material={built.mats}
            position={[l.x, l.y + (1 - t) * -1.2 + gone * 2.2, (1 - t) * -2]}
            rotation={[(1 - t) * -Math.PI * 0.55 + gone * 1.2, (1 - t) * 0.6, 0]}
            scale={Math.max(0.0001, t) * (1 - gone)}
          />
        );
      })}
    </group>
  );
};

/* ---------- props ---------- */

const RBox: React.FC<{
  w: number;
  h: number;
  d: number;
  r?: number;
  color: string;
  metal?: number;
  rough?: number;
  emissive?: string;
  ei?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  map?: THREE.Texture | null;
}> = ({w, h, d, r = 0.08, color, metal = 0.4, rough = 0.35, emissive, ei = 0, position, rotation, map}) => {
  const geo = useMemo(() => new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), [w, h, d, r]);
  return (
    <mesh geometry={geo} position={position} rotation={rotation}>
      <meshPhysicalMaterial color={color} metalness={metal} roughness={rough} clearcoat={0.7} clearcoatRoughness={0.2} emissive={emissive ?? '#000'} emissiveIntensity={ei} map={map ?? null} />
    </mesh>
  );
};

/** Screen content drawn on a canvas: icon + title + lines, in the reel's accent. */
const useScreen = (accent: string, screen?: ScreenSpec, w = 1024, h = 640) =>
  useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d')!;
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#15121c');
    bg.addColorStop(1, '#07060b');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(w / 2, h * 0.38, 10, w / 2, h * 0.38, w * 0.6);
    glow.addColorStop(0, accent + '55');
    glow.addColorStop(1, 'transparent');
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    const s = screen ?? {};
    if (s.icon && SHAPES.icon(s.icon)) {
      const k = (Math.min(w, h) * (s.title ? 0.34 : 0.5)) / 48;
      g.save();
      g.translate(w / 2 - 24 * k, h * (s.title ? 0.3 : 0.5) - 24 * k);
      g.scale(k, k);
      g.strokeStyle = accent;
      g.lineWidth = 3.2;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.shadowColor = accent;
      g.shadowBlur = 18;
      g.stroke(new Path2D(SHAPES.icon(s.icon)!));
      g.restore();
    }
    if (s.title) {
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      let fs = Math.round(Math.min(h * 0.13, w * 0.16));
      g.font = `800 ${fs}px Bricolage, Anek, sans-serif`;
      const tw = g.measureText(s.title).width;
      if (tw > w * 0.86) {
        fs = Math.floor((fs * w * 0.86) / tw);
        g.font = `800 ${fs}px Bricolage, Anek, sans-serif`;
      }
      g.fillText(s.title, w / 2, h * (s.icon ? 0.68 : 0.45));
    }
    (s.lines ?? []).forEach((line, i) => {
      g.fillStyle = i === 0 ? accent : 'rgba(255,255,255,.72)';
      g.textAlign = 'left';
      g.font = `600 ${Math.round(h * 0.062)}px JetBrainsMono, monospace`;
      g.fillText(line, w * 0.08, h * (s.title || s.icon ? 0.8 : 0.2) + i * h * 0.1);
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [accent, screen, w, h]);

export type ScreenSpec = {icon?: string; title?: string; lines?: string[]};

const Laptop: React.FC<{accent: string; screen?: ScreenSpec; open?: number}> = ({accent, screen, open = 1}) => {
  const tex = useScreen(accent, screen);
  // hinge at the back edge: closed = lid flat on the base, open = leaning back a little
  const lid = Math.PI / 2 + (-0.28 - Math.PI / 2) * open;
  return (
    <group position={[0, -0.9, 0.3]}>
      <RBox w={3.6} h={0.14} d={2.4} r={0.06} color="#9aa0ab" metal={0.9} rough={0.28} />
      <RBox w={3.0} h={0.02} d={1.1} r={0.01} color="#2a2d33" metal={0.3} rough={0.6} position={[0, 0.075, -0.35]} />
      <group position={[0, 0.08, -1.18]} rotation={[lid, 0, 0]}>
        <RBox w={3.6} h={2.35} d={0.1} r={0.06} color="#9aa0ab" metal={0.9} rough={0.28} position={[0, 1.18, -0.05]} />
        <mesh position={[0, 1.2, 0.006]}>
          <planeGeometry args={[3.34, 2.1]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};

const Phone: React.FC<{accent: string; screen?: ScreenSpec}> = ({accent, screen}) => {
  const tex = useScreen(accent, screen, 600, 1240);
  return (
    <group>
      <RBox w={1.5} h={3.0} d={0.16} r={0.2} color="#1b1c22" metal={0.6} rough={0.25} />
      <mesh position={[0, 0, 0.082]}>
        <planeGeometry args={[1.36, 2.84]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <RBox w={0.42} h={0.08} d={0.02} r={0.03} color="#000" position={[0, 1.32, 0.09]} />
      <RBox w={0.6} h={0.6} d={0.06} r={0.12} color="#2b2d35" metal={0.8} rough={0.2} position={[-0.35, 1.05, -0.1]} />
    </group>
  );
};

const Server: React.FC<{accent: string; f: number}> = ({accent, f}) => (
  <group position={[0, -0.2, 0]}>
    {[0, 1, 2].map((i) => (
      <group key={i} position={[0, -0.95 + i * 0.95, 0]}>
        <RBox w={3.0} h={0.78} d={2.0} r={0.07} color="#2a2c34" metal={0.85} rough={0.32} />
        <RBox w={2.7} h={0.1} d={0.02} r={0.02} color="#0c0d10" position={[0.0, 0.12, 1.0]} />
        {[0, 1, 2, 3, 4].map((k) => {
          const on = Math.sin(f * 0.35 + i * 2.1 + k * 1.7) > -0.2;
          return (
            <mesh key={k} position={[-1.15 + k * 0.17, -0.16, 1.01]}>
              <sphereGeometry args={[0.04, 12, 12]} />
              <meshBasicMaterial color={on ? (k === 0 ? '#3ddc84' : accent) : '#333'} toneMapped={false} />
            </mesh>
          );
        })}
        <RBox w={0.9} h={0.32} d={0.02} r={0.04} color={accent} emissive={accent} ei={0.6} position={[0.85, -0.12, 1.01]} />
      </group>
    ))}
  </group>
);

const Db: React.FC<{accent: string; f: number}> = ({accent, f}) => (
  <group position={[0, -0.1, 0]}>
    {[0, 1, 2].map((i) => (
      <group key={i} position={[0, -0.85 + i * 0.85, 0]}>
        <mesh>
          <cylinderGeometry args={[1.25, 1.25, 0.66, 64]} />
          <meshPhysicalMaterial color="#cfd3dc" metalness={0.9} roughness={0.22} clearcoat={1} />
        </mesh>
        <mesh position={[0, -0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.26, 0.035, 12, 80]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
        <mesh position={[0.9, 0.05, 0.87]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color={Math.sin(f * 0.3 + i) > 0 ? '#3ddc84' : '#1a3a26'} toneMapped={false} />
        </mesh>
      </group>
    ))}
  </group>
);

const Chip: React.FC<{accent: string; label?: string}> = ({accent}) => (
  <group rotation={[0.9, 0, 0]}>
    <RBox w={2.6} h={0.22} d={2.6} r={0.06} color="#1d2a22" metal={0.3} rough={0.6} />
    <RBox w={1.5} h={0.16} d={1.5} r={0.08} color="#c9ced8" metal={1} rough={0.18} position={[0, 0.18, 0]} />
    <RBox w={0.7} h={0.02} d={0.7} r={0.02} color={accent} emissive={accent} ei={1.2} position={[0, 0.27, 0]} />
    {new Array(10).fill(0).map((_, i) =>
      [0, 1, 2, 3].map((s) => {
        const p = -1.08 + i * 0.24;
        const pos: [number, number, number] = s === 0 ? [p, -0.05, 1.42] : s === 1 ? [p, -0.05, -1.42] : s === 2 ? [1.42, -0.05, p] : [-1.42, -0.05, p];
        return <RBox key={`${i}-${s}`} w={s < 2 ? 0.1 : 0.3} h={0.05} d={s < 2 ? 0.3 : 0.1} r={0.01} color="#e3b44a" metal={1} rough={0.25} position={pos} />;
      }),
    )}
  </group>
);

const Gpu: React.FC<{accent: string; f: number}> = ({accent, f}) => (
  <group rotation={[0.25, -0.3, 0]}>
    <RBox w={4.2} h={1.7} d={0.42} r={0.1} color="#24262d" metal={0.8} rough={0.3} />
    <RBox w={4.0} h={0.08} d={0.44} r={0.03} color={accent} emissive={accent} ei={1} position={[0, 0.82, 0]} />
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 1.05, 0, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.66, 0.66, 0.05, 48]} />
          <meshPhysicalMaterial color="#0c0d10" metalness={0.5} roughness={0.5} />
        </mesh>
        <group rotation={[0, f * 0.45 * s, 0]}>
          {new Array(7).fill(0).map((_, k) => (
            <mesh key={k} rotation={[0, (k / 7) * Math.PI * 2, 0.35]} position={[0, 0.04, 0]}>
              <boxGeometry args={[0.1, 0.02, 0.58]} />
              <meshPhysicalMaterial color="#3a3d47" metalness={0.6} roughness={0.35} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.04, 24]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      </group>
    ))}
    {new Array(14).fill(0).map((_, i) => (
      <RBox key={i} w={0.12} h={0.25} d={0.03} r={0.01} color="#e3b44a" metal={1} rough={0.25} position={[-1.3 + i * 0.18, -0.95, 0]} />
    ))}
  </group>
);

const Cloud: React.FC<{accent: string}> = ({accent}) => (
  <group>
    {[
      [0, 0.25, 0, 1.05],
      [-1.0, -0.15, 0.05, 0.78],
      [1.05, -0.12, 0.05, 0.82],
      [-0.45, -0.35, 0.35, 0.72],
      [0.5, -0.35, 0.35, 0.74],
      [0, -0.4, -0.2, 0.8],
    ].map(([x, y, z, r], i) => (
      <mesh key={i} position={[x, y, z]}>
        <sphereGeometry args={[r, 48, 48]} />
        <meshPhysicalMaterial color="#f4f6fb" roughness={0.42} metalness={0} clearcoat={0.4} emissive={accent} emissiveIntensity={0.06} />
      </mesh>
    ))}
  </group>
);

const Lock: React.FC<{accent: string; open?: number}> = ({open = 0}) => (
  <group position={[0, -0.4, 0]}>
    <RBox w={2.0} h={1.7} d={0.7} r={0.18} color="#f2c14b" metal={1} rough={0.2} />
    <group position={[0, 0.85 + open * 0.5, 0]} rotation={[0, open * 0.9, 0]}>
      <mesh position={[0, 0.55, 0]}>
        <torusGeometry args={[0.62, 0.15, 20, 48, Math.PI]} />
        <meshPhysicalMaterial color="#d9dde5" metalness={1} roughness={0.15} />
      </mesh>
      <mesh position={[-0.62, 0.25, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.6, 20]} />
        <meshPhysicalMaterial color="#d9dde5" metalness={1} roughness={0.15} />
      </mesh>
      <mesh position={[0.62, 0.25 - open * 0.3, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.6, 20]} />
        <meshPhysicalMaterial color="#d9dde5" metalness={1} roughness={0.15} />
      </mesh>
    </group>
    <mesh position={[0, 0.1, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.16, 0.16, 0.04, 24]} />
      <meshBasicMaterial color="#1b1206" />
    </mesh>
    <RBox w={0.12} h={0.4} d={0.04} r={0.02} color="#1b1206" position={[0, -0.18, 0.36]} />
  </group>
);

const useExtrude = (key: string, depth = 0.35, bevel = 0.06) =>
  useMemo(() => {
    const shape = SHAPES.shape(key);
    const g = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24});
    g.center();
    return g;
  }, [key, depth, bevel]);

const Extruded: React.FC<{shape: string; color: string; metal?: number; rough?: number; emissive?: string; ei?: number; depth?: number; scale?: number}> = ({
  shape,
  color,
  metal = 0.8,
  rough = 0.25,
  emissive,
  ei = 0,
  depth,
  scale = 1,
}) => {
  const g = useExtrude(shape, depth);
  return (
    <mesh geometry={g} scale={scale}>
      <meshPhysicalMaterial color={color} metalness={metal} roughness={rough} clearcoat={1} clearcoatRoughness={0.12} emissive={emissive ?? '#000'} emissiveIntensity={ei} />
    </mesh>
  );
};

const Robot: React.FC<{accent: string; f: number}> = ({accent, f}) => {
  const blink = Math.sin(f * 0.21) > 0.96 ? 0.15 : 1;
  return (
    <group>
      <RBox w={2.2} h={1.75} d={1.6} r={0.45} color="#f3f1ec" metal={0.1} rough={0.3} />
      <RBox w={1.75} h={0.8} d={0.12} r={0.3} color="#101016" metal={0.4} rough={0.1} position={[0, 0.02, 0.78]} />
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.04, 0.86]} scale={[1, blink, 1]}>
          <sphereGeometry args={[0.17, 24, 24]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 12]} />
        <meshPhysicalMaterial color="#c9ced8" metalness={1} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.15, 20, 20]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      {[-1.18, 1.18].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.32, 0.32, 0.22, 32]} />
          <meshPhysicalMaterial color="#c9ced8" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
};

const Globe: React.FC<{accent: string; f: number}> = ({accent, f}) => (
  <group>
    <mesh>
      <sphereGeometry args={[1.35, 48, 48]} />
      <meshPhysicalMaterial color="#0d1022" metalness={0.3} roughness={0.4} clearcoat={1} />
    </mesh>
    <mesh rotation={[0, f * 0.02, 0]}>
      <sphereGeometry args={[1.37, 24, 16]} />
      <meshBasicMaterial color={accent} wireframe transparent opacity={0.55} toneMapped={false} />
    </mesh>
    {[0, 1].map((i) => (
      <group key={i} rotation={[1.2 + i * 0.5, i * 1.1, 0.3]}>
        <mesh>
          <torusGeometry args={[2.0 + i * 0.3, 0.012, 8, 120]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
        </mesh>
        <mesh position={[Math.cos(f * (0.05 + i * 0.02)) * (2.0 + i * 0.3), Math.sin(f * (0.05 + i * 0.02)) * (2.0 + i * 0.3), 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      </group>
    ))}
  </group>
);

const KeyProp: React.FC = () => (
  <group rotation={[0, 0, 0.5]}>
    <mesh position={[-1.1, 0, 0]}>
      <torusGeometry args={[0.55, 0.2, 20, 48]} />
      <meshPhysicalMaterial color="#f2c14b" metalness={1} roughness={0.2} clearcoat={1} />
    </mesh>
    <RBox w={2.0} h={0.26} d={0.22} r={0.06} color="#f2c14b" metal={1} rough={0.2} position={[0.45, 0, 0]} />
    <RBox w={0.22} h={0.5} d={0.22} r={0.04} color="#f2c14b" metal={1} rough={0.2} position={[1.2, -0.3, 0]} />
    <RBox w={0.22} h={0.36} d={0.22} r={0.04} color="#f2c14b" metal={1} rough={0.2} position={[0.82, -0.24, 0]} />
  </group>
);

const Mic: React.FC<{accent: string}> = ({accent}) => (
  <group position={[0, -0.2, 0]}>
    <mesh position={[0, 0.7, 0]}>
      <capsuleGeometry args={[0.55, 0.9, 12, 32]} />
      <meshPhysicalMaterial color="#b8bdc8" metalness={0.9} roughness={0.45} />
    </mesh>
    <mesh position={[0, 0.7, 0]}>
      <capsuleGeometry args={[0.565, 0.9, 10, 24]} />
      <meshBasicMaterial color="#2b2f3a" wireframe transparent opacity={0.7} />
    </mesh>
    <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.6, 0.06, 12, 48]} />
      <meshBasicMaterial color={accent} toneMapped={false} />
    </mesh>
    <mesh position={[0, -0.75, 0]}>
      <cylinderGeometry args={[0.08, 0.08, 1.2, 16]} />
      <meshPhysicalMaterial color="#2a2c34" metalness={0.9} roughness={0.3} />
    </mesh>
    <mesh position={[0, -1.38, 0]}>
      <cylinderGeometry args={[0.7, 0.8, 0.12, 48]} />
      <meshPhysicalMaterial color="#2a2c34" metalness={0.9} roughness={0.3} />
    </mesh>
  </group>
);

const Camera: React.FC<{accent: string; f: number}> = ({accent, f}) => (
  <group rotation={[0.1, -0.5, 0]}>
    <RBox w={2.4} h={1.5} d={1.2} r={0.16} color="#1c1d23" metal={0.5} rough={0.35} />
    <mesh position={[0, 0, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.55, 0.62, 0.8, 48]} />
      <meshPhysicalMaterial color="#121318" metalness={0.7} roughness={0.25} />
    </mesh>
    <mesh position={[0, 0, 1.36]}>
      <circleGeometry args={[0.45, 48]} />
      <meshPhysicalMaterial color="#0b1030" metalness={0.2} roughness={0.05} clearcoat={1} emissive={accent} emissiveIntensity={0.25} />
    </mesh>
    <mesh position={[0, 0, 1.37]} rotation={[0, 0, 0]}>
      <ringGeometry args={[0.47, 0.53, 48]} />
      <meshBasicMaterial color={accent} toneMapped={false} />
    </mesh>
    <mesh position={[0.85, 0.5, 0.61]}>
      <sphereGeometry args={[0.09, 16, 16]} />
      <meshBasicMaterial color={Math.sin(f * 0.25) > 0 ? '#ff3b3b' : '#4a1010'} toneMapped={false} />
    </mesh>
  </group>
);

const Doc: React.FC<{accent: string; label?: string}> = ({accent}) => (
  <group rotation={[0, -0.25, 0.05]}>
    {[2, 1, 0].map((i) => (
      <group key={i} position={[i * 0.22, i * 0.18, -i * 0.25]}>
        <RBox w={2.0} h={2.6} d={0.05} r={0.04} color={i === 0 ? '#fbfaf7' : '#d9d6cf'} metal={0} rough={0.6} />
        {i === 0
          ? [0, 1, 2, 3, 4].map((k) => <RBox key={k} w={k === 4 ? 0.8 : 1.4} h={0.1} d={0.02} r={0.02} color="#b8b4ac" metal={0} rough={0.8} position={[(k === 4 ? -0.3 : 0), 0.35 - k * 0.3, 0.035]} />)
          : null}
        {i === 0 ? <RBox w={0.9} h={0.42} d={0.04} r={0.08} color={accent} emissive={accent} ei={0.4} position={[-0.42, 0.95, 0.04]} /> : null}
      </group>
    ))}
  </group>
);

const Containers: React.FC<{accent: string}> = ({accent}) => {
  const cols = ['#2f7cf6', accent, '#e9edf5', '#23b37a'];
  const pos: [number, number, number][] = [
    [-0.9, -0.55, 0],
    [0.9, -0.55, 0],
    [0, 0.35, 0],
    [0, -0.55, -1.0],
  ];
  return (
    <group rotation={[0.2, -0.5, 0]}>
      {pos.map((p, i) => (
        <group key={i} position={p}>
          <RBox w={1.7} h={0.82} d={0.9} r={0.05} color={cols[i]} metal={0.55} rough={0.35} />
          {new Array(8).fill(0).map((_, k) => (
            <RBox key={k} w={0.06} h={0.7} d={0.02} r={0.01} color="#00000055" metal={0.2} rough={0.8} position={[-0.7 + k * 0.2, 0, 0.46]} />
          ))}
        </group>
      ))}
    </group>
  );
};

const Coin: React.FC<{accent: string}> = () => {
  const tex = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 512;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#f2c14b';
    g.fillRect(0, 0, 512, 512);
    g.fillStyle = '#9b6d10';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '800 300px Bricolage, sans-serif';
    g.fillText('₹', 256, 270);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[1.3, 1.3, 0.22, 72]} />
        <meshPhysicalMaterial color="#f2c14b" metalness={1} roughness={0.2} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.112, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.12, 64]} />
        <meshPhysicalMaterial map={tex} metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
};

const Magnifier: React.FC<{accent: string}> = ({accent}) => (
  <group rotation={[0, 0, -0.6]}>
    <mesh>
      <torusGeometry args={[0.9, 0.14, 20, 64]} />
      <meshPhysicalMaterial color="#d9dde5" metalness={1} roughness={0.15} />
    </mesh>
    <mesh>
      <circleGeometry args={[0.9, 48]} />
      <meshPhysicalMaterial color={accent} transparent opacity={0.25} roughness={0.05} metalness={0} clearcoat={1} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, -1.6, 0]}>
      <cylinderGeometry args={[0.16, 0.2, 1.4, 24]} />
      <meshPhysicalMaterial color="#1c1d23" metalness={0.4} roughness={0.4} />
    </mesh>
  </group>
);

export type PropKind =
  | 'laptop'
  | 'phone'
  | 'server'
  | 'db'
  | 'chip'
  | 'gpu'
  | 'cloud'
  | 'lock'
  | 'shield'
  | 'robot'
  | 'globe'
  | 'key'
  | 'mic'
  | 'camera'
  | 'doc'
  | 'containers'
  | 'coin'
  | 'bolt'
  | 'magnifier'
  | 'spark';

export const PROPS: PropKind[] = ['laptop', 'phone', 'server', 'db', 'chip', 'gpu', 'cloud', 'lock', 'shield', 'robot', 'globe', 'key', 'mic', 'camera', 'doc', 'containers', 'coin', 'bolt', 'magnifier', 'spark'];

/** One prop with a spring entrance, idle float and slow turn. */
export const Prop3D: React.FC<{
  kind: PropKind;
  f: number;
  from: number;
  accent: string;
  x?: number;
  y?: number;
  z?: number;
  s?: number;
  spin?: number;
  turn?: number;
  screen?: ScreenSpec;
  open?: number;
  out?: number;
}> = ({kind, f, from, accent, x = 0, y = 0, z = 0, s = 1, spin = 1, turn = 0, screen, open, out}) => {
  const t = sp(f, from, 12, 120);
  const gone = out ? sp(f, out, 16, 170) : 0;
  const float = Math.sin((f - from) * 0.06) * 0.12;
  const ry = turn + (1 - t) * -Math.PI * 1.1 * spin + Math.sin((f - from) * 0.022) * 0.35;
  let body: React.ReactNode;
  switch (kind) {
    case 'laptop':
      body = <Laptop accent={accent} screen={screen} open={open ?? Math.min(1, sp(f, from + 6, 14, 90))} />;
      break;
    case 'phone':
      body = <Phone accent={accent} screen={screen} />;
      break;
    case 'server':
      body = <Server accent={accent} f={f} />;
      break;
    case 'db':
      body = <Db accent={accent} f={f} />;
      break;
    case 'chip':
      body = <Chip accent={accent} />;
      break;
    case 'gpu':
      body = <Gpu accent={accent} f={f} />;
      break;
    case 'cloud':
      body = <Cloud accent={accent} />;
      break;
    case 'lock':
      body = <Lock accent={accent} open={open ?? 0} />;
      break;
    case 'shield':
      body = (
        <group>
          <Extruded shape="shield" color={accent} metal={0.7} rough={0.22} depth={0.4} />
          <group position={[0, 0.05, 0.32]}>
            <Extruded shape="check" color="#ffffff" metal={0.2} rough={0.3} depth={0.12} emissive="#ffffff" ei={0.3} />
          </group>
        </group>
      );
      break;
    case 'robot':
      body = <Robot accent={accent} f={f} />;
      break;
    case 'globe':
      body = <Globe accent={accent} f={f} />;
      break;
    case 'key':
      body = <KeyProp />;
      break;
    case 'mic':
      body = <Mic accent={accent} />;
      break;
    case 'camera':
      body = <Camera accent={accent} f={f} />;
      break;
    case 'doc':
      body = <Doc accent={accent} />;
      break;
    case 'containers':
      body = <Containers accent={accent} />;
      break;
    case 'coin':
      body = <Coin accent={accent} />;
      break;
    case 'bolt':
      body = <Extruded shape="bolt" color="#ffd23f" metal={0.6} rough={0.2} emissive="#ff9d00" ei={0.35} depth={0.45} />;
      break;
    case 'magnifier':
      body = <Magnifier accent={accent} />;
      break;
    case 'spark':
      body = <Extruded shape="spark" color={accent} metal={0.55} rough={0.18} emissive={accent} ei={0.25} depth={0.4} />;
      break;
  }
  return (
    <group position={[x, y + float + (1 - t) * -1.5 + gone * 3, z]} scale={Math.max(0.0001, s * t * (1 - gone))} rotation={[0, ry, 0]}>
      {body}
    </group>
  );
};

/** Soft round shadow under props, drawn in 2D below the canvas. */
export const FloorGlow: React.FC<{y: number; color: string; o?: number; w?: number}> = ({y, color, o = 1, w = 560}) => (
  <div
    style={{
      position: 'absolute',
      left: 540 - w / 2,
      top: y,
      width: w,
      height: w * 0.22,
      borderRadius: '50%',
      opacity: o,
      background: `radial-gradient(ellipse, ${color}66 0%, rgba(0,0,0,.55) 45%, transparent 72%)`,
      filter: 'blur(6px)',
    }}
  />
);
