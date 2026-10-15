# Wii controller signaling service

GitHub Pages hosts the frontend only. This service runs on a Node 20+ host
behind HTTPS; it needs no npm dependencies, database or persistent disk.

```sh
RELAY_ALLOWED_ORIGINS=https://projects.ahmadjalil.com PORT=8787 node server/relay.mjs
```

Route an HTTPS hostname to that port. `/healthz` is the health check.
`GET /api/signal/<session>` returns `{answer:null}` or `{answer:"..."}`;
`POST` stores a JSON `{answer}`. Sessions expire after five minutes. Answer
storage and payload sizes are bounded; responses are never cached. CORS only
allows the named frontend origins and same-origin clients. Session IDs carry
128 random bits; the service sees only the temporary SDP answer. Controller
input travels over the WebRTC data channel, not this HTTP service.

Set the repository Actions variable `WII_SIGNALING_RELAY_URL` to
`https://<your-relay-host>/api/signal` and redeploy the Pages workflow. It maps
to `VITE_SIGNALING_RELAY_URL`. Vite development and preview automatically use
the same service at `/api/signal`; a static Pages deployment cannot run it.
No production hostname or account is provisioned by this repository.

Signaling and a TURN relay solve different problems. Signaling exchanges
answers; restrictive networks can also need TURN to carry WebRTC traffic.
Optionally set `WII_RTC_CONFIG_URL` to your HTTPS endpoint returning:

```json
{"iceServers":[{"urls":"turns:your-turn-host:5349?transport=tcp","username":"short-lived-user","credential":"short-lived-password"}],"iceTransportPolicy":"all"}
```

That variable maps to `VITE_RTC_CONFIG_URL`. Generate temporary credentials on
your backend; keep the TURN shared secret there. The app fetches configuration
at connection setup and does not bundle a permanent TURN password. This API
must permit the frontend origin. With no config URL, public STUN discovery is
used. An HTTP signaling service by itself cannot bypass a blocked WebRTC route.

Verification runs the actual HTTP endpoints, origin/preflight handling,
expiration, duplicate/conflicting answers, size/capacity bounds, abort and
transient-failure recovery. A separate browser test can use a local coturn
fixture to prove real data-channel transport through TURN over TCP.

For hosts that install a package, set their root directory to `server` and
start command to `npm start`. This folder has its own dependency-free manifest;
it does not require the frontend's private submodules or local Mii package.
Run one service instance. Multiple instances need a shared answer store or
sticky routing so the POST and polling GET reach the same in-memory session.

If you operate coturn with TURN REST authentication, set `TURN_URLS` (comma
separated `turn:`/`turns:` URLs) and `TURN_SHARED_SECRET` on this service.
`/api/rtc-config` then generates one-hour credentials using the coturn shared
secret; point `WII_RTC_CONFIG_URL` to that endpoint. The shared secret remains
on the server. Without those variables the endpoint returns STUN only.
Controller sessions that outlive TURN credential expiry may need re-pairing.
