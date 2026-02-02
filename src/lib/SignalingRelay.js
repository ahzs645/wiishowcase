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
export async function postAnswer(sessionId, answer) {
  // Try BroadcastChannel first (same-browser fast path)
  try {
    const bc = new BroadcastChannel('wii-webrtc-signaling');
    bc.postMessage({ type: 'answer', answer, sessionId });
    setTimeout(() => bc.close(), 5000);
  } catch {
    // BroadcastChannel not supported
  }

  // Also POST to HTTP relay (cross-device path)
  try {
    await fetch(`/api/signal/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    });
  } catch (e) {
    console.warn('Failed to POST answer to signaling relay:', e);
  }
}

/**
 * Host: Poll for the companion's answer.
 * Returns a cleanup function.
 */
export function pollForAnswer(sessionId, onAnswer) {
  let stopped = false;

  // Fast path: BroadcastChannel (same-browser)
  let bc;
  try {
    bc = new BroadcastChannel('wii-webrtc-signaling');
    bc.onmessage = (event) => {
      if (event.data?.type === 'answer' && event.data.answer) {
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
        const res = await fetch(`/api/signal/${sessionId}`);
        const data = await res.json();
        if (data.answer) {
          onAnswer(data.answer);
          stop();
          return;
        }
      } catch {
        // Server might not be reachable, keep trying
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  poll();

  function stop() {
    stopped = true;
    try { bc?.close(); } catch {}
  }

  return stop;
}
