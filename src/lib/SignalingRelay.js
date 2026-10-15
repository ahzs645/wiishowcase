/** HTTP answer exchange, with BroadcastChannel as a same-browser fast path. */
export function generateSessionId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
const unavailableSessions = new Set();
const signalURL = (sessionId) =>
  `${(import.meta.env?.VITE_SIGNALING_RELAY_URL || "/api/signal").replace(/\/+$/, "")}/${encodeURIComponent(sessionId)}`;
export async function postAnswer(sessionId, answer) {
  try {
    const channel = new BroadcastChannel("wii-webrtc-signaling");
    channel.postMessage({ type: "answer", answer, sessionId });
    setTimeout(() => channel.close(), 1000);
  } catch {}
  const url = signalURL(sessionId);
  if (unavailableSessions.has(url)) return false;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
      signal: AbortSignal.timeout(5000),
    });
    if (
      [404, 405].includes(response.status) ||
      (response.ok &&
        !response.headers.get("content-type")?.includes("application/json"))
    )
      unavailableSessions.add(url);
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("application/json")
    )
      return false;
    return (await response.json()).ok === true;
  } catch {
    return false;
  } // The companion's next retry may recover a transient failure.
}
export function pollForAnswer(sessionId, onAnswer, onAvailability) {
  let stopped = false,
    timer,
    channel,
    controller;
  const deliver = (answer) => {
    if (stopped) return;
    stop();
    onAnswer(answer);
  };
  try {
    channel = new BroadcastChannel("wii-webrtc-signaling");
    channel.onmessage = ({ data }) => {
      if (
        data?.type === "answer" &&
        data.sessionId === sessionId &&
        typeof data.answer === "string" &&
        data.answer
      )
        deliver(data.answer);
    };
  } catch {}
  const deadline = Date.now() + 300000;
  async function poll(attempt = 0) {
    if (stopped || Date.now() >= deadline) return;
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(signalURL(sessionId), {
        cache: "no-store",
        signal: controller.signal,
      });
      if (stopped) return;
      if (
        [404, 405].includes(response.status) ||
        (response.ok &&
          !response.headers.get("content-type")?.includes("application/json"))
      ) {
        onAvailability?.(false);
        return;
      }
      if (!response.ok) throw new Error("Relay unavailable");
      const { answer } = await response.json();
      if (stopped) return;
      onAvailability?.(true);
      if (typeof answer === "string" && answer) return deliver(answer);
      timer = setTimeout(() => poll(0), 1000);
    } catch {
      if (stopped) return;
      onAvailability?.(false);
      if (attempt < 2)
        timer = setTimeout(() => poll(attempt + 1), 1000 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }
  void poll();
  function stop() {
    stopped = true;
    clearTimeout(timer);
    controller?.abort();
    channel?.close();
  }
  return stop;
}
