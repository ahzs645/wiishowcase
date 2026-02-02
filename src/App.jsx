import { useState, useEffect, useCallback, useRef } from 'react';
import StartupBlack from './components/StartupBlack';
import SafetyScreen from './components/SafetyScreen';
import WiiMenu from './components/WiiMenu';
import WiiMessageBoard from './components/WiiMessageBoard';
import WiiPointer from './components/WiiPointer';
import PairingScreen from './components/PairingScreen';
import CompanionController from './components/CompanionController';
import DevModeSelector from './components/DevModeSelector';
import useSounds from './hooks/useSounds';
import useWebRTC from './hooks/useWebRTC';

/**
 * Parse hash route to determine mode.
 *   #/companion/<sessionId>/<offer> → { mode: 'companion', sessionId, offer }
 *   #/companion/<offer>             → { mode: 'companion', sessionId: null, offer } (legacy)
 *   anything else                   → { mode: 'host' }
 */
function parseHash() {
  const hash = window.location.hash;
  // New format: #/companion/<sessionId>/<offer>
  const match = hash.match(/^#\/companion\/([^/]+)\/(.+)$/);
  if (match) {
    return { mode: 'companion', sessionId: match[1], offer: match[2] };
  }
  // Legacy format: #/companion/<offer>
  const legacyMatch = hash.match(/^#\/companion\/(.+)$/);
  if (legacyMatch) {
    return { mode: 'companion', sessionId: null, offer: legacyMatch[1] };
  }
  return { mode: 'host', offer: null, sessionId: null };
}

const SCREENS = ['black', 'safety', 'menu', 'messageboard'];

export default function App() {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route.mode === 'companion') {
    return <CompanionController encodedOffer={route.offer} sessionId={route.sessionId} />;
  }

  return <HostApp />;
}

// ---------- Host (Desktop) ----------

function HostApp() {
  // Check URL for dev mode (?dev=true)
  const urlParams = new URLSearchParams(window.location.search);
  const startInDevMode = urlParams.get('dev') === 'true';
  const startScreen = urlParams.get('screen');

  const [phase, setPhase] = useState(
    startScreen && SCREENS.includes(startScreen) ? startScreen : 'black'
  );
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorActive, setCursorActive] = useState(startInDevMode || startScreen);
  const [devMode, setDevMode] = useState(startInDevMode);
  const [showPairing, setShowPairing] = useState(false);

  // Remote pointer state (from companion via WebRTC)
  const [remotePointer, setRemotePointer] = useState({ x: 0.5, y: 0.5, visible: false });
  const remotePointerTimeout = useRef(null);

  const { play } = useSounds();

  // Handle messages from companion
  const handleRemoteMessage = useCallback((msg) => {
    if (msg.type === 'pointer') {
      setRemotePointer({
        x: msg.x * window.innerWidth,
        y: msg.y * window.innerHeight,
        visible: true,
      });
      // Hide remote pointer if no data for 500ms
      clearTimeout(remotePointerTimeout.current);
      remotePointerTimeout.current = setTimeout(() => {
        setRemotePointer((prev) => ({ ...prev, visible: false }));
      }, 500);
    }
    if (msg.type === 'pointer-up') {
      setRemotePointer((prev) => ({ ...prev, visible: false }));
    }
    if (msg.type === 'button' && msg.action === 'down') {
      if (msg.button === 'A') {
        // Simulate click at remote pointer position
        play('select');
        if (phase === 'safety') dismissSafety();
      }
      if (msg.button === 'B') {
        play('back');
      }
    }
    if (msg.type === 'orientation') {
      // Map gyro gamma (-90..90) to screen X, beta (-90..90) to screen Y
      const x = ((msg.gamma + 90) / 180) * window.innerWidth;
      const y = ((msg.beta + 90) / 180) * window.innerHeight;
      setRemotePointer({
        x: Math.max(0, Math.min(window.innerWidth, x)),
        y: Math.max(0, Math.min(window.innerHeight, y)),
        visible: true,
      });
      clearTimeout(remotePointerTimeout.current);
      remotePointerTimeout.current = setTimeout(() => {
        setRemotePointer((prev) => ({ ...prev, visible: false }));
      }, 500);
    }
  }, [phase, play]);

  const {
    state: peerState,
    offer,
    startHosting,
    acceptAnswer,
    disconnect,
  } = useWebRTC('host', handleRemoteMessage);

  // Toggle dev mode with backtick key, number keys for quick screen switch
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === '`') {
        setDevMode((prev) => !prev);
        setCursorActive(true);
      }
      // Number keys 1-4 to switch screens when in dev mode
      if (devMode && e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key, 10) - 1;
        if (SCREENS[index]) {
          setPhase(SCREENS[index]);
          setCursorActive(true);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [devMode]);

  // Phase 1 → Phase 2: black fades after 1.2s (skip in dev mode)
  useEffect(() => {
    if (devMode || startScreen) return;
    const timer = setTimeout(() => {
      setPhase('safety');
      setCursorActive(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [devMode, startScreen]);

  // Toggle body class for cursor hiding
  useEffect(() => {
    document.body.classList.toggle('wii-cursor-animated', cursorActive);
  }, [cursorActive]);

  // Phase 2 → Phase 3: dismiss safety
  const dismissSafety = useCallback(() => {
    play('select');
    setPhase('menu');
  }, [play]);

  // Phase 3 → Phase 4: open message board
  const openMessageBoard = useCallback(() => {
    play('select');
    setPhase('messageboard');
  }, [play]);

  // Phase 4 → Phase 3: back to menu
  const closeMessageBoard = useCallback(() => {
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

  // Open pairing screen and start hosting
  const openPairing = useCallback(() => {
    setShowPairing(true);
    startHosting();
  }, [startHosting]);

  const closePairing = useCallback(() => {
    setShowPairing(false);
    if (peerState !== 'connected') disconnect();
  }, [peerState, disconnect]);

  // Dev mode: jump to specific screen
  const jumpToScreen = useCallback((screen) => {
    setPhase(screen);
    setCursorActive(true);
  }, []);

  return (
    <div
      className="wii wii-bg-authentic"
      style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}
      onMouseMove={handleMouseMove}
    >
      {/* Local pointer (P1) */}
      <WiiPointer x={cursorPos.x} y={cursorPos.y} player="P1" visible={cursorActive} />

      {/* Remote pointer (P2) from companion */}
      <WiiPointer
        x={remotePointer.x}
        y={remotePointer.y}
        player="P2"
        visible={remotePointer.visible}
      />

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
      <WiiMenu
        visible={phase === 'menu'}
        fadeOut={phase === 'messageboard'}
        onMailClick={openMessageBoard}
        onPairClick={openPairing}
        peerConnected={peerState === 'connected'}
      />

      {/* Phase 4: Message Board */}
      <WiiMessageBoard
        visible={phase === 'messageboard'}
        onBack={closeMessageBoard}
      />

      {/* Pairing overlay */}
      <PairingScreen
        visible={showPairing}
        offer={offer}
        state={peerState}
        onAcceptAnswer={acceptAnswer}
        onClose={closePairing}
      />

      {/* Dev Mode Selector */}
      {devMode && (
        <DevModeSelector
          screens={SCREENS}
          currentScreen={phase}
          onSelectScreen={jumpToScreen}
          onClose={() => setDevMode(false)}
        />
      )}
    </div>
  );
}
