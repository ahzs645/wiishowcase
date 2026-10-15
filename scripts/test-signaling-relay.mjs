import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRelayServer } from "../server/relay.mjs";
const report = { checks: [] };
let clock = 1000;
const server = createRelayServer({
  allowedOrigins: ["https://wii.example"],
  ttlMs: 50,
  maxSessions: 1,
  maxBodyBytes: 256,
  now: () => clock,
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const check = (name, value) => {
  assert.ok(value, name);
  report.checks.push(name);
};
const request = (id, options = {}) =>
  fetch(`${origin}/api/signal/${id}`, {
    ...options,
    headers: { Origin: "https://wii.example", ...options.headers },
  });
const post = (id, answer) =>
  request(id, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer }),
  });
try {
  let configResponse = await fetch(`${origin}/api/rtc-config`, {
    headers: { Origin: "https://wii.example" },
  });
  const rtcConfig = await configResponse.json();
  check(
    "Default RTC endpoint returns STUN without permanent credentials",
    configResponse.ok &&
      rtcConfig.iceServers.length === 1 &&
      rtcConfig.iceServers[0].urls.startsWith("stun:") &&
      !rtcConfig.iceServers[0].credential,
  );
  configResponse = await fetch(`${origin}/api/rtc-config`, {
    headers: { Origin: "https://unrelated.example" },
  });
  check("RTC endpoint rejects unlisted origins", configResponse.status === 403);
  configResponse = await fetch(`${origin}/api/rtc-config`, {
    method: "POST",
    headers: { Origin: "https://wii.example" },
  });
  check("RTC endpoint is read-only", configResponse.status === 405);
  configResponse = await fetch(`${origin}/api/rtc-config`, {
    method: "OPTIONS",
    headers: { Origin: "https://wii.example" },
  });
  check(
    "RTC endpoint supports cross-origin preflight",
    configResponse.status === 204 &&
      configResponse.headers.get("access-control-allow-origin") ===
        "https://wii.example",
  );
  let r = await fetch(`${origin}/healthz`);
  check("Standalone relay health check works", r.ok && (await r.json()).ok);
  r = await request("0123456789abcdef");
  check(
    "Empty session returns JSON without caching",
    r.ok &&
      (await r.json()).answer === null &&
      r.headers.get("cache-control") === "no-store",
  );
  r = await request("0123456789abcdef", {
    method: "OPTIONS",
    headers: { "Access-Control-Request-Method": "POST" },
  });
  check(
    "Allowed frontend passes preflight",
    r.status === 204 &&
      r.headers.get("access-control-allow-origin") === "https://wii.example",
  );
  r = await request("0123456789abcdef", {
    headers: { Origin: "https://unrelated.example" },
  });
  check(
    "Unlisted origins are rejected",
    r.status === 403 && !r.headers.get("access-control-allow-origin"),
  );
  r = await request("bad");
  check("Malformed session rejected", r.status === 400);
  r = await request("0123456789abcdef", { method: "POST", body: "opaque" });
  check("Non-JSON post rejected", r.status === 415);
  r = await request("0123456789abcdef", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  check("Invalid JSON rejected", r.status === 400);
  r = await post("0123456789abcdef", "encoded_answer");
  check("Companion answer stored", r.ok);
  r = await request("0123456789abcdef");
  check(
    "Host receives exact answer",
    r.ok && (await r.json()).answer === "encoded_answer",
  );
  r = await post("0123456789abcdef", "encoded_answer");
  check("Duplicate retries are idempotent", r.ok);
  r = await post("0123456789abcdef", "different_answer");
  check("Conflicting answer rejected", r.status === 409);
  r = await post("second-session-id", "answer");
  check("Session storage is bounded", r.status === 429);
  clock += 51;
  r = await request("0123456789abcdef");
  check(
    "Expired answers are removed",
    r.ok && (await r.json()).answer === null,
  );
  r = await post("second-session-id", "answer");
  check("Expired session frees capacity", r.ok);
  r = await post("oversized-answer", "x".repeat(400));
  check("Oversized payload rejected", r.status === 413);
  // Exercise client callbacks with the real HTTP service, keeping BC disabled.
  const realFetch = globalThis.fetch,
    RealBC = globalThis.BroadcastChannel;
  globalThis.BroadcastChannel = class {
    constructor() {
      throw new Error("Isolated clients");
    }
  };
  globalThis.fetch = (url, opts) => realFetch(new URL(url, origin), opts);
  const { generateSessionId, postAnswer, pollForAnswer } =
    await import("../src/lib/SignalingRelay.js");
  const session = generateSessionId();
  check("Session IDs use 128 random bits", /^[a-f0-9]{32}$/.test(session));
  clock += 51;
  let deliveries = 0;
  const received = new Promise((resolve) => {
    pollForAnswer(session, (value) => {
      deliveries++;
      resolve(value);
    });
  });
  check(
    "Client POST accepts standalone JSON result",
    await postAnswer(session, "opaque_answer"),
  );
  check(
    "Isolated host automatically receives HTTP answer",
    (await received) === "opaque_answer",
  );
  check("Answer delivered once", deliveries === 1);
  let calls = 0;
  globalThis.fetch = async (...args) => {
    if (calls++ === 0) return new Response("Unavailable", { status: 503 });
    return realFetch(new URL(args[0], origin), args[1]);
  };
  clock += 51;
  const retryId = generateSessionId();
  check(
    "Transient POST reports failure",
    (await postAnswer(retryId, "retry_answer")) === false,
  );
  check(
    "Transient POST can recover",
    (await postAnswer(retryId, "retry_answer")) === true,
  );
  let aborted = false;
  globalThis.fetch = (url, { signal }) =>
    new Promise((_, reject) =>
      signal.addEventListener("abort", () => {
        aborted = true;
        reject(new Error("Aborted"));
      }),
    );
  const stop = pollForAnswer(generateSessionId(), () =>
    assert.fail("Cancelled poll delivered"),
  );
  stop();
  await new Promise((r) => setTimeout(r, 0));
  check("Closing pairing aborts the in-flight poll", aborted);
  globalThis.fetch = realFetch;
  globalThis.BroadcastChannel = RealBC;
} finally {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  await fs.writeFile(
    "docs/system-menu-refinement/relay-validation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(
  `PASS ${report.checks.length} standalone relay and automatic client exchange checks.`,
);
