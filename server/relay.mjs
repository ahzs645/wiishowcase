import http from "node:http";
import { pathToFileURL } from "node:url";
import { createHmac, randomUUID } from "node:crypto";
import { createSignalingMiddleware } from "./signaling.mjs";
export function createRelayServer(options = {}) {
  const signaling = createSignalingMiddleware(options);
  return http.createServer(
    { requestTimeout: 10000, headersTimeout: 10000 },
    (req, res) => {
      if (new URL(req.url, "http://localhost").pathname === "/api/rtc-config") {
        const origin = req.headers.origin;
        const allowed =
          !origin ||
          (options.allowedOrigins || []).includes(origin) ||
          ["http:", "https:"].some(
            (protocol) => origin === `${protocol}//${req.headers.host}`,
          );
        const headers = {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          Vary: "Origin",
        };
        if (allowed && origin) headers["Access-Control-Allow-Origin"] = origin;
        if (!allowed) {
          res.writeHead(403, headers);
          return res.end(JSON.stringify({ error: "Origin not allowed" }));
        }
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            ...headers,
            "Access-Control-Allow-Methods": "GET, OPTIONS",
          });
          return res.end();
        }
        if (req.method !== "GET") {
          res.writeHead(405, headers);
          return res.end(JSON.stringify({ error: "Method not allowed" }));
        }
        const iceServers = options.turn?.relayOnly
          ? []
          : [{ urls: "stun:stun.l.google.com:19302" }];
        if (options.turn?.sharedSecret && options.turn.urls?.length) {
          const expires = Math.floor(Date.now() / 1000) + 3600;
          const username = `${expires}:wii-${randomUUID()}`;
          const credential = createHmac("sha1", options.turn.sharedSecret)
            .update(username)
            .digest("base64");
          iceServers.push({ urls: options.turn.urls, username, credential });
        }
        res.writeHead(200, headers);
        return res.end(
          JSON.stringify({
            iceServers,
            iceTransportPolicy: options.turn?.relayOnly ? "relay" : "all",
          }),
        );
      }
      if (req.url === "/healthz" && req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        return res.end(JSON.stringify({ ok: true }));
      }
      signaling(req, res);
    },
  );
}
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const server = createRelayServer({
    allowedOrigins: (
      process.env.RELAY_ALLOWED_ORIGINS || "https://projects.ahmadjalil.com"
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    turn: {
      urls: (process.env.TURN_URLS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      sharedSecret: process.env.TURN_SHARED_SECRET,
    },
  });
  const port = Number(process.env.PORT || 8787);
  server.listen(port, process.env.RELAY_HOST || "0.0.0.0", () =>
    console.log(`Wii signaling relay listening on ${port}`),
  );
  for (const event of ["SIGINT", "SIGTERM"])
    process.on(event, () => server.close());
}
