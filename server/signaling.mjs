// Shared by Vite and the standalone Node service. Answers are opaque, short-lived
// signaling messages; this service does not forward controller input or media.
export function createSignalingMiddleware({
  allowedOrigins = [],
  ttlMs = 300000,
  maxSessions = 1000,
  maxBodyBytes = 32768,
  now = Date.now,
} = {}) {
  const sessions = new Map();
  return function signaling(
    req,
    res,
    next = () => {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    },
  ) {
    const path = new URL(req.url, "http://localhost").pathname;
    if (!path.startsWith("/api/signal/")) return next();
    const origin = req.headers.origin;
    const sameHost =
      origin &&
      ["http:", "https:"].some(
        (protocol) => origin === `${protocol}//${req.headers.host}`,
      );
    const allowed = !origin || sameHost || allowedOrigins.includes(origin);
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
    };
    if (origin && allowed) headers["Access-Control-Allow-Origin"] = origin;
    const send = (status, data) => {
      res.writeHead(status, headers);
      res.end(JSON.stringify(data));
    };
    if (!allowed) return send(403, { error: "Origin not allowed" });
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        ...headers,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      return res.end();
    }
    const session = path.slice("/api/signal/".length);
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(session))
      return send(400, { error: "Invalid session" });
    for (const [id, data] of sessions)
      if (now() - data.createdAt >= ttlMs) sessions.delete(id);
    if (req.method === "GET")
      return send(200, { answer: sessions.get(session)?.answer || null });
    if (req.method !== "POST")
      return send(405, { error: "Method not allowed" });
    if (
      req.headers["content-type"]?.split(";")[0].trim().toLowerCase() !==
      "application/json"
    )
      return send(415, { error: "JSON required" });
    let body = "",
      bytes = 0,
      finished = false;
    req.on("data", (chunk) => {
      if (finished) return;
      bytes += chunk.length;
      if (bytes > maxBodyBytes) {
        finished = true;
        send(413, { error: "Answer too large" });
        return;
      }
      body += chunk;
    });
    req.on("end", () => {
      if (finished) return;
      let answer;
      try {
        answer = JSON.parse(body).answer;
      } catch {
        return send(400, { error: "Invalid JSON" });
      }
      if (typeof answer !== "string" || !/^[A-Za-z0-9_-]+$/.test(answer))
        return send(400, { error: "Invalid answer" });
      const existing = sessions.get(session);
      if (existing && existing.answer !== answer)
        return send(409, { error: "Session already answered" });
      if (!existing && sessions.size >= maxSessions)
        return send(429, { error: "Relay busy" });
      // Duplicate companion retries must not extend a session's lifetime.
      if (!existing) sessions.set(session, { answer, createdAt: now() });
      send(200, { ok: true });
    });
    req.on("error", () => {
      if (!finished && !res.writableEnded)
        send(400, { error: "Incomplete request" });
    });
  };
}
