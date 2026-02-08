import { useState, useEffect, useCallback, useRef } from 'react';
import StartupBlack from './components/StartupBlack';
import SafetyScreen from './components/SafetyScreen';
import WiiMenu, { SELECTABLE_CHANNELS } from './components/WiiMenu';
import WiiMessageBoard from './components/WiiMessageBoard';
import WiiNewsChannel from './components/WiiNewsChannel';
import ChannelSelection from './components/ChannelSelection';
import WiiPointer from './components/WiiPointer';
import PairingScreen from './components/PairingScreen';
import CompanionController from './components/CompanionController';
import DevModeSelector from './components/DevModeSelector';
import useSounds from './hooks/useSounds';
import useMultiWebRTC from './hooks/useMultiWebRTC';

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

const SCREENS = ['black', 'safety', 'menu', 'channel-select', 'messageboard', 'news'];

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
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [menuZoomOut, setMenuZoomOut] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState(null);
  const [messageBoardDateOverride, setMessageBoardDateOverride] = useState(null);

  // Remote pointer state — one per controller (up to 4)
  const [remotePointers, setRemotePointers] = useState({});
  const remotePointersRef = useRef({});
  const remotePointerTimeouts = useRef({});
  const prevButtonsRefs = useRef({});

  const { play } = useSounds();
  const dismissSafetyRef = useRef(null);

  // Handle messages from any companion (controllerId identifies which one)
  const handleRemoteMessage = useCallback((controllerId, msg) => {
    const updatePointer = (x, y) => {
      remotePointersRef.current[controllerId] = { x, y, visible: true };
      setRemotePointers((prev) => ({
        ...prev,
        [controllerId]: { x, y, visible: true },
      }));
      clearTimeout(remotePointerTimeouts.current[controllerId]);
      remotePointerTimeouts.current[controllerId] = setTimeout(() => {
        setRemotePointers((prev) => ({
          ...prev,
          [controllerId]: { ...prev[controllerId], visible: false },
        }));
      }, 500);
    };

    // Unified state message (60Hz)
    if (msg.type === 'state') {
      // Pointer: prefer touch, fall back to gyro, keep last position on release
      if (msg.pointer?.touching) {
        updatePointer(
          msg.pointer.x * window.innerWidth,
          msg.pointer.y * window.innerHeight,
        );
      } else if (msg.motion && (msg.motion.rotGamma !== 0 || msg.motion.rotBeta !== 0)) {
        // Only use gyro aiming if we have non-zero motion data
        const x = ((msg.motion.rotGamma + 90) / 180) * window.innerWidth;
        const y = ((msg.motion.rotBeta + 90) / 180) * window.innerHeight;
        updatePointer(
          Math.max(0, Math.min(window.innerWidth, x)),
          Math.max(0, Math.min(window.innerHeight, y)),
        );
      }
      // If neither touching nor gyro active, pointer stays at last known position

      // Button edge detection per controller
      if (msg.buttons) {
        const prev = prevButtonsRefs.current[controllerId] || {};
        const curr = msg.buttons;
        if (curr.A && !prev.A) {
          play('select');
          if (phase === 'safety') dismissSafetyRef.current?.();
          // Simulate a click at the remote pointer's current position
          const ptr = remotePointersRef.current[controllerId];
          if (ptr) {
            const el = document.elementFromPoint(ptr.x, ptr.y);
            if (el) el.click();
          }
        }
        if (curr.B && !prev.B) {
          play('back');
          if (phase === 'channel-select') {
            setSelectedChannel(null);
            setMenuZoomOut(true);
            setPhase('menu');
            setTimeout(() => setMenuZoomOut(false), 400);
          } else if (phase === 'messageboard') {
            setPhase('menu');
          } else if (phase === 'news') {
            setPhase('menu');
          }
        }
        prevButtonsRefs.current[controllerId] = { ...curr };
      }
      return;
    }

    // Legacy handlers
    if (msg.type === 'pointer') {
      updatePointer(msg.x * window.innerWidth, msg.y * window.innerHeight);
    }
    if (msg.type === 'pointer-up') {
      setRemotePointers((prev) => ({
        ...prev,
        [controllerId]: { ...prev[controllerId], visible: false },
      }));
    }
    if (msg.type === 'button' && msg.action === 'down') {
      if (msg.button === 'A') {
        play('select');
        if (phase === 'safety') dismissSafetyRef.current?.();
        const ptr = remotePointersRef.current[controllerId];
        if (ptr) {
          const el = document.elementFromPoint(ptr.x, ptr.y);
          if (el) el.click();
        }
      }
      if (msg.button === 'B') {
        play('back');
      }
    }
    if (msg.type === 'orientation') {
      const x = ((msg.rotGamma + 90) / 180) * window.innerWidth;
      const y = ((msg.rotBeta + 90) / 180) * window.innerHeight;
      updatePointer(
        Math.max(0, Math.min(window.innerWidth, x)),
        Math.max(0, Math.min(window.innerHeight, y)),
      );
    }
  }, [phase, play]);

  const {
    controllers,
    startHosting,
    acceptAnswer,
    disconnectAll,
    connectedCount,
    availableSlots,
  } = useMultiWebRTC(handleRemoteMessage);

  // Track current pairing session (one at a time)
  const [pairingControllerId, setPairingControllerId] = useState(null);
  const currentPairing = pairingControllerId != null ? controllers[pairingControllerId] : null;

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
  dismissSafetyRef.current = dismissSafety;

  // Phase 3 → Phase 4: open message board
  const openMessageBoard = useCallback(() => {
    play('select');
    setPhase('messageboard');
  }, [play]);

  const closeMessageBoard = useCallback(() => {
    play('back');
    setPhase('menu');
  }, [play]);

  useEffect(() => {
    if (phase !== 'messageboard') {
      setMessageBoardDateOverride(null);
    }
  }, [phase]);

  // Open a channel selection screen
  const openChannel = useCallback((channel, origin) => {
    play('open');
    setSelectedChannel(channel);
    if (origin) setZoomOrigin(origin);
    setMenuZoomOut(false);
    setPhase('channel-select');
  }, [play]);

  // Close channel selection and return to menu
  const closeChannel = useCallback(() => {
    play('close');
    setSelectedChannel(null);
    setMenuZoomOut(true);
    setPhase('menu');
    setTimeout(() => setMenuZoomOut(false), 400);
  }, [play]);

  // Navigate to prev/next channel in selection screen
  const switchChannel = useCallback((direction) => {
    if (!selectedChannel) return;
    const idx = SELECTABLE_CHANNELS.findIndex((ch) => ch.id === selectedChannel.id);
    if (idx === -1) return;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= SELECTABLE_CHANNELS.length) return;
    play('select');
    setSelectedChannel(SELECTABLE_CHANNELS[nextIdx]);
  }, [selectedChannel, play]);

  // Handle "Start" on channel selection
  const startChannel = useCallback(() => {
    if (!selectedChannel) return;
    // If the channel has a special action (like 'news'), handle it
    if (selectedChannel.action === 'news') {
      setSelectedChannel(null);
      play('select');
      setPhase('news');
      return;
    }
    // For channels with a target URL, navigate there
    if (selectedChannel.target) {
      play('select');
      window.location.href = selectedChannel.target;
    }
  }, [selectedChannel, play]);

  const closeNewsChannel = useCallback(() => {
    play('close');
    setPhase('menu');
  }, [play]);

  // "A" key to dismiss safety screen
  useEffect(() => {
    function onKey(e) {
      if ((e.key === 'a' || e.key === 'A') && phase === 'safety') {
        dismissSafety();
        return;
      }
      if (e.key === 'Escape' && phase === 'messageboard') {
        play('back');
        setPhase('menu');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, dismissSafety, play]);

  // Cursor tracking
  const handleMouseMove = useCallback((e) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  }, []);

  // Open pairing screen and start hosting a new controller slot
  const openPairing = useCallback(async () => {
    setShowPairing(true);
    const result = await startHosting();
    if (result) {
      setPairingControllerId(result.controllerId);
    }
  }, [startHosting]);

  const closePairing = useCallback(() => {
    setShowPairing(false);
    setPairingControllerId(null);
  }, []);

  // Handle accepting an answer for the current pairing session
  const handleAcceptAnswer = useCallback(async (answer) => {
    if (pairingControllerId != null) {
      await acceptAnswer(pairingControllerId, answer);
    }
  }, [pairingControllerId, acceptAnswer]);

  // Dev mode: jump to specific screen
  const jumpToScreen = useCallback((screen) => {
    setPhase(screen);
    setCursorActive(true);
  }, []);

  return (
    <div
      className={`wii wii-bg-authentic${phase === 'messageboard' ? ' is-message-board-active' : ''}`}
      style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}
      onMouseMove={handleMouseMove}
    >
      {/* Local pointer (P1) */}
      <WiiPointer x={cursorPos.x} y={cursorPos.y} player="P1" visible={cursorActive} />

      {/* Remote pointers (P2-P4) from companions */}
      {Object.entries(remotePointers).map(([id, ptr]) => (
        <WiiPointer
          key={id}
          x={ptr.x}
          y={ptr.y}
          player={`P${parseInt(id) + 2}`}
          visible={ptr.visible}
        />
      ))}

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
        visible={phase === 'menu' || phase === 'channel-select' || phase === 'messageboard'}
        fadeOut={phase === 'news'}
        mailLayerVisible={phase === 'messageboard'}
        onMailClose={closeMessageBoard}
        zoomIn={phase === 'channel-select'}
        zoomOut={menuZoomOut}
        zoomOrigin={zoomOrigin}
        onMailClick={openMessageBoard}
        onChannelClick={openChannel}
        onPairClick={openPairing}
        peerConnected={connectedCount > 0}
        dateOverride={phase === 'messageboard' ? messageBoardDateOverride : null}
      />

      {/* Channel Selection Screen */}
      <ChannelSelection
        visible={phase === 'channel-select'}
        channel={selectedChannel}
        onBack={closeChannel}
        onStart={startChannel}
        hasPrev={selectedChannel ? SELECTABLE_CHANNELS.findIndex((ch) => ch.id === selectedChannel.id) > 0 : false}
        hasNext={selectedChannel ? SELECTABLE_CHANNELS.findIndex((ch) => ch.id === selectedChannel.id) < SELECTABLE_CHANNELS.length - 1 : false}
        onPrev={() => switchChannel(-1)}
        onNext={() => switchChannel(1)}
      />

      {/* Phase 4: Message Board */}
      <WiiMessageBoard
        visible={phase === 'messageboard'}
        onDisplayedDateChange={setMessageBoardDateOverride}
      />

      {/* News Channel */}
      <WiiNewsChannel
        visible={phase === 'news'}
        onBack={closeNewsChannel}
      />

      {/* Pairing overlay */}
      <PairingScreen
        visible={showPairing}
        offer={currentPairing?.offer}
        state={currentPairing?.state || 'creating'}
        connectedCount={connectedCount}
        availableSlots={availableSlots}
        onAcceptAnswer={handleAcceptAnswer}
        onStartPairing={openPairing}
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
