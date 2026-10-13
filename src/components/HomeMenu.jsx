import { useState, useRef, useEffect } from "react";
import { useSystemState, setSetting } from "../lib/systemState";
import { WiiButton } from "./system/SystemUI";
export default function HomeMenu({
  visible,
  onClose,
  onWiiMenu,
  onReset,
  controllers = {},
  onReconnect,
  onRumble,
}) {
  const system = useSystemState();
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!visible) return;
    const previous = document.activeElement;
    ref.current?.querySelector("button")?.focus();
    return () => previous?.isConnected && previous.focus();
  }, [visible, remoteOpen, guide]);
  if (!visible) return null;
  const close = () => {
    if (remoteOpen) setRemoteOpen(false);
    else if (guide) setGuide(false);
    else onClose();
  };
  const batteries = (
    <div className="home-menu-battery-row">
      {[1, 2, 3, 4].map((player) => {
        const connected =
          player === 1 || controllers[player - 2]?.state === "connected";
        return (
          <div
            key={player}
            className={`home-menu-battery${connected ? " connected" : ""}`}
            aria-label={`Player ${player}: ${connected ? "connected, battery level unavailable" : "not connected"}`}
          >
            <span className="home-menu-battery-label">P{player}</span>
            <div className="home-menu-battery-indicator">
              {[0, 1, 2, 3].map((seg) => (
                <div
                  key={seg}
                  className={`home-menu-battery-seg${connected ? " filled" : ""}`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
  return (
    <div
      ref={ref}
      className="home-menu-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={remoteOpen ? "Wii Remote Settings" : "HOME Menu"}
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          const buttons = [
            ...ref.current.querySelectorAll("button:not(:disabled)"),
          ];
          const first = buttons[0],
            last = buttons.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
    >
      <div className="home-menu-container">
        <div className="home-menu-top-bar">
          <div className="home-menu-top-bar-inner">
            <span className="home-menu-title">HOME Menu</span>
            <button className="home-menu-close-btn" onClick={close}>
              ⌂ Close
            </button>
          </div>
        </div>
        <div className="home-menu-center">
          <div className="home-menu-remote">
            <span className="wii-icon wii-icon-remote" />
          </div>
          {remoteOpen ? (
            <section className="remote-settings-panel">
              <div className="remote-setting-row">
                <span>Volume</span>
                <WiiButton
                  aria-label="Decrease remote volume"
                  onClick={() =>
                    setSetting(
                      "remoteVolume",
                      Math.max(0, system.settings.remoteVolume - 0.1),
                    )
                  }
                >
                  −
                </WiiButton>
                <div
                  className="remote-volume-bars"
                  aria-label={`Volume ${Math.round(system.settings.remoteVolume * 100)} percent`}
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <i
                      key={i}
                      className={
                        i < Math.round(system.settings.remoteVolume * 10)
                          ? "active"
                          : ""
                      }
                    />
                  ))}
                </div>
                <WiiButton
                  aria-label="Increase remote volume"
                  onClick={() =>
                    setSetting(
                      "remoteVolume",
                      Math.min(1, system.settings.remoteVolume + 0.1),
                    )
                  }
                >
                  ＋
                </WiiButton>
              </div>
              <div className="remote-setting-row">
                <span>Rumble</span>
                {[true, false].map((value) => (
                  <WiiButton
                    key={String(value)}
                    aria-pressed={system.settings.rumble === value}
                    onClick={() => {
                      setSetting("rumble", value);
                      if (value) onRumble?.();
                    }}
                  >
                    {value ? "On" : "Off"}
                  </WiiButton>
                ))}
              </div>
              <div className="remote-setting-row">
                <span>Connection</span>
                <WiiButton
                  onClick={() => {
                    setRemoteOpen(false);
                    onReconnect?.();
                  }}
                >
                  Reconnect
                </WiiButton>
              </div>
              <small>
                Battery levels are unavailable for browser controllers.
              </small>
            </section>
          ) : guide ? (
            <section className="home-operations-guide">
              <h2>Operations Guide</h2>
              <p>
                Point and click, or use Tab and Enter to select a control. Press
                Ctrl+H to open HOME.
              </p>
              <p>
                To move channels, choose Move channels, select a channel and
                then a destination. A + B on a paired controller also selects a
                channel to move. The Disc Channel stays in the first slot.
              </p>
              <p>
                Open the SD Card Menu to view channels stored on SD. Data
                Management copies, moves and erases channel entries.
              </p>
              <p>
                Create a memo or local letter with the Message Board's Notepad.
                The system keyboard accepts your real keyboard, and offers
                language, symbols and phone layouts.
              </p>
            </section>
          ) : (
            <div className="home-menu-buttons">
              <WiiButton onClick={onWiiMenu}>Wii Menu</WiiButton>
              <WiiButton onClick={onReset}>Reset</WiiButton>
              <WiiButton onClick={() => setGuide(true)}>
                Operations Guide
              </WiiButton>
            </div>
          )}
        </div>
        <div className="home-menu-bottom-bar">
          <div className="home-menu-bottom-bar-inner">
            {batteries}
            <button
              className="home-menu-settings-text"
              onClick={() => {
                setRemoteOpen(!remoteOpen);
                setGuide(false);
              }}
            >
              {remoteOpen ? "Close Wii Remote Settings" : "Wii Remote Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
