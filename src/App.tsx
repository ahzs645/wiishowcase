import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import HomeMenu from './components/HomeMenu';
import WiiSettings from './components/WiiSettings';
import useSounds from './hooks/useSounds';
import useMultiWebRTC from './hooks/useMultiWebRTC';
import useWiiAspectMode from './hooks/useWiiAspectMode';
import { useAppDispatch, useAppSelector } from './store/hooks';
import {
  SCREENS,
  setPhase,
  setCursorActive,
  toggleDevMode,
  setDevMode,
  setShowPairing,
  setShowHomeMenu,
  setSelectedChannel,
  setMenuZoomOut,
  setZoomOrigin,
  setMessageBoardDateOverride,
  setCalendarTargetDate,
  setPairingControllerId,
  clearMessageBoardState,
  returnToMenu,
  resetToBlack,
  type Screen,
  type ChannelDef,
  type ZoomOrigin,
} from './store/appSlice';

interface RouteInfo {
  mode: 'host' | 'companion';
  offer: string | null;
  sessionId: string | null;
}

function parseHash(): RouteInfo {
  const hash = window.location.hash;
  const match = hash.match(/^#\/companion\/([^/]+)\/(.+)$/);
  if (match) {
    return { mode: 'companion', sessionId: match[1], offer: match[2] };
  }
  const legacyMatch = hash.match(/^#\/companion\/(.+)$/);
  if (legacyMatch) {
    return { mode: 'companion', sessionId: null, offer: legacyMatch[1] };
  }
  return { mode: 'host', offer: null, sessionId: null };
}

export default function App() {
  const [route, setRoute] = useState<RouteInfo>(parseHash);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route.mode === 'companion') {
    return <CompanionController encodedOffer={route.offer!} sessionId={route.sessionId} />;
  }

  return <HostApp />;
}

interface RemotePointer {
  x: number;
  y: number;
  visible: boolean;
}

function RemotePointers({ pointersRef, notifyRef }: {
  pointersRef: React.RefObject<Record<string, RemotePointer>>;
  notifyRef: React.MutableRefObject<(() => void) | null>;
}) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    notifyRef.current = () => forceUpdate((n) => n + 1);
    return () => { notifyRef.current = null; };
  }, [notifyRef]);

  const pointers = pointersRef.current!;
  return (
    <>
      {Object.entries(pointers).map(([id, ptr]) => (
        <WiiPointer
          key={id}
          x={ptr.x}
          y={ptr.y}
          player={`P${parseInt(id) + 2}`}
          visible={ptr.visible}
        />
      ))}
    </>
  );
}

const HOST_APP_STYLE: React.CSSProperties = { height: '100vh', width: '100vw', overflow: 'hidden' };

