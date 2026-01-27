import { useState, useEffect, useCallback } from 'react';
import StartupBlack from './components/StartupBlack';
import SafetyScreen from './components/SafetyScreen';
import WiiMenu from './components/WiiMenu';
import useSounds from './hooks/useSounds';

export default function App() {
  const [phase, setPhase] = useState('black'); // black | safety | menu
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorActive, setCursorActive] = useState(false);
  const { play } = useSounds();

  // Phase 1 → Phase 2: black fades after 1.2s
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('safety');
      setCursorActive(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Toggle body class for cursor hiding
  useEffect(() => {
    document.body.classList.toggle('cursor-active', cursorActive);
  }, [cursorActive]);

  // Phase 2 → Phase 3: dismiss safety
  const dismissSafety = useCallback(() => {
    play('select');
    setPhase('menu');
  }, [play]);

  // "A" key to dismiss safety screen
  useEffect(() => {
    function onKey(e) {
      if ((e.key === 'a' || e.key === 'A') && phase === 'safety') {
        dismissSafety();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, dismissSafety]);

  // Cursor tracking
  const handleMouseMove = useCallback((e) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      className="wii wii-bg-authentic"
      style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}
      onMouseMove={handleMouseMove}
    >
      {/* Wii Pointer */}
      {cursorActive && (
        <img
          src="/assets/cursor.png"
          className="wii-pointer"
          style={{ display: 'block', left: cursorPos.x, top: cursorPos.y }}
          alt=""
        />
      )}

      {/* Phase 1: Black screen */}
      {(phase === 'black' || phase === 'safety') && (
        <StartupBlack fadeOut={phase !== 'black'} />
      )}

      {/* Phase 2: Safety screen */}
      {(phase === 'safety' || phase === 'menu') && (
        <SafetyScreen
          visible={phase === 'safety'}
          fadeOut={phase === 'menu'}
          onDismiss={dismissSafety}
        />
      )}

      {/* Phase 3: Wii Menu */}
      <WiiMenu visible={phase === 'menu'} />
    </div>
  );
}
