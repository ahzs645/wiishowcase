import { useState, useEffect, useRef, useCallback } from 'react';
import useWebRTC from '../hooks/useWebRTC';
import { postAnswer } from '../lib/SignalingRelay';

interface CompanionControllerProps {
  encodedOffer: string;
  sessionId: string | null;
}

interface MotionState {
  accX: number; accY: number; accZ: number;
  rotAlpha: number; rotBeta: number; rotGamma: number;
}

interface ButtonState {
  A: boolean; B: boolean;
  up: boolean; down: boolean; left: boolean; right: boolean;
  '1': boolean; '2': boolean;
  minus: boolean; home: boolean; plus: boolean;
  recenter: boolean;
  [key: string]: boolean;
}

export default function CompanionController({ encodedOffer, sessionId }: CompanionControllerProps) {
  const [answerCode, setAnswerCode] = useState('');
  const [copied, setCopied] = useState(false);
  const needsPermission =
    (typeof DeviceMotionEvent !== 'undefined' &&
     typeof (DeviceMotionEvent as any).requestPermission === 'function') ||
    (typeof DeviceOrientationEvent !== 'undefined' &&
     typeof (DeviceOrientationEvent as any).requestPermission === 'function');
  const [gyroPermission, setGyroPermission] = useState<'granted' | 'denied' | 'unknown'>(
    needsPermission ? 'unknown' : 'granted'
  );
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const touchAreaRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef<MotionState>({
    accX: 0, accY: 0, accZ: 0,
    rotAlpha: 0, rotBeta: 0, rotGamma: 0,
  });
  const buttonsRef = useRef<ButtonState>({
    A: false, B: false,
    up: false, down: false, left: false, right: false,
    '1': false, '2': false,
    minus: false, home: false, plus: false,
    recenter: false,
  });
  const pointerRef = useRef({ x: 0.5, y: 0.5, touching: false });

  const handleHostMessage = useCallback((msg: any) => {
    if (msg.type === 'welcome' && msg.controllerId != null) {
      setPlayerNumber(msg.controllerId + 2);
    }
    if (msg.type === 'rumble' && navigator.vibrate) {
      navigator.vibrate(msg.duration || 100);
    }
  }, []);

  const { state, answer, acceptOffer, send, disconnect } = useWebRTC(
    'companion',
    handleHostMessage
  );

  const relayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (encodedOffer) {
      acceptOffer(encodedOffer).then((ans) => {
        if (ans) setAnswerCode(ans);
        if (sessionId && ans) {
          postAnswer(sessionId, ans);
          relayIntervalRef.current = setInterval(() => {
            postAnswer(sessionId, ans);
          }, 2000);
          setTimeout(() => { if (relayIntervalRef.current) clearInterval(relayIntervalRef.current); }, 30000);
        }
      }).catch(() => {});
    }
  }, [encodedOffer, acceptOffer, sessionId]);

  useEffect(() => {
    if (state === 'connected') {
      if (relayIntervalRef.current) clearInterval(relayIntervalRef.current);
    }
  }, [state]);

  const requestGyro = useCallback(async () => {
    let granted = true;
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const perm = await (DeviceMotionEvent as any).requestPermission();
        if (perm !== 'granted') granted = false;
      } catch {
        granted = false;
      }
    }
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try { await (DeviceOrientationEvent as any).requestPermission(); } catch { /* ignore */ }
    }
    setGyroPermission(granted ? 'granted' : 'denied');
  }, []);

  useEffect(() => {
    if (state !== 'connected') return;
    if (gyroPermission !== 'granted') return;

    const W = 0.3;
    const smooth = (prev: number, curr: number) => prev + W * (curr - prev);

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity || {};
      const rot = e.rotationRate || {};
      const prev = motionRef.current;

      motionRef.current = {
        accX:     smooth(prev.accX,      ((acc as any).x ?? 0) / 9.8),
        accY:     smooth(prev.accY,      ((acc as any).z ?? 0) / 9.8),
        accZ:     smooth(prev.accZ,     -((acc as any).y ?? 0) / 9.8),
        rotAlpha: smooth(prev.rotAlpha,   (rot as any).alpha ?? 0),
        rotBeta:  smooth(prev.rotBeta,  -((rot as any).gamma ?? 0)),
        rotGamma: smooth(prev.rotGamma,   (rot as any).beta ?? 0),
      };
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [state, gyroPermission]);

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

  const handleTouch = useCallback((e: React.TouchEvent) => {
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

  const handleButton = useCallback((button: string, action: 'down' | 'up') => {
    if (button === 'recenter' && action === 'down') {
      motionRef.current = {
        accX: 0, accY: 0, accZ: 0,
        rotAlpha: 0, rotBeta: 0, rotGamma: 0,
      };
    }
    buttonsRef.current[button] = (action === 'down');
  }, []);

  const copyAnswer = useCallback(() => {
    if (!answerCode) return;
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

    function fallbackCopy(text: string) {
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
      } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  }, [answerCode]);

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
                <textarea readOnly value={answerCode} rows={4} onClick={(e) => (e.target as HTMLTextAreaElement).select()} />
                <button className="companion-copy-btn" onClick={copyAnswer}>
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <p className="companion-hint">Waiting for host to accept...</p>
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

  return (
    <div className="companion-screen companion-active">
      {playerNumber && (
        <div className="companion-player-badge">Player {playerNumber}</div>
      )}
      {gyroPermission !== 'granted' && (
        <button className="companion-gyro-btn" onClick={requestGyro}>
          Enable Motion Controls
        </button>
      )}
      <div ref={touchAreaRef} className="companion-touch-area" onTouchStart={handleTouch} onTouchMove={handleTouch} onTouchEnd={handleTouchEnd}>
        <div className="companion-crosshair" />
        <span className="companion-touch-label">Touch to point</span>
      </div>
      <div className="companion-remote-body">
        <div className="companion-dpad">
          <button className="companion-btn companion-btn-dpad companion-dpad-up" onTouchStart={() => handleButton('up', 'down')} onTouchEnd={() => handleButton('up', 'up')} />
          <button className="companion-btn companion-btn-dpad companion-dpad-down" onTouchStart={() => handleButton('down', 'down')} onTouchEnd={() => handleButton('down', 'up')} />
          <button className="companion-btn companion-btn-dpad companion-dpad-left" onTouchStart={() => handleButton('left', 'down')} onTouchEnd={() => handleButton('left', 'up')} />
          <button className="companion-btn companion-btn-dpad companion-dpad-right" onTouchStart={() => handleButton('right', 'down')} onTouchEnd={() => handleButton('right', 'up')} />
          <div className="companion-dpad-center" />
        </div>
        <button className="companion-btn companion-btn-a" onTouchStart={() => handleButton('A', 'down')} onTouchEnd={() => handleButton('A', 'up')}>A</button>
        <div className="companion-btn-row">
          <button className="companion-btn companion-btn-minus" onTouchStart={() => handleButton('minus', 'down')} onTouchEnd={() => handleButton('minus', 'up')}>&minus;</button>
          <button className="companion-btn companion-btn-home" onTouchStart={() => handleButton('home', 'down')} onTouchEnd={() => handleButton('home', 'up')} />
          <button className="companion-btn companion-btn-plus" onTouchStart={() => handleButton('plus', 'down')} onTouchEnd={() => handleButton('plus', 'up')}>+</button>
        </div>
        <div className="companion-btn-row">
          <button className="companion-btn companion-btn-num" onTouchStart={() => handleButton('1', 'down')} onTouchEnd={() => handleButton('1', 'up')}>1</button>
          <button className="companion-btn companion-btn-num" onTouchStart={() => handleButton('2', 'down')} onTouchEnd={() => handleButton('2', 'up')}>2</button>
        </div>
        <button className="companion-btn companion-btn-b" onTouchStart={() => handleButton('B', 'down')} onTouchEnd={() => handleButton('B', 'up')}>B</button>
        <div className="companion-btn-row">
          <button className="companion-recenter" onTouchStart={() => handleButton('recenter', 'down')} onTouchEnd={() => handleButton('recenter', 'up')}>Recenter</button>
          <button className="companion-disconnect" onClick={disconnect}>Disconnect</button>
        </div>
      </div>
    </div>
  );
}
