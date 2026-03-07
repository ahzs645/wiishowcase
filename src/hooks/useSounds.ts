import { useRef, useCallback } from 'react';
import WiiSounds, { type SoundName } from '../lib/WiiSounds';

export default function useSounds() {
  const soundsRef = useRef<WiiSounds | null>(null);

  if (!soundsRef.current) {
    soundsRef.current = new WiiSounds({ basePath: `${import.meta.env.BASE_URL}assets/audio/` });
  }

  const play = useCallback((name: SoundName) => {
    soundsRef.current!.play(name);
  }, []);

  return { sounds: soundsRef.current, play };
}
