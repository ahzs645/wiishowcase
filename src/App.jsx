import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  lazy,
  Suspense,
} from "react";
import StartupBlack from "./components/StartupBlack";
import SafetyScreen from "./components/SafetyScreen";
import WiiMenu, { SELECTABLE_CHANNELS } from "./components/WiiMenu";
import WiiMessageBoard from "./components/WiiMessageBoard";
import WiiNewsChannel from "./components/WiiNewsChannel";
import ChannelSelection from "./components/ChannelSelection";
import WiiPointer from "./components/WiiPointer";
import ChannelSvgDefs from "./components/ChannelSvgDefs";
import PairingScreen from "./components/PairingScreen";
import CompanionController from "./components/CompanionController";
import DevModeSelector from "./components/DevModeSelector";
import HomeMenu from "./components/HomeMenu";
import WiiSettings from "./components/WiiSettings";
import WiiSystemUpdate from "./components/WiiSystemUpdate";
import useSounds from "./hooks/useSounds";
import { initUpdateChecker, checkForUpdates } from "./lib/updateChecker";
import useMultiWebRTC from "./hooks/useMultiWebRTC";
import useWiiAspectMode from "./hooks/useWiiAspectMode";
import { useSystemState, systemSnapshot } from "./lib/systemState";
import SDMenu from "./components/system/SDMenu";

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
    return { mode: "companion", sessionId: match[1], offer: match[2] };
  }
  // Legacy format: #/companion/<offer>
  const legacyMatch = hash.match(/^#\/companion\/(.+)$/);
  if (legacyMatch) {
    return { mode: "companion", sessionId: null, offer: legacyMatch[1] };
  }
  return { mode: "host", offer: null, sessionId: null };
}

const WiiNativeApplication = lazy(
  () => import("./components/WiiNativeApplication"),
);

const SCREENS = [
  "black",
  "safety",
  "menu",
  "settings",
  "channel-select",
  "messageboard",
  "news",
  "native-app",
];

export default function App() {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (route.mode === "companion") {
    return (
      <CompanionController
        encodedOffer={route.offer}
        sessionId={route.sessionId}
      />
    );
  }

  return <HostApp />;
}

// Isolated component for remote pointers — re-renders independently from App at 60Hz
function RemotePointers({ pointersRef, notifyRef }) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    notifyRef.current = () => forceUpdate((n) => n + 1);
    return () => {
      notifyRef.current = null;
    };
  }, [notifyRef]);

  const pointers = pointersRef.current;
  return Object.entries(pointers).map(([id, ptr]) => (
    <WiiPointer
      key={id}
      x={ptr.x}
      y={ptr.y}
      player={`P${parseInt(id) + 2}`}
      visible={ptr.visible}
    />
  ));
}

const HOST_APP_STYLE = { height: "100vh", width: "100vw", overflow: "hidden" };

// ---------- Host (Desktop) ----------

