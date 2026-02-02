import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * PairingScreen — shown on the host (desktop) to pair with a companion (phone).
 *
 * Flow:
 *  1. Host generates WebRTC offer → encodes into a QR code URL
 *  2. Phone scans QR → opens companion page → generates answer code
 *  3. Host enters the answer code here → connection established
 */
export default function PairingScreen({
  visible,
  offer,
  state, // 'creating' | 'waiting' | 'connected' | 'failed'
  onAcceptAnswer,
  onClose,
}) {
  const [answerInput, setAnswerInput] = useState('');
  const [companionUrl, setCompanionUrl] = useState('');

  useEffect(() => {
    if (offer) {
      // Build the companion URL with the offer in the hash
      const base = window.location.origin + window.location.pathname;
      setCompanionUrl(`${base}#/companion/${offer}`);
    }
  }, [offer]);

  const handleSubmitAnswer = () => {
    const trimmed = answerInput.trim();
    if (trimmed) {
      onAcceptAnswer(trimmed);
    }
  };

  if (!visible) return null;

  return (
    <div className="pairing-overlay">
      <div className="pairing-card">
        <button className="pairing-close" onClick={onClose} title="Close">
          &times;
        </button>

        <h2 className="pairing-title">Pair Wii Remote</h2>

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
              <span>then enter the answer code</span>
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
          </>
        )}

        {state === 'connected' && (
          <div className="pairing-status pairing-connected">
            <div className="pairing-check">&#10003;</div>
            <p>Wii Remote connected!</p>
            <p className="pairing-hint">You can close this dialog now.</p>
          </div>
        )}

        {state === 'failed' && (
          <div className="pairing-status pairing-failed">
            <p>Connection failed. Please try again.</p>
            <button className="pairing-submit" onClick={onClose}>
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