function HostApp() {
  const dispatch = useAppDispatch();
  const phase = useAppSelector((s) => s.app.phase);
  const cursorActive = useAppSelector((s) => s.app.cursorActive);
  const devMode = useAppSelector((s) => s.app.devMode);
  const showPairing = useAppSelector((s) => s.app.showPairing);
  const showHomeMenu = useAppSelector((s) => s.app.showHomeMenu);
  const selectedChannel = useAppSelector((s) => s.app.selectedChannel);
  const menuZoomOut = useAppSelector((s) => s.app.menuZoomOut);
  const zoomOrigin = useAppSelector((s) => s.app.zoomOrigin);
  const messageBoardDateOverride = useAppSelector((s) => s.app.messageBoardDateOverride);
  const calendarTargetDate = useAppSelector((s) => s.app.calendarTargetDate);
  const pairingControllerId = useAppSelector((s) => s.app.pairingControllerId);

  const urlParams = new URLSearchParams(window.location.search);
  const startScreen = urlParams.get('screen');

  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const remotePointersRef = useRef<Record<string, RemotePointer>>({});
  const remotePointerTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const remotePointersNotify = useRef<(() => void) | null>(null);
  const prevButtonsRefs = useRef<Record<string, Record<string, boolean>>>({});

  const { play } = useSounds();
  const { className: aspectClass } = useWiiAspectMode();
  const dismissSafetyRef = useRef<(() => void) | null>(null);

  const handleRemoteMessage = useCallback((controllerId: number, msg: any) => {
    const updatePointer = (x: number, y: number) => {
      remotePointersRef.current[controllerId] = { x, y, visible: true };
      remotePointersNotify.current?.();
      clearTimeout(remotePointerTimeouts.current[controllerId]);
      remotePointerTimeouts.current[controllerId] = setTimeout(() => {
        if (remotePointersRef.current[controllerId]) {
          remotePointersRef.current[controllerId].visible = false;
          remotePointersNotify.current?.();
        }
      }, 500);
    };

    if (msg.type === 'state') {
      if (msg.pointer?.touching) {
        updatePointer(
          msg.pointer.x * window.innerWidth,
          msg.pointer.y * window.innerHeight,
        );
      } else if (msg.motion && (msg.motion.rotGamma !== 0 || msg.motion.rotBeta !== 0)) {
        const x = ((msg.motion.rotGamma + 90) / 180) * window.innerWidth;
        const y = ((msg.motion.rotBeta + 90) / 180) * window.innerHeight;
        updatePointer(
          Math.max(0, Math.min(window.innerWidth, x)),
          Math.max(0, Math.min(window.innerHeight, y)),
        );
      }

      if (msg.buttons) {
        const prev = prevButtonsRefs.current[controllerId] || {};
        const curr = msg.buttons;
        if (curr.A && !prev.A) {
          play('select');
          if (phase === 'safety') dismissSafetyRef.current?.();
          const ptr = remotePointersRef.current[controllerId];
          if (ptr) {
            const el = document.elementFromPoint(ptr.x, ptr.y);
            if (el) (el as HTMLElement).click();
          }
        }
        if (curr.B && !prev.B) {
          play('back');
          if (phase === 'channel-select') {
            dispatch(setSelectedChannel(null));
            dispatch(setMenuZoomOut(true));
            dispatch(setPhase('menu'));
            setTimeout(() => dispatch(setMenuZoomOut(false)), 400);
          } else if (phase === 'settings') {
            dispatch(setPhase('menu'));
          } else if (phase === 'messageboard') {
            dispatch(setPhase('menu'));
          } else if (phase === 'news') {
            dispatch(setPhase('menu'));
          }
        }
        prevButtonsRefs.current[controllerId] = { ...curr };
      }
      return;
    }

    if (msg.type === 'pointer') {
      updatePointer(msg.x * window.innerWidth, msg.y * window.innerHeight);
    }
    if (msg.type === 'pointer-up') {
      if (remotePointersRef.current[controllerId]) {
        remotePointersRef.current[controllerId].visible = false;
        remotePointersNotify.current?.();
      }
    }
    if (msg.type === 'button' && msg.action === 'down') {
      if (msg.button === 'A') {
        play('select');
        if (phase === 'safety') dismissSafetyRef.current?.();
        const ptr = remotePointersRef.current[controllerId];
        if (ptr) {
          const el = document.elementFromPoint(ptr.x, ptr.y);
          if (el) (el as HTMLElement).click();
        }
      }
      if (msg.button === 'B') {
        play('back');
        if (phase === 'settings') {
          dispatch(setPhase('menu'));
        }
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
  }, [phase, play, dispatch]);

  const {
    controllers,
    startHosting,
    acceptAnswer,
    connectedCount,
    availableSlots,
  } = useMultiWebRTC(handleRemoteMessage);

  const currentPairing = pairingControllerId != null ? controllers[pairingControllerId] : null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === '`') {
        dispatch(toggleDevMode());
        dispatch(setCursorActive(true));
      }
      if (devMode && /^[1-9]$/.test(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        if (SCREENS[index]) {
          dispatch(setPhase(SCREENS[index]));
          dispatch(setCursorActive(true));
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [devMode, dispatch]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'h' && e.ctrlKey) {
        e.preventDefault();
        if (phase === 'black' || phase === 'safety') return;
        dispatch(setShowHomeMenu(!showHomeMenu));
        if (!showHomeMenu) play('open');
        else play('close');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, play, showHomeMenu, dispatch]);

  useEffect(() => {
    if (devMode || startScreen) return;
    const timer = setTimeout(() => {
      dispatch(setPhase('safety'));
      dispatch(setCursorActive(true));
    }, 1200);
    return () => clearTimeout(timer);
  }, [devMode, startScreen, dispatch]);

  useEffect(() => {
    document.body.classList.toggle('wii-cursor-animated', cursorActive);
  }, [cursorActive]);

  const dismissSafety = useCallback(() => {
    play('select');
    dispatch(setPhase('menu'));
  }, [play, dispatch]);
  dismissSafetyRef.current = dismissSafety;

  const openMessageBoard = useCallback(() => {
    play('select');
    dispatch(setPhase('messageboard'));
  }, [play, dispatch]);

  const closeMessageBoard = useCallback(() => {
    play('back');
    dispatch(setPhase('menu'));
  }, [play, dispatch]);

  const openSettings = useCallback(() => {
    play('select');
    dispatch(setPhase('settings'));
  }, [play, dispatch]);

  const closeSettings = useCallback(() => {
    play('back');
    dispatch(setPhase('menu'));
  }, [play, dispatch]);

  useEffect(() => {
    if (phase !== 'messageboard') {
      dispatch(clearMessageBoardState());
    }
  }, [phase, dispatch]);

  const handleCalendarDateSelect = useCallback((date: Date) => {
    dispatch(setCalendarTargetDate(date.getTime()));
  }, [dispatch]);

  const openChannel = useCallback((channel: ChannelDef, origin: ZoomOrigin) => {
    play('open');
    dispatch(setSelectedChannel(channel));
    if (origin) dispatch(setZoomOrigin(origin));
    dispatch(setMenuZoomOut(false));
    dispatch(setPhase('channel-select'));
  }, [play, dispatch]);

  const closeChannel = useCallback(() => {
    play('close');
    dispatch(setSelectedChannel(null));
    dispatch(setMenuZoomOut(true));
    dispatch(setPhase('menu'));
    setTimeout(() => dispatch(setMenuZoomOut(false)), 400);
  }, [play, dispatch]);

  const switchChannel = useCallback((direction: number) => {
    if (!selectedChannel) return;
    const idx = SELECTABLE_CHANNELS.findIndex((ch) => ch.id === selectedChannel.id);
    if (idx === -1) return;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= SELECTABLE_CHANNELS.length) return;
    play('select');
    dispatch(setSelectedChannel(SELECTABLE_CHANNELS[nextIdx]));
  }, [selectedChannel, play, dispatch]);

  const startChannel = useCallback(() => {
    if (!selectedChannel) return;
    if (selectedChannel.action === 'news') {
      dispatch(setSelectedChannel(null));
      play('select');
      dispatch(setPhase('news'));
      return;
    }
    if (selectedChannel.target) {
      play('select');
      window.location.href = selectedChannel.target;
    }
  }, [selectedChannel, play, dispatch]);

  const closeNewsChannel = useCallback(() => {
    play('close');
    dispatch(setPhase('menu'));
  }, [play, dispatch]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'a' || e.key === 'A') && phase === 'safety') {
        dismissSafety();
        return;
      }
      if (e.key === 'Escape' && showHomeMenu) {
        play('close');
        dispatch(setShowHomeMenu(false));
        return;
      }
      if (e.key === 'Escape' && phase === 'messageboard') {
        play('back');
        dispatch(setPhase('menu'));
        return;
      }
      if (e.key === 'Escape' && phase === 'settings') {
        closeSettings();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, showHomeMenu, dismissSafety, closeSettings, play, dispatch]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  }, []);

  const openPairing = useCallback(async () => {
    dispatch(setShowPairing(true));
    const result = await startHosting();
    if (result) {
      dispatch(setPairingControllerId(result.controllerId));
    }
  }, [startHosting, dispatch]);

  const closePairing = useCallback(() => {
    dispatch(setShowPairing(false));
    dispatch(setPairingControllerId(null));
  }, [dispatch]);

  const handleAcceptAnswer = useCallback(async (answer: string) => {
    if (pairingControllerId != null) {
      await acceptAnswer(pairingControllerId, answer);
    }
  }, [pairingControllerId, acceptAnswer]);

  const closeHomeMenu = useCallback(() => {
    play('close');
    dispatch(setShowHomeMenu(false));
  }, [play, dispatch]);

  const handleHomeMenuWiiMenu = useCallback(() => {
    play('select');
    dispatch(setShowHomeMenu(false));
    dispatch(returnToMenu());
  }, [play, dispatch]);

  const handleHomeMenuReset = useCallback(() => {
    play('select');
    dispatch(setShowHomeMenu(false));
    dispatch(resetToBlack());
  }, [play, dispatch]);

  const jumpToScreen = useCallback((screen: Screen) => {
    dispatch(setPhase(screen));
    dispatch(setCursorActive(true));
  }, [dispatch]);

  const switchPrev = useCallback(() => switchChannel(-1), [switchChannel]);
  const switchNext = useCallback(() => switchChannel(1), [switchChannel]);

  const { hasPrev, hasNext } = useMemo(() => {
    if (!selectedChannel) return { hasPrev: false, hasNext: false };
    const idx = SELECTABLE_CHANNELS.findIndex((ch) => ch.id === selectedChannel.id);
    return { hasPrev: idx > 0, hasNext: idx < SELECTABLE_CHANNELS.length - 1 };
  }, [selectedChannel]);

  const calendarTargetDateObj = useMemo(
    () => calendarTargetDate ? new Date(calendarTargetDate) : null,
    [calendarTargetDate],
  );

  const handleDisplayedDateChange = useCallback((date: string | null) => {
    dispatch(setMessageBoardDateOverride(date));
  }, [dispatch]);

  return (
    <div
      className={`wii wii-bg-authentic ${aspectClass}${phase === 'messageboard' ? ' is-message-board-active' : ''}`}
      style={HOST_APP_STYLE}
      onMouseMove={handleMouseMove}
    >
      <WiiPointer x={cursorPos.x} y={cursorPos.y} player="P1" visible={cursorActive} />
      <RemotePointers pointersRef={remotePointersRef} notifyRef={remotePointersNotify} />

      {(phase === 'black' || phase === 'safety') && (
        <StartupBlack fadeOut={phase !== 'black'} />
      )}

      {(phase === 'safety' || phase === 'menu') && (
        <SafetyScreen
          visible={phase === 'safety'}
          fadeOut={phase === 'menu'}
          onDismiss={dismissSafety}
        />
      )}

      <WiiMenu
        visible={phase === 'menu' || phase === 'channel-select' || phase === 'messageboard'}
        fadeOut={phase === 'news'}
        mailLayerVisible={phase === 'messageboard'}
        onMailClose={closeMessageBoard}
        onSettingsClick={openSettings}
        zoomIn={phase === 'channel-select'}
        zoomOut={menuZoomOut}
        zoomOrigin={zoomOrigin}
        onMailClick={openMessageBoard}
        onChannelClick={openChannel}
        onCalendarDateSelect={handleCalendarDateSelect}
        onPairClick={openPairing}
        peerConnected={connectedCount > 0}
        dateOverride={phase === 'messageboard' ? messageBoardDateOverride : null}
      />

      <WiiSettings visible={phase === 'settings'} onBack={closeSettings} />

      <ChannelSelection
        visible={phase === 'channel-select'}
        channel={selectedChannel}
        onBack={closeChannel}
        onStart={startChannel}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onPrev={switchPrev}
        onNext={switchNext}
      />

      <WiiMessageBoard
        visible={phase === 'messageboard'}
        onDisplayedDateChange={handleDisplayedDateChange}
        targetDate={calendarTargetDateObj}
      />

      <WiiNewsChannel visible={phase === 'news'} onBack={closeNewsChannel} />

      <PairingScreen
        visible={showPairing}
        offer={currentPairing?.offer}
        state={(currentPairing?.state || 'creating') as 'creating' | 'waiting' | 'connected' | 'failed'}
        connectedCount={connectedCount}
        availableSlots={availableSlots}
        onAcceptAnswer={handleAcceptAnswer}
        onStartPairing={openPairing}
        onClose={closePairing}
      />

      <HomeMenu
        visible={showHomeMenu}
        onClose={closeHomeMenu}
        onWiiMenu={handleHomeMenuWiiMenu}
        onReset={handleHomeMenuReset}
        controllers={controllers}
        connectedCount={connectedCount}
      />

      {devMode && (
        <DevModeSelector
          screens={SCREENS}
          currentScreen={phase}
          onSelectScreen={jumpToScreen}
          onClose={() => dispatch(setDevMode(false))}
        />
      )}
    </div>
  );
}
