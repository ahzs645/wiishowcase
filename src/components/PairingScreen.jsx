import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { generateSessionId, pollForAnswer } from "../lib/SignalingRelay";
import { createPortal } from "react-dom";
import useSystemModal from "../lib/useSystemModal";

const HINT_STYLE = { marginTop: "10px", fontSize: "13px", opacity: 0.7 };
const PAIR_ANOTHER_STYLE = { marginTop: "12px" };
const CLOSE_HINT_STYLE = { marginTop: "8px" };

/**
 * PairingScreen — shown on the host (desktop) to pair companions (phones).
 * Supports sequential pairing of up to 3 remote controllers.
 */
export default function PairingScreen({
  visible,
  offer,
  state, // 'creating' | 'waiting' | 'connected' | 'failed'
  error,
  connectedCount,
  availableSlots,
  onAcceptAnswer,
  onStartPairing,
  onClose,
}) {
  const [answerInput, setAnswerInput] = useState("");
  const [companionUrl, setCompanionUrl] = useState("");
  const [relayAvailable, setRelayAvailable] = useState(null);
  const modal = useSystemModal(visible, onClose);
  const sessionIdRef = useRef(null);

  // Generate a new session ID each time a new offer arrives
  useEffect(() => {
    if (offer) {
      setRelayAvailable(null);
      sessionIdRef.current = generateSessionId();
      const sid = sessionIdRef.current;

      let origin = window.location.origin;
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        const lanHost = __LAN_HOST__;
        if (lanHost) {
          origin = `${window.location.protocol}//${lanHost}:${window.location.port}`;
        }
      }
      const base = origin + window.location.pathname;
      setCompanionUrl(`${base}#/companion/${sid}/${offer}`);
      setAnswerInput("");
    }
  }, [offer]);

  // Poll for auto-relayed answer
  useEffect(() => {
    if (state !== "waiting" || !sessionIdRef.current) return;

    const stopPolling = pollForAnswer(
      sessionIdRef.current,
      (answer) => {
        onAcceptAnswer(answer);
      },
      setRelayAvailable,
    );

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
    setCompanionUrl("");
    setAnswerInput("");
    onStartPairing();
  };

  if (!visible) return null;

  return createPortal(
    <div className="pairing-overlay" style={modal.style}>
      <div
        className="pairing-card"
        ref={modal.ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Pair Wii Remote"
        onKeyDown={modal.onKeyDown}
      >
        <button
          className="pairing-close"
          onClick={onClose}
          title="Close"
          aria-label="Close pairing"
        >
          &times;
        </button>

        <h2 className="pairing-title">Pair Wii Remote</h2>

        {connectedCount > 0 && (
          <p className="pairing-count">
            {connectedCount}/3 remote{connectedCount !== 1 ? "s" : ""} connected
          </p>
        )}

        {state === "creating" && (
          <div className="pairing-status">
            <div className="pairing-spinner" />
            <p>Generating connection code...</p>
          </div>
        )}

        {state === "waiting" && companionUrl && (
          <div className="pairing-exchange">
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
                aria-label="Remote answer code"
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

            <p className="pairing-hint" style={HINT_STYLE}>
              {relayAvailable === false
                ? "Automatic exchange is unavailable here. Copy the answer code shown on your phone and paste it above to connect."
                : "Your phone can exchange the answer automatically when a relay is available, or show a code to paste here."}
            </p>
          </div>
        )}

        {state === "connected" && (
          <div className="pairing-status pairing-connected">
            <div className="pairing-check">&#10003;</div>
            <p>Wii Remote connected!</p>
            {availableSlots > 0 ? (
              <button
                className="pairing-submit"
                onClick={handlePairAnother}
                style={PAIR_ANOTHER_STYLE}
              >
                Pair Another Remote
              </button>
            ) : (
              <p className="pairing-hint">All 3 remote slots connected.</p>
            )}
            <p className="pairing-hint" style={CLOSE_HINT_STYLE}>
              You can close this dialog at any time.
            </p>
          </div>
        )}

        {state === "failed" && (
          <div className="pairing-status pairing-failed">
            <p>{error || "Connection failed. Please try again."}</p>
            <button className="pairing-submit" onClick={handlePairAnother}>
              Retry
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
