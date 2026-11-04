import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

let started: Promise<unknown> | null = null;

export const loadAllFonts = () => {
  if (started) return started;
  const f = (family: string, file: string, weight: string, style = 'normal', stretch?: string) =>
    loadFont({family, url: staticFile(`fonts/${file}`), weight, style, stretch, format: 'truetype'});
  started = Promise.all([
    f('Bricolage', 'Bricolage.ttf', '200 800'),
    f('InstrumentSerif', 'InstrumentSerif-Italic.ttf', '400', 'italic'),
    f('InstrumentSerif', 'InstrumentSerif-Regular.ttf', '400'),
    f('JetBrainsMono', 'JetBrainsMono.ttf', '100 800'),
    f('Anek', 'AnekMalayalam.ttf', '100 800', 'normal', '75% 125%'),
    f('NotoSerifML', 'NotoSerifMalayalam.ttf', '100 900'),
    f('NotoSansML', 'NotoSansMalayalam.ttf', '100 900', 'normal', '62.5% 100%'),
    f('Baloo', 'BalooChettan2.ttf', '400 800'),
    f('SpaceGrotesk', 'SpaceGrotesk.ttf', '300 700'),
    f('Unbounded', 'Unbounded.ttf', '200 900'),
    f('Chilanka', 'Chilanka.ttf', '400'),
    f('Syne', 'Syne.ttf', '400 800'),
    f('Manjari', 'Manjari-Bold.ttf', '700'),
    f('Anton', 'Anton.ttf', '400'),
    f('Archivo', 'Archivo.ttf', '100 900', 'normal', '62% 125%'),
    f('Gayathri', 'Gayathri-Bold.ttf', '700'),
    f('Sora', 'Sora.ttf', '100 800'),
  ]);
  return started;
};
