import { useRef, useCallback } from 'react';
import WiiSounds from '../lib/WiiSounds';

export default function useSounds() {
  const soundsRef = useRef(null);

  if (!soundsRef.current) {
    soundsRef.current = new WiiSounds({ basePath: '/assets/audio/' });
  }

  const play = useCallback((name) => {
    soundsRef.current.play(name);
  }, []);

  return { sounds: soundsRef.current, play };
}
