import React from 'react';
import {Composition} from 'remotion';
import {Reel} from './engine/Reel';
import {REELS} from './reels';
import {FPS, HEIGHT, WIDTH} from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    {Object.entries(REELS).map(([id, data]) => (
      <Composition key={id} id={id.toUpperCase()} component={Reel} durationInFrames={data.frames} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{id, data}} />
    ))}
  </>
);
