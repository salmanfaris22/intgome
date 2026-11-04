export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const SERIES_DAYS = 30;
export const HANDLE = '@salmanfaris.dev';

export const C = {
  bg: '#07060a',
  ink: '#140d0c',
  white: '#f6f1ea',
  dim: 'rgba(246,241,234,0.32)',
  orange: '#f07a3e',
  orangeHi: '#ff9a5c',
  gold: '#ffc629',
  red: '#ef4e4e',
  blue: '#5b7cff',
  green: '#3ddc84',
  teal: '#2fd6c3',
  violet: '#9b6bff',
  pink: '#ff5fa2',
  lime: '#b6f03c',
  mono: 'rgba(246,241,234,0.62)',
};

export type Mood = 'ember' | 'red' | 'blue' | 'gold' | 'teal' | 'violet' | 'pink' | 'lime' | 'green';

/** Section colour worlds: bg glow + accent. All hex (callers append alpha suffixes). */
export const WORLD: Record<Mood, {glow: string; glow2: string; accent: string}> = {
  ember: {glow: '#c4531a', glow2: '#5e2410', accent: C.orange},
  red: {glow: '#a81e22', glow2: '#4d0f14', accent: C.red},
  blue: {glow: '#2740b8', glow2: '#121f5e', accent: C.blue},
  gold: {glow: '#b57a12', glow2: '#54340a', accent: C.gold},
  teal: {glow: '#0f8a7c', glow2: '#073d38', accent: C.teal},
  violet: {glow: '#5a2bb8', glow2: '#251258', accent: C.violet},
  pink: {glow: '#b0236a', glow2: '#4f0f30', accent: C.pink},
  lime: {glow: '#5f8a12', glow2: '#2a3d08', accent: C.lime},
  green: {glow: '#16864a', glow2: '#093a20', accent: C.green},
};

export type CaptionFx = 'pop' | 'type' | 'flip' | 'mask' | 'marker' | 'blur';
export type BgKind = 'grid' | 'dots' | 'rings' | 'lines' | 'beams' | 'stars';

/**
 * Font pack = the whole typographic voice of one reel. Reels rotate packs so the
 * series never looks like one template.
 */
export type Pack = {
  name: string;
  display: string; // latin display family (CSS)
  displayWeight: number;
  displayStretch?: string;
  displayTrack: number; // letter-spacing at 100px
  upper?: boolean;
  ml: string; // Malayalam bold family
  mlWeight: number;
  mlStretch?: string;
  accentLatin: string; // 's' words, latin
  accentLatinStyle: 'italic' | 'normal';
  accentMl: string; // 's' words, Malayalam
  accentMlWeight: number;
  accentSkew: number;
  three: string; // file in public/fonts3d (no extension)
  fx: CaptionFx;
  bg: BgKind;
  sizeScale: number; // caption size multiplier (wide fonts need less)
};

export const PACKS: Pack[] = [
  {
    name: 'classic',
    display: "'Bricolage', 'Anek', sans-serif",
    displayWeight: 800,
    displayTrack: -1,
    ml: "'Anek', 'Bricolage', sans-serif",
    mlWeight: 800,
    accentLatin: "'InstrumentSerif', serif",
    accentLatinStyle: 'italic',
    accentMl: "'NotoSerifML', serif",
    accentMlWeight: 500,
    accentSkew: -9,
    three: 'Bricolage-XB',
    fx: 'pop',
    bg: 'grid',
    sizeScale: 1,
  },
  {
    name: 'tech',
    display: "'SpaceGrotesk', 'NotoSansML', sans-serif",
    displayWeight: 700,
    displayTrack: -1.5,
    ml: "'NotoSansML', 'SpaceGrotesk', sans-serif",
    mlWeight: 800,
    accentLatin: "'JetBrainsMono', monospace",
    accentLatinStyle: 'normal',
    accentMl: "'NotoSansML', sans-serif",
    accentMlWeight: 400,
    accentSkew: 0,
    three: 'SpaceGrotesk-Bold',
    fx: 'type',
    bg: 'dots',
    sizeScale: 0.96,
  },
  {
    name: 'round',
    display: "'Unbounded', 'Baloo', sans-serif",
    displayWeight: 700,
    displayTrack: -2,
    ml: "'Baloo', 'Unbounded', sans-serif",
    mlWeight: 800,
    accentLatin: "'InstrumentSerif', serif",
    accentLatinStyle: 'italic',
    accentMl: "'Chilanka', cursive",
    accentMlWeight: 400,
    accentSkew: -4,
    three: 'Unbounded-Black',
    fx: 'flip',
    bg: 'rings',
    sizeScale: 0.86,
  },
  {
    name: 'editorial',
    display: "'Syne', 'Manjari', sans-serif",
    displayWeight: 800,
    displayTrack: -1,
    ml: "'Manjari', 'Syne', sans-serif",
    mlWeight: 700,
    accentLatin: "'InstrumentSerif', serif",
    accentLatinStyle: 'italic',
    accentMl: "'NotoSerifML', serif",
    accentMlWeight: 600,
    accentSkew: -9,
    three: 'Syne-XB',
    fx: 'mask',
    bg: 'lines',
    sizeScale: 1.02,
  },
  {
    name: 'poster',
    display: "'Anton', 'Anek', sans-serif",
    displayWeight: 400,
    displayTrack: 0.5,
    upper: true,
    ml: "'Anek', 'Anton', sans-serif",
    mlWeight: 800,
    mlStretch: '75%',
    accentLatin: "'Anton', sans-serif",
    accentLatinStyle: 'normal',
    accentMl: "'Anek', sans-serif",
    accentMlWeight: 700,
    accentSkew: 0,
    three: 'BigShoulders-Black',
    fx: 'marker',
    bg: 'beams',
    sizeScale: 1.08,
  },
  {
    name: 'wide',
    display: "'Archivo', 'Anek', sans-serif",
    displayWeight: 800,
    displayStretch: '125%',
    displayTrack: -1,
    ml: "'Anek', 'Archivo', sans-serif",
    mlWeight: 700,
    mlStretch: '125%',
    accentLatin: "'Sora', sans-serif",
    accentLatinStyle: 'normal',
    accentMl: "'Gayathri', sans-serif",
    accentMlWeight: 700,
    accentSkew: 0,
    three: 'Archivo-BlackExp',
    fx: 'blur',
    bg: 'stars',
    sizeScale: 0.84,
  },
];

export const FONT = {
  mono: "'JetBrainsMono', monospace",
  serif: "'InstrumentSerif', 'NotoSerifML', serif",
};

export const hasMl = (t: string) => /[ഀ-ൿ]/.test(t);
