import { useState, useEffect, useRef, useCallback } from 'react';
import useWebRTC from '../hooks/useWebRTC';

/**
 * CompanionController — the phone acts as a Wii Remote.
 *
 * Renders a full-screen touch surface that sends:
 *  - Touch/pointer position (normalized 0-1)
 *  - Device orientation (gyro) if available
 *  - Button presses (A, B)
 *
 * URL format: #/companion/<encoded-offer>
 */
export default function CompanionController({ encodedOffer }) {
  const [answerCode, setAnswerCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [gyroPermission, setGyroPermission] = useState('unknown');
  const touchAreaRef = useRef(null);
  const orientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });

  const handleHostMessage = useCallback((msg) => {
    // Host could send rumble, sound commands etc.
    if (msg.type === 'rumble' && navigator.vibrate) {
      navigator.vibrate(msg.duration || 100);
    }
  }, []);

  const { state, answer, acceptOffer, send, disconnect } = useWebRTC(
    'companion',
    handleHostMessage
  );

  // Accept offer on mount
  useEffect(() => {
    if (encodedOffer) {
      acceptOffer(encodedOffer).then((ans) => {
        setAnswerCode(ans);
      }).catch(() => {
        // offer decode failed
      });
    }
  }, [encodedOffer, acceptOffer]);

  // Request gyroscope permission (iOS 13+)
  const requestGyro = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        setGyroPermission(perm);
      } catch {
        setGyroPermission('denied');
      }
    } else {
      setGyroPermission('granted');
    }
  }, []);

  // Listen for device orientation
  useEffect(() => {
    if (state !== 'connected') return;
    if (gyroPermission !== 'granted') return;

    const handleOrientation = (e) => {
      orientationRef.current = {
        alpha: e.alpha ?? 0,
        beta: e.beta ?? 0,
        gamma: e.gamma ?? 0,
      };
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [state, gyroPermission]);

  // Send control data at ~30fps when connected
  useEffect(() => {
    if (state !== 'connected') return;

    const interval = setInterval(() => {
      send({
        type: 'orientation',
        ...orientationRef.current,
        t: Date.now(),
      });
    }, 33);

    return () => clearInterval(interval);
  }, [state, send]);

  // Touch handlers
  const handleTouch = useCallback((e) => {
    e.preventDefault();
    const area = touchAreaRef.current;
    if (!area) return;

    const rect = area.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top) / rect.height;

    send({
      type: 'pointer',
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      t: Date.now(),
    });
  }, [send]);

  const handleTouchEnd = useCallback(() => {
    send({ type: 'pointer-up', t: Date.now() });
  }, [send]);

  const handleButton = useCallback((button, action) => {
    send({ type: 'button', button, action, t: Date.now() });
  }, [send]);

  const copyAnswer = useCallback(() => {
    if (answerCode) {
      navigator.clipboard.writeText(answerCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
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
      {/* Gyro permission prompt */}
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

      {/* Buttons */}
      <div className="companion-buttons">
        <button
          className="companion-btn companion-btn-a"
          onTouchStart={() => handleButton('A', 'down')}
          onTouchEnd={() => handleButton('A', 'up')}
        >
          A
        </button>
        <button
          className="companion-btn companion-btn-b"
          onTouchStart={() => handleButton('B', 'down')}
          onTouchEnd={() => handleButton('B', 'up')}
        >
          B
        </button>
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
        </div>
      </div>

      {/* Disconnect */}
      <button className="companion-disconnect" onClick={disconnect}>
        Disconnect
      </button>
    </div>
  );
}
