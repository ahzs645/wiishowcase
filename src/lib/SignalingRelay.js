/**
 * Signaling relay that works cross-device via HTTP polling,
 * with BroadcastChannel as a fast same-browser optimization.
 */

/**
 * Generate a short random session ID.
 */
export function generateSessionId() {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Companion: POST the answer to the signaling server.
 */
let relayUnavailable = false;
const signalURL = (sessionId) =>
  `${import.meta.env?.VITE_SIGNALING_RELAY_URL || "/api/signal"}/${encodeURIComponent(sessionId)}`;
export async function postAnswer(sessionId, answer) {
  // Try BroadcastChannel first (same-browser fast path)
  try {
    const bc = new BroadcastChannel("wii-webrtc-signaling");
    bc.postMessage({ type: "answer", answer, sessionId });
    setTimeout(() => bc.close(), 5000);
  } catch {
    // BroadcastChannel not supported
  }

  // Also POST to HTTP relay (cross-device path)
  if (relayUnavailable) return false;
  try {
    const response = await fetch(signalURL(sessionId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });
    if (!response.ok) {
      relayUnavailable = true;
      return false;
    }
    return true;
  } catch (e) {
    relayUnavailable = true;
    return false;
  }
}

/**
 * Host: Poll for the companion's answer.
 * Returns a cleanup function.
 */
export function pollForAnswer(sessionId, onAnswer, onAvailability) {
  let stopped = false;

  // Fast path: BroadcastChannel (same-browser)
  let bc;
  try {
    bc = new BroadcastChannel("wii-webrtc-signaling");
    bc.onmessage = (event) => {
      if (event.data?.type === "answer" && event.data.answer) {
        if (!event.data.sessionId || event.data.sessionId === sessionId) {
          onAnswer(event.data.answer);
          stop();
        }
      }
    };
  } catch {
    // BroadcastChannel not supported
  }

  // Slow path: HTTP polling (cross-device)
  async function poll() {
    while (!stopped) {
      try {
        const res = await fetch(signalURL(sessionId));
        if (stopped) return;
        if (
          !res.ok ||
          !res.headers.get("content-type")?.includes("application/json")
        ) {
          onAvailability?.(false);
          break; // Keep BroadcastChannel/manual exchange; stop hammering a missing endpoint.
        }
        const data = await res.json();
        if (stopped) return;
        onAvailability?.(true);
        if (data.answer) {
          onAnswer(data.answer);
          stop();
          return;
        }
      } catch {
        onAvailability?.(false);
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  poll();

  function stop() {
    stopped = true;
    try {
      bc?.close();
    } catch {}
  }

  return stop;
}
