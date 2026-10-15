const DEFAULT = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
// A deployment can supply short-lived TURN credentials from its own HTTPS API.
// No TURN password or shared secret is compiled into the public application.
export async function loadRTCConfiguration() {
  const url = import.meta.env?.VITE_RTC_CONFIG_URL;
  if (!url) return DEFAULT;
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok)
    throw new Error("Controller network setup is unavailable. Please retry.");
  const value = await response.json();
  if (
    !Array.isArray(value.iceServers) ||
    value.iceServers.length > 16 ||
    value.iceServers.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      return (
        !urls.length ||
        urls.some(
          (url) =>
            typeof url !== "string" || !/^(stun|stuns|turn|turns):/.test(url),
        )
      );
    })
  )
    throw new Error("Controller network setup is invalid.");
  return {
    iceServers: value.iceServers,
    iceTransportPolicy: value.iceTransportPolicy === "relay" ? "relay" : "all",
  };
}
