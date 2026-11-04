/**
 * Lip-sync data for the reel being rendered. One reel per page, so the Reel sets it
 * once at the top of its render and the mascot reads it.
 */
let open: number[] = [0];
let bright: number[] = [0];

export const setLip = (data: {open: number[]; bright: number[]}) => {
  open = data.open;
  bright = data.bright;
};

const at = (a: number[], f: number) => a[Math.max(0, Math.min(a.length - 1, Math.round(f)))] ?? 0;

/** Mouth open 0..1 for a frame, lightly smoothed so the mouth doesn't chatter. */
export const mouthOpen = (f: number) => at(open, f - 1) * 0.25 + at(open, f) * 0.5 + at(open, f + 1) * 0.25;

/** Vowel width 0..1 for a frame. */
export const mouthWide = (f: number) => at(bright, f);

/** Slow voice energy (about 0.4 s average) for camera + glow pulses. */
export const energy = (f: number) => {
  let s = 0;
  for (let i = -6; i <= 6; i++) s += at(open, f + i);
  return s / 13;
};