function HostApp() {
  // Check URL for dev mode (?dev=true)
  const urlParams = new URLSearchParams(window.location.search);
  const startInDevMode = urlParams.get("dev") === "true";
  const startScreen = urlParams.get("screen");

  const [phase, setPhase] = useState(
    startScreen && SCREENS.includes(startScreen) ? startScreen : "black",
  );
  const [cursorActive, setCursorActive] = useState(
    startInDevMode || startScreen,
  );
  const [devMode, setDevMode] = useState(startInDevMode);
  const [showPairing, setShowPairing] = useState(false);
  const [showHomeMenu, setShowHomeMenu] = useState(false);
  const [showSD, setShowSD] = useState(false);
  const [settingsDestination, setSettingsDestination] = useState(null);
  const [composeRequest, setComposeRequest] = useState(0);
  const resetTimer = useRef(null);
  useEffect(() => () => clearTimeout(resetTimer.current), []);
  const system = useSystemState();
  const selectableChannels = useMemo(
    () =>
      system.slots
        .map((id) => SELECTABLE_CHANNELS.find((ch) => ch.id === id))
        .filter(Boolean),
    [system.slots],
  );
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [nativeApplicationChannel, setNativeApplicationChannel] =
    useState("news");
  const [menuZoomOut, setMenuZoomOut] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState(null);
  const [messageBoardDateOverride, setMessageBoardDateOverride] =
    useState(null);
  const [calendarTargetDate, setCalendarTargetDate] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Wii System Update: null | 'prompt' (new build detected) | 'checking' (manual)
  const [systemUpdateMode, setSystemUpdateMode] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updatePromptSeen, setUpdatePromptSeen] = useState(false);

  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer;
    const activity = () => {
      setIdle(false);
      clearTimeout(timer);
      if (system.settings.burnIn)
        timer = setTimeout(() => setIdle(true), 300000);
    };
    activity();
    const events = ["pointermove", "pointerdown", "keydown"];
    events.forEach((name) => window.addEventListener(name, activity));
    return () => {
      clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, activity));
    };
  }, [system.settings.burnIn]);

  // Remote pointer state — one per controller (up to 4)
  // Use refs + forceUpdate on a dedicated component to avoid re-rendering entire App at 60Hz
  const remotePointersRef = useRef({});
  const remotePointerTimeouts = useRef({});
  const remotePointersNotify = useRef(null);
  const prevButtonsRefs = useRef({});

  // Companions stream state at ~60Hz, and each message updates remotePointersRef
  // synchronously. Re-rendering RemotePointers on every message means up to 4x60
  // React renders/sec. Coalesce them: the ref already holds the latest position,
  // so we only need to flush one render per animation frame (right before paint).
  const notifyRafRef = useRef(0);
  const scheduleNotify = useCallback(() => {
    if (notifyRafRef.current) return;
    notifyRafRef.current = requestAnimationFrame(() => {
      notifyRafRef.current = 0;
      remotePointersNotify.current?.();
    });
  }, []);
  useEffect(
    () => () => {
      if (notifyRafRef.current) cancelAnimationFrame(notifyRafRef.current);
    },
    [],
  );

  const { play, sounds } = useSounds();
  useEffect(() => {
    sounds.setVolume(system.settings.remoteVolume);
  }, [sounds, system.settings.remoteVolume]);
  const { className: aspectClass } = useWiiAspectMode();
  const dismissSafetyRef = useRef(null);
  const localPointerRef = useRef(null);

  // Handle messages from any companion (controllerId identifies which one)
  const handleRemoteMessage = useCallback(
    (controllerId, msg) => {
      const updatePointer = (x, y) => {
        remotePointersRef.current[controllerId] = { x, y, visible: true };
        scheduleNotify();
        clearTimeout(remotePointerTimeouts.current[controllerId]);
        remotePointerTimeouts.current[controllerId] = setTimeout(() => {
          if (remotePointersRef.current[controllerId]) {
            remotePointersRef.current[controllerId].visible = false;
            scheduleNotify();
          }
        }, 500);
      };

      // Unified state message (60Hz)
      if (msg.type === "state") {
        // Pointer: prefer touch, fall back to gyro, keep last position on release
        if (msg.pointer?.touching) {
          updatePointer(
            msg.pointer.x * window.innerWidth,
            msg.pointer.y * window.innerHeight,
          );
        } else if (
          msg.motion &&
          (msg.motion.rotGamma !== 0 || msg.motion.rotBeta !== 0)
        ) {
          // Only use gyro aiming if we have non-zero motion data
          const x =
            (((msg.motion.rotGamma *
              systemSnapshot().settings.sensorSensitivity) /
              3 +
              90) /
              180) *
            window.innerWidth;
          const y =
            (((msg.motion.rotBeta *
              systemSnapshot().settings.sensorSensitivity) /
              3 +
              90) /
              180) *
            window.innerHeight;
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
          if (curr.home && !prev.home) setShowHomeMenu((open) => !open);
          if (curr.A && curr.B && !(prev.A && prev.B) && phase === "menu") {
            const ptr = remotePointersRef.current[controllerId];
            const slot =
              ptr &&
              document
                .elementFromPoint(ptr.x, ptr.y)
                ?.closest("[data-slot-index]");
            slot?.dispatchEvent(
              new MouseEvent("contextmenu", {
                bubbles: true,
                cancelable: true,
              }),
            );
          }
          if (curr.A && !prev.A && !curr.B) {
            play("select");
            if (phase === "safety") dismissSafetyRef.current?.();
            // Simulate a click at the remote pointer's current position
            const ptr = remotePointersRef.current[controllerId];
            if (ptr) {
              const el = document.elementFromPoint(ptr.x, ptr.y);
              if (el?.applicationRenderer) {
                const bounds = el.getBoundingClientRect();
                el.applicationRenderer.handleInput({
                  controller: controllerId,
                  trig: 0x0800,
                  pointer: {
                    valid: true,
                    x: ((ptr.x - bounds.left) * el.width) / bounds.width,
                    y: ((ptr.y - bounds.top) * el.height) / bounds.height,
                  },
                });
              } else if (el) el.click();
            }
          }
          if (curr.B && !prev.B && !curr.A) {
            const dialog = document.querySelector(
              "wii-keyboard .is-open,.system-dialog,.message-board-memo,.system-settings,.home-menu-container,.system-sd-screen",
            );
            if (dialog) {
              (
                dialog.querySelector("button,input,textarea") || dialog
              ).dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: "Escape",
                  code: "Escape",
                  bubbles: true,
                  cancelable: true,
                }),
              );
              prevButtonsRefs.current[controllerId] = { ...curr };
              return;
            }
            play("back");
            if (phase === "channel-select") {
              setSelectedChannel(null);
              setMenuZoomOut(true);
              setPhase("menu");
              setTimeout(() => setMenuZoomOut(false), 400);
            } else if (phase === "settings") {
              setPhase("menu");
            } else if (phase === "messageboard") {
              setPhase("menu");
            } else if (phase === "native-app") {
              const renderer = document.querySelector(
                "[data-native-application] canvas",
              )?.applicationRenderer;
              if (renderer)
                renderer.handleInput({
                  controller: controllerId,
                  trig: 0x0400,
                });
              else setPhase("menu");
            } else if (phase === "news") {
              setPhase("menu");
            }
          }
          prevButtonsRefs.current[controllerId] = { ...curr };
        }
        return;
      }

      // Legacy handlers
      if (msg.type === "pointer") {
        updatePointer(msg.x * window.innerWidth, msg.y * window.innerHeight);
      }
      if (msg.type === "pointer-up") {
        if (remotePointersRef.current[controllerId]) {
          remotePointersRef.current[controllerId].visible = false;
          scheduleNotify();
        }
      }
      if (msg.type === "button" && msg.action === "down") {
        if (msg.button === "A") {
          play("select");
          if (phase === "safety") dismissSafetyRef.current?.();
          const ptr = remotePointersRef.current[controllerId];
          if (ptr) {
            const el = document.elementFromPoint(ptr.x, ptr.y);
            if (el?.applicationRenderer) {
              const bounds = el.getBoundingClientRect();
              el.applicationRenderer.handleInput({
                controller: controllerId,
                trig: 0x0800,
                pointer: {
                  valid: true,
                  x: ((ptr.x - bounds.left) * el.width) / bounds.width,
                  y: ((ptr.y - bounds.top) * el.height) / bounds.height,
                },
              });
            } else if (el) el.click();
          }
        }
        if (msg.button === "B") {
          play("back");
          if (phase === "settings") {
            setPhase("menu");
          }
        }
      }
      if (msg.type === "orientation") {
        const x = ((msg.rotGamma + 90) / 180) * window.innerWidth;
        const y = ((msg.rotBeta + 90) / 180) * window.innerHeight;
        updatePointer(
          Math.max(0, Math.min(window.innerWidth, x)),
          Math.max(0, Math.min(window.innerHeight, y)),
        );
      }
    },
    [phase, play, scheduleNotify],
  );

  const {
    controllers,
    startHosting,
    acceptAnswer,
    disconnectAll,
    connectedCount,
    availableSlots,
    sendToControllers,
    disconnectOne,
  } = useMultiWebRTC(handleRemoteMessage);

  // Track current pairing session (one at a time)
  const [pairingControllerId, setPairingControllerId] = useState(null);
  const currentPairing =
    pairingControllerId != null ? controllers[pairingControllerId] : null;

  // Toggle dev mode with backtick key, number keys for quick screen switch
  useEffect(() => {
    function onKeyDown(e) {
      if (
        document.querySelector("wii-keyboard .is-open") ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) ||
        e.target?.isContentEditable
      )
        return;
      if (e.key === "`") {
        setDevMode((prev) => !prev);
        setCursorActive(true);
      }
      // Number keys switch screens when in dev mode
      if (devMode && /^[1-9]$/.test(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        if (SCREENS[index]) {
          setPhase(SCREENS[index]);
          setCursorActive(true);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [devMode]);

  // Ctrl+H to toggle HOME Menu
  useEffect(() => {
    function onKeyDown(e) {
      if (
        document.querySelector("wii-keyboard .is-open") ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) ||
        e.target?.isContentEditable
      )
        return;
      if (e.key === "h" && e.ctrlKey) {
        e.preventDefault();
        if (phase === "black" || phase === "safety") return;
        setShowHomeMenu((prev) => {
          if (!prev) play("open");
          else play("close");
          return !prev;
        });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, play]);

  // Phase 1 → Phase 2: black fades after 1.2s (skip in dev mode)
  useEffect(() => {
    if (devMode || startScreen) return;
    const timer = setTimeout(() => {
      setPhase("safety");
      setCursorActive(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [devMode, startScreen]);

  // Toggle body class for cursor hiding
  useEffect(() => {
    document.body.classList.toggle("wii-cursor-animated", cursorActive);
  }, [cursorActive]);

  // Phase 2 → Phase 3: dismiss safety
  const dismissSafety = useCallback(() => {
    play("select");
    setPhase("menu");
  }, [play]);
  dismissSafetyRef.current = dismissSafety;

  // Phase 3 → Phase 4: open message board
  const openMessageBoard = useCallback(() => {
    play("select");
    setPhase("messageboard");
  }, [play]);

  const closeMessageBoard = useCallback(() => {
    play("back");
    setPhase("menu");
  }, [play]);

  const openSettings = useCallback(() => {
    play("select");
    setSettingsDestination(null);
    setPhase("settings");
  }, [play]);

  // Background update polling (no-op on local/dev servers)
  useEffect(() => {
    initUpdateChecker(setUpdateInfo);
    // Dev/testing hook: simulate an available update from the console
    window.triggerUpdate = () =>
      setUpdateInfo({
        hasUpdate: true,
        buildNumber: "test123",
        onReload: () => window.location.reload(),
      });
    return () => {
      delete window.triggerUpdate;
    };
  }, []);

  // Surface the update prompt once the user is on the menu, like a real Wii
  useEffect(() => {
    if (
      updateInfo &&
      !updatePromptSeen &&
      phase === "menu" &&
      !systemUpdateMode
    ) {
      setUpdatePromptSeen(true);
      play("open");
      setSystemUpdateMode("prompt");
    }
  }, [updateInfo, updatePromptSeen, phase, systemUpdateMode, play]);

  const openSystemUpdateCheck = useCallback(() => {
    setSystemUpdateMode("checking");
  }, [play]);

  const closeSystemUpdate = useCallback(() => {
    setSystemUpdateMode(null);
  }, []);

  const closeSettings = useCallback(() => {
    play("back");
    setPhase("menu");
  }, [play]);

  useEffect(() => {
    if (phase !== "messageboard") {
      setMessageBoardDateOverride(null);
      setCalendarTargetDate(null);
    }
  }, [phase]);

  const handleCalendarDateSelect = useCallback((date) => {
    setCalendarTargetDate(date);
  }, []);

  // Open a channel selection screen
  const openChannel = useCallback(
    (channel, origin) => {
      play("open");
      setSelectedChannel(channel);
      if (origin) setZoomOrigin(origin);
      setMenuZoomOut(false);
      setPhase("channel-select");
    },
    [play],
  );

  // Close channel selection and return to menu
  const closeChannel = useCallback(() => {
    play("close");
    setSelectedChannel(null);
    setMenuZoomOut(true);
    setPhase("menu");
    setTimeout(() => setMenuZoomOut(false), 400);
  }, [play]);

  // Navigate to prev/next channel in selection screen
  const switchChannel = useCallback(
    (direction) => {
      if (!selectedChannel) return;
      const idx = selectableChannels.findIndex(
        (ch) => ch.id === selectedChannel.id,
      );
      if (idx === -1) return;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= selectableChannels.length) return;
      play("select");
      setSelectedChannel(selectableChannels[nextIdx]);
    },
    [selectedChannel, play, selectableChannels],
  );

  // Handle "Start" on channel selection
  const startChannel = useCallback(() => {
    if (!selectedChannel) return;
    if (selectedChannel.action?.startsWith("native-")) {
      setNativeApplicationChannel(selectedChannel.action.slice(7));
      setSelectedChannel(null);
      play("select");
      setPhase("native-app");
      return;
    }
    // If the channel has a special action (like 'news'), handle it
    if (selectedChannel.action === "news") {
      setSelectedChannel(null);
      play("select");
      setPhase("news");
      return;
    }
    // For channels with a target URL, navigate there
    if (selectedChannel.target) {
      play("select");
      window.location.href = selectedChannel.target;
    }
  }, [selectedChannel, play, selectableChannels]);

  const closeNewsChannel = useCallback(() => {
    play("close");
    setPhase("menu");
  }, [play]);

  // "A" key to dismiss safety screen
  useEffect(() => {
    function onKey(e) {
      if (
        e.defaultPrevented ||
        document.querySelector("wii-keyboard .is-open") ||
        document.querySelector(".system-dialog-shade") ||
        document.querySelector(".message-board-opened") ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)
      )
        return;
      if ((e.key === "a" || e.key === "A") && phase === "safety") {
        dismissSafety();
        return;
      }
      if (e.key === "Escape" && showHomeMenu) {
        play("close");
        setShowHomeMenu(false);
        return;
      }
      if (e.key === "Escape" && phase === "messageboard") {
        play("back");
        setPhase("menu");
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, showHomeMenu, dismissSafety, closeSettings, play]);

  // Cursor tracking
  const handleMouseMove = useCallback((e) => {
    localPointerRef.current?.setPosition(e.clientX, e.clientY);
  }, []);

  // Open pairing screen and start hosting a new controller slot
  const openPairing = useCallback(async () => {
    setShowPairing(true);
    await startHosting(setPairingControllerId);
  }, [startHosting]);

  const closePairing = useCallback(() => {
    if (
      pairingControllerId != null &&
      controllers[pairingControllerId]?.state !== "connected"
    )
      disconnectOne(pairingControllerId);
    setShowPairing(false);
    setPairingControllerId(null);
  }, [pairingControllerId, controllers, disconnectOne]);

  // Handle accepting an answer for the current pairing session
  const handleAcceptAnswer = useCallback(
    async (answer) => {
      if (pairingControllerId != null) {
        await acceptAnswer(pairingControllerId, answer);
      }
    },
    [pairingControllerId, acceptAnswer],
  );

  // HOME Menu callbacks
  const closeHomeMenu = useCallback(() => {
    play("close");
    setShowHomeMenu(false);
  }, [play]);

  const handleHomeMenuWiiMenu = useCallback(() => {
    setShowHomeMenu(false);
    setShowSD(false);
    setPhase("menu");
    setSelectedChannel(null);
    setMenuZoomOut(false);
  }, [play]);

  const handleHomeMenuReset = useCallback(() => {
    setShowHomeMenu(false);
    setPhase("black");
    setCursorActive(false);
    setShowSD(false);
    setSelectedChannel(null);
    setMenuZoomOut(false);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setPhase("safety");
      setCursorActive(true);
    }, 1200);
  }, [play]);

  // Dev mode: jump to specific screen
  const jumpToScreen = useCallback((screen) => {
    setPhase(screen);
    setCursorActive(true);
  }, []);

  const switchPrev = useCallback(() => switchChannel(-1), [switchChannel]);
  const switchNext = useCallback(() => switchChannel(1), [switchChannel]);

  // Memoize hasPrev/hasNext to avoid inline findIndex in JSX
  const { hasPrev, hasNext } = useMemo(() => {
    if (!selectedChannel) return { hasPrev: false, hasNext: false };
    const idx = selectableChannels.findIndex(
      (ch) => ch.id === selectedChannel.id,
    );
    return { hasPrev: idx > 0, hasNext: idx < selectableChannels.length - 1 };
  }, [selectedChannel, selectableChannels]);

  return (
    <div
      className={`wii wii-bg-authentic ${aspectClass}${phase === "messageboard" ? " is-message-board-active" : ""}`}
      style={{
        ...HOST_APP_STYLE,
        ...(system.settings.aspect === "auto"
          ? {}
          : {
              width: `min(100vw, ${system.settings.aspect === "4:3" ? "133.333" : "177.778"}vh)`,
              height: `min(100vh, ${system.settings.aspect === "4:3" ? "75" : "56.25"}vw)`,
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
            }),
        "--screen-offset": `${system.settings.screenX}px`,
      }}
      onMouseMove={handleMouseMove}
    >
      {idle && <div className="system-idle-dimmer" aria-hidden="true" />}
      <ChannelSvgDefs />

      {/* Local pointer (P1) */}
      <WiiPointer
        ref={localPointerRef}
        player="P1"
        visible={cursorActive}
        followMouse
        trail
      />

      {/* Remote pointers (P2-P4) from companions — isolated from App re-renders */}
      <RemotePointers
        pointersRef={remotePointersRef}
        notifyRef={remotePointersNotify}
      />

      {/* Phase 1: Black screen */}
      {(phase === "black" || phase === "safety") && (
        <StartupBlack fadeOut={phase !== "black"} />
      )}

      {/* Phase 2: Safety screen */}
      {(phase === "safety" || phase === "menu") && (
        <SafetyScreen
          visible={phase === "safety"}
          fadeOut={phase === "menu"}
          onDismiss={dismissSafety}
        />
      )}

      {/* Phase 3: Wii Menu */}
      <WiiMenu
        visible={
          phase === "menu" ||
          phase === "channel-select" ||
          phase === "messageboard"
        }
        fadeOut={phase === "news" || phase === "native-app"}
        mailLayerVisible={phase === "messageboard"}
        onMailClose={closeMessageBoard}
        onSettingsClick={openSettings}
        zoomIn={phase === "channel-select"}
        zoomOut={menuZoomOut}
        zoomOrigin={zoomOrigin}
        onMailClick={openMessageBoard}
        onChannelClick={openChannel}
        onCalendarDateSelect={handleCalendarDateSelect}
        onCalendarOpenChange={setCalendarOpen}
        onPairClick={openPairing}
        peerConnected={connectedCount > 0}
        sdVisible={showSD || phase === "settings" || showHomeMenu}
        onSDClick={() => setShowSD(true)}
        onCompose={() => setComposeRequest((value) => value + 1)}
        dateOverride={
          phase === "messageboard" ? messageBoardDateOverride : null
        }
      />

      <WiiSettings
        visible={phase === "settings"}
        initialPath={settingsDestination}
        onBack={closeSettings}
        onSystemUpdate={openSystemUpdateCheck}
        onFormat={() => setPhase("menu")}
      />

      {/* Wii System Update dialog */}
      <WiiSystemUpdate
        mode={systemUpdateMode}
        updateInfo={updateInfo}
        onCheck={checkForUpdates}
        onClose={closeSystemUpdate}
        play={play}
      />

      {/* Channel Selection Screen */}
      <ChannelSelection
        visible={phase === "channel-select"}
        channel={selectedChannel}
        onBack={closeChannel}
        onStart={startChannel}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onPrev={switchPrev}
        onNext={switchNext}
      />

      {/* Phase 4: Message Board */}
      <WiiMessageBoard
        visible={phase === "messageboard"}
        onDisplayedDateChange={setMessageBoardDateOverride}
        targetDate={calendarTargetDate}
        obscured={calendarOpen}
        composeRequest={composeRequest}
      />

      {/* News Channel */}
      <WiiNewsChannel visible={phase === "news"} onBack={closeNewsChannel} />
      {phase === "native-app" ? (
        <Suspense
          fallback={
            <div className="native-application-screen">
              Loading channel application…
            </div>
          }
        >
          <WiiNativeApplication
            channel={nativeApplicationChannel}
            onBack={closeNewsChannel}
          />
        </Suspense>
      ) : null}

      <SDMenu
        visible={showSD}
        onManage={() => {
          setShowSD(false);
          setSettingsDestination("Data Management");
          setPhase("settings");
        }}
        onBack={() => setShowSD(false)}
        onChannel={(channel) => {
          setShowSD(false);
          openChannel(channel);
        }}
      />

      {/* Pairing overlay */}
      <PairingScreen
        visible={showPairing}
        offer={currentPairing?.offer}
        state={
          currentPairing?.state ||
          (pairingControllerId != null ? "failed" : "creating")
        }
        error={currentPairing?.error}
        connectedCount={connectedCount}
        availableSlots={availableSlots}
        onAcceptAnswer={handleAcceptAnswer}
        onStartPairing={() => {
          if (
            pairingControllerId != null &&
            currentPairing?.state !== "connected"
          )
            disconnectOne(pairingControllerId);
          openPairing();
        }}
        onClose={closePairing}
      />

      {/* HOME Menu overlay */}
      <HomeMenu
        visible={showHomeMenu}
        onClose={closeHomeMenu}
        onWiiMenu={handleHomeMenuWiiMenu}
        onReset={handleHomeMenuReset}
        controllers={controllers}
        connectedCount={connectedCount}
        onReconnect={() => {
          setShowHomeMenu(false);
          disconnectAll();
          openPairing();
        }}
        onRumble={() => {
          if (systemSnapshot().settings.rumble) {
            navigator.vibrate?.(100);
            sendToControllers({ type: "rumble", duration: 100 });
          }
        }}
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
