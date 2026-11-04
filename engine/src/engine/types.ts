import type {Face, Pose} from '../components/Mascot';
import type {Mood} from '../theme';

/** Time: seconds, or '@mark' / '@mark+0.3' / '@mark-0.2' (marks come from captions). */
export type T = number | string;

export type CamKind = 'drift' | 'push' | 'pull' | 'orbitL' | 'orbitR' | 'tilt' | 'whipL' | 'whipR' | 'roll' | 'punch' | 'rise';

export type SceneSpec = {type: string; a: T; b: T; [k: string]: unknown};

export type Spec = {
  n: number;
  title: string; // English topic, 3D title
  titleMl?: string; // Malayalam hook line under the title
  keyword: string; // comment keyword
  pack?: number;
  fx?: import('../theme').CaptionFx; // override the pack's caption effect
  bg?: import('../theme').BgKind; // override the pack's background
  worlds: [T, Mood][];
  sections: [T, string][];
  ghosts?: [T, T, string][];
  poses: [T, Pose, Face?][];
  places?: [T, 'l' | 'c' | 'r' | number, number?][];
  hits?: T[];
  cams?: [T, CamKind][];
  scenes: SceneSpec[];
  hideMascot?: [T, T][];
  captionY?: [T, number][];
};

export type CaptionWord = {t: string; k: string; s: number; e: number; a: number};
export type CaptionPage = {words: CaptionWord[]; from: number; to: number};
export type Captions = {pages: CaptionPage[]; marks: Record<string, number>};
export type Lip = {open: number[]; bright: number[]};

export type ReelData = {spec: Spec; captions: Captions; lip: Lip; frames: number};
