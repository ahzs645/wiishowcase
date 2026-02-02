import { useState, useEffect, useRef, useCallback } from 'react';
import useWebRTC from '../hooks/useWebRTC';
import { postAnswer } from '../lib/SignalingRelay';

/**
 * CompanionController — the phone acts as a Wii Remote.
 *
 * Renders a full-screen touch surface that sends:
 *  - Touch/pointer position (normalized 0-1)
 *  - Device orientation (gyro) if available
 *  - Button presses (A, B)
 *
 * URL format: #/companion/<sessionId>/<encoded-offer>
 */
export default function CompanionController({ encodedOffer, sessionId }) {
  const [answerCode, setAnswerCode] = useState('');
  const [copied, setCopied] = useState(false);
  // Auto-grant on browsers that don't require explicit permission
  const needsPermission =
    (typeof DeviceMotionEvent !== 'undefined' &&
     typeof DeviceMotionEvent.requestPermission === 'function') ||
    (typeof DeviceOrientationEvent !== 'undefined' &&
     typeof DeviceOrientationEvent.requestPermission === 'function');
  const [gyroPermission, setGyroPermission] = useState(
    needsPermission ? 'unknown' : 'granted'
  );
  const [playerNumber, setPlayerNumber] = useState(null);
  const touchAreaRef = useRef(null);
  const motionRef = useRef({
    accX: 0, accY: 0, accZ: 0,
    rotAlpha: 0, rotBeta: 0, rotGamma: 0,
  });
  const buttonsRef = useRef({
    A: false, B: false,
    up: false, down: false, left: false, right: false,
    '1': false, '2': false,
    minus: false, home: false, plus: false,
    recenter: false,
  });
  const pointerRef = useRef({ x: 0.5, y: 0.5, touching: false });

  const handleHostMessage = useCallback((msg) => {
    if (msg.type === 'welcome' && msg.controllerId != null) {
      setPlayerNumber(msg.controllerId + 2); // controller 0 = P2, 1 = P3, etc.
    }
    if (msg.type === 'rumble' && navigator.vibrate) {
      navigator.vibrate(msg.duration || 100);
    }
  }, []);

  const { state, answer, acceptOffer, send, disconnect } = useWebRTC(
    'companion',
    handleHostMessage
  );

  // Accept offer on mount
  const relayIntervalRef = useRef(null);

  useEffect(() => {
    if (encodedOffer) {
      acceptOffer(encodedOffer).then((ans) => {
        setAnswerCode(ans);
        // Auto-relay the answer to the host via HTTP + BroadcastChannel
        if (sessionId) {
          postAnswer(sessionId, ans);
          // Resend periodically in case the host wasn't polling yet
          relayIntervalRef.current = setInterval(() => {
            postAnswer(sessionId, ans);
          }, 2000);
          setTimeout(() => clearInterval(relayIntervalRef.current), 30000);
        }
      }).catch(() => {
        // offer decode failed
      });
    }
  }, [encodedOffer, acceptOffer, sessionId]);

  // Stop relaying once connected
  useEffect(() => {
    if (state === 'connected') {
      clearInterval(relayIntervalRef.current);
    }
  }, [state]);

  // Request motion permission (iOS 13+)
  const requestGyro = useCallback(async () => {
    let granted = true;
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceMotionEvent.requestPermission();
        if (perm !== 'granted') granted = false;
      } catch {
        granted = false;
      }
    }
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { await DeviceOrientationEvent.requestPermission(); } catch {}
    }
    setGyroPermission(granted ? 'granted' : 'denied');
  }, []);

  // Listen for device motion (acceleration + gyro with axis remapping and smoothing)
  useEffect(() => {
    if (state !== 'connected') return;
    if (gyroPermission !== 'granted') return;

    const W = 0.3; // smoothing weight: 0 = full smooth, 1 = raw
    const smooth = (prev, curr) => prev + W * (curr - prev);

    const handleMotion = (e) => {
      const acc = e.accelerationIncludingGravity || {};
      const rot = e.rotationRate || {};
      const prev = motionRef.current;

      // Axis remapping: phone held vertically like a Wii Remote
      motionRef.current = {
        accX:     smooth(prev.accX,      (acc.x ?? 0) / 9.8),
        accY:     smooth(prev.accY,      (acc.z ?? 0) / 9.8),
        accZ:     smooth(prev.accZ,     -(acc.y ?? 0) / 9.8),
        rotAlpha: smooth(prev.rotAlpha,   rot.alpha ?? 0),
        rotBeta:  smooth(prev.rotBeta,  -(rot.gamma ?? 0)),
        rotGamma: smooth(prev.rotGamma,   rot.beta ?? 0),
      };
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [state, gyroPermission]);

  // Unified send loop at ~62.5Hz (16ms) — sends complete controller state each frame
  useEffect(() => {
    if (state !== 'connected') return;

    const interval = setInterval(() => {
      send({
        type: 'state',
        t: Date.now(),
        pointer: { ...pointerRef.current },
        buttons: { ...buttonsRef.current },
        motion: { ...motionRef.current },
      });
    }, 16);

    return () => clearInterval(interval);
  }, [state, send]);

  // Touch handlers — update ref, the send loop picks it up
  const handleTouch = useCallback((e) => {
    e.preventDefault();
    const area = touchAreaRef.current;
    if (!area) return;

    const rect = area.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    pointerRef.current = {
      x: Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height)),
      touching: true,
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    pointerRef.current.touching = false;
  }, []);

  // Button handler — toggles ref state, the send loop picks it up
  const handleButton = useCallback((button, action) => {
    if (button === 'recenter' && action === 'down') {
      // Reset motion baseline
      motionRef.current = {
        accX: 0, accY: 0, accZ: 0,
        rotAlpha: 0, rotBeta: 0, rotGamma: 0,
      };
    }
    buttonsRef.current[button] = (action === 'down');
  }, []);

  const copyAnswer = useCallback(() => {
    if (!answerCode) return;
    // navigator.clipboard requires a secure context (HTTPS or localhost).
    // On plain HTTP (LAN IP), fall back to the legacy execCommand approach.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(answerCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopy(answerCode);
      });
    } else {
      fallbackCopy(answerCode);
    }

    function fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // copy failed — user can manually select the textarea
      }
      document.body.removeChild(ta);
    }
  }, [answerCode]);

  // --- Render: Signaling phase ---
  if (state !== 'connected') {
    return (
      <div className="companion-screen">
        <div className="companion-pairing">
          <h1 className="companion-logo">Wii Remote</h1>

          {state === 'creating' && (
            <div className="companion-status">
              <div className="pairing-spinner" />
              <p>Setting up connection...</p>
            </div>
          )}

          {state === 'waiting' && answerCode && (
            <>
              <p className="companion-instructions">
                Copy this code and paste it on the host (desktop):
              </p>
              <div className="companion-answer-box">
                <textarea
                  readOnly
                  value={answerCode}
                  rows={4}
                  onClick={(e) => e.target.select()}
                />
                <button className="companion-copy-btn" onClick={copyAnswer}>
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <p className="companion-hint">
                Waiting for host to accept...
              </p>
            </>
          )}

          {state === 'failed' && (
            <div className="companion-status">
              <p>Connection failed.</p>
              <p className="companion-hint">Close this page and scan the QR code again.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Render: Connected — controller UI ---
  return (
    <div className="companion-screen companion-active">
      {/* Player indicator + Gyro permission */}
      {playerNumber && (
        <div className="companion-player-badge">Player {playerNumber}</div>
      )}
      {gyroPermission !== 'granted' && (
        <button className="companion-gyro-btn" onClick={requestGyro}>
          Enable Motion Controls
        </button>
      )}

      {/* Touch surface */}
      <div
        ref={touchAreaRef}
        className="companion-touch-area"
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        onTouchEnd={handleTouchEnd}
      >
        <div className="companion-crosshair" />
        <span className="companion-touch-label">Touch to point</span>
      </div>

      {/* Vertical Wii Remote button layout */}
      <div className="companion-remote-body">
        {/* D-pad */}
        <div className="companion-dpad">
          <button
            className="companion-btn companion-btn-dpad companion-dpad-up"
            onTouchStart={() => handleButton('up', 'down')}
            onTouchEnd={() => handleButton('up', 'up')}
          />
          <button
            className="companion-btn companion-btn-dpad companion-dpad-down"
            onTouchStart={() => handleButton('down', 'down')}
            onTouchEnd={() => handleButton('down', 'up')}
          />
          <button
            className="companion-btn companion-btn-dpad companion-dpad-left"
            onTouchStart={() => handleButton('left', 'down')}
            onTouchEnd={() => handleButton('left', 'up')}
          />
          <button
            className="companion-btn companion-btn-dpad companion-dpad-right"
            onTouchStart={() => handleButton('right', 'down')}
            onTouchEnd={() => handleButton('right', 'up')}
          />
          <div className="companion-dpad-center" />
        </div>

        {/* A button */}
        <button
          className="companion-btn companion-btn-a"
          onTouchStart={() => handleButton('A', 'down')}
          onTouchEnd={() => handleButton('A', 'up')}
        >
          A
        </button>

        {/* Minus / Home / Plus */}
        <div className="companion-btn-row">
          <button
            className="companion-btn companion-btn-minus"
            onTouchStart={() => handleButton('minus', 'down')}
            onTouchEnd={() => handleButton('minus', 'up')}
          >
            &minus;
          </button>
          <button
            className="companion-btn companion-btn-home"
            onTouchStart={() => handleButton('home', 'down')}
            onTouchEnd={() => handleButton('home', 'up')}
          />
          <button
            className="companion-btn companion-btn-plus"
            onTouchStart={() => handleButton('plus', 'down')}
            onTouchEnd={() => handleButton('plus', 'up')}
          >
            +
          </button>
        </div>

        {/* 1 and 2 */}
        <div className="companion-btn-row">
          <button
            className="companion-btn companion-btn-num"
            onTouchStart={() => handleButton('1', 'down')}
            onTouchEnd={() => handleButton('1', 'up')}
          >
            1
          </button>
          <button
            className="companion-btn companion-btn-num"
            onTouchStart={() => handleButton('2', 'down')}
            onTouchEnd={() => handleButton('2', 'up')}
          >
            2
          </button>
        </div>

        {/* B button */}
        <button
          className="companion-btn companion-btn-b"
          onTouchStart={() => handleButton('B', 'down')}
          onTouchEnd={() => handleButton('B', 'up')}
        >
          B
        </button>

        {/* Recenter + Disconnect */}
        <div className="companion-btn-row">
          <button
            className="companion-recenter"
            onTouchStart={() => handleButton('recenter', 'down')}
            onTouchEnd={() => handleButton('recenter', 'up')}
          >
            Recenter
          </button>
          <button className="companion-disconnect" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
