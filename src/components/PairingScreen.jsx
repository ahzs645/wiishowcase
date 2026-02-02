import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateSessionId, pollForAnswer } from '../lib/SignalingRelay';

/**
 * PairingScreen — shown on the host (desktop) to pair companions (phones).
 * Supports sequential pairing of up to 4 controllers.
 */
export default function PairingScreen({
  visible,
  offer,
  state, // 'creating' | 'waiting' | 'connected' | 'failed'
  connectedCount,
  availableSlots,
  onAcceptAnswer,
  onStartPairing,
  onClose,
}) {
  const [answerInput, setAnswerInput] = useState('');
  const [companionUrl, setCompanionUrl] = useState('');
  const sessionIdRef = useRef(null);

  // Generate a new session ID each time a new offer arrives
  useEffect(() => {
    if (offer) {
      sessionIdRef.current = generateSessionId();
      const sid = sessionIdRef.current;

      let origin = window.location.origin;
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const lanHost = __LAN_HOST__;
        if (lanHost) {
          origin = `${window.location.protocol}//${lanHost}:${window.location.port}`;
        }
      }
      const base = origin + window.location.pathname;
      setCompanionUrl(`${base}#/companion/${sid}/${offer}`);
      setAnswerInput('');
    }
  }, [offer]);

  // Poll for auto-relayed answer
  useEffect(() => {
    if (state !== 'waiting' || !sessionIdRef.current) return;

    const stopPolling = pollForAnswer(sessionIdRef.current, (answer) => {
      onAcceptAnswer(answer);
    });

    return () => stopPolling();
  }, [state, onAcceptAnswer]);

  const handleSubmitAnswer = () => {
    const trimmed = answerInput.trim();
    if (trimmed) {
      onAcceptAnswer(trimmed);
    }
  };

  const handlePairAnother = () => {
    sessionIdRef.current = null;
    setCompanionUrl('');
    setAnswerInput('');
    onStartPairing();
  };

  if (!visible) return null;

  return (
    <div className="pairing-overlay">
      <div className="pairing-card">
        <button className="pairing-close" onClick={onClose} title="Close">
          &times;
        </button>

        <h2 className="pairing-title">Pair Wii Remote</h2>

        {connectedCount > 0 && (
          <p className="pairing-count">
            {connectedCount}/4 remote{connectedCount !== 1 ? 's' : ''} connected
          </p>
        )}

        {state === 'creating' && (
          <div className="pairing-status">
            <div className="pairing-spinner" />
            <p>Generating connection code...</p>
          </div>
        )}

        {state === 'waiting' && companionUrl && (
          <>
            <p className="pairing-instructions">
              Scan this QR code with your phone to connect as a Wii Remote
            </p>

            <div className="pairing-qr">
              <QRCodeSVG
                value={companionUrl}
                size={220}
                level="L"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>

            <div className="pairing-divider">
              <span>or paste the answer code manually</span>
            </div>

            <div className="pairing-answer-input">
              <textarea
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="Paste the answer code from your phone here..."
                rows={3}
              />
              <button
                className="pairing-submit"
                onClick={handleSubmitAnswer}
                disabled={!answerInput.trim()}
              >
                Connect
              </button>
            </div>

            <p className="pairing-hint" style={{ marginTop: '10px', fontSize: '13px', opacity: 0.7 }}>
              Answer will be accepted automatically if on the same network.
            </p>
          </>
        )}

        {state === 'connected' && (
          <div className="pairing-status pairing-connected">
            <div className="pairing-check">&#10003;</div>
            <p>Wii Remote connected!</p>
            {availableSlots > 0 ? (
              <button className="pairing-submit" onClick={handlePairAnother} style={{ marginTop: '12px' }}>
                Pair Another Remote
              </button>
            ) : (
              <p className="pairing-hint">All 4 slots connected.</p>
            )}
            <p className="pairing-hint" style={{ marginTop: '8px' }}>
              You can close this dialog at any time.
            </p>
          </div>
        )}

        {state === 'failed' && (
          <div className="pairing-status pairing-failed">
            <p>Connection failed. Please try again.</p>
            <button className="pairing-submit" onClick={handlePairAnother}>
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
