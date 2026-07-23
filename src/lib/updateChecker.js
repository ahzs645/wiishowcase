/**
 * Update checker — detects when a newer build has been deployed.
 *
 * Flow:
 * 1. `prebuild` stamps the commit SHA into public/version.json on every build.
 * 2. Clients poll version.json (bypassing HTTP cache) and compare its
 *    buildNumber against the one saved in localStorage.
 * 3. On mismatch the caller is notified so the Wii System Update dialog can
 *    offer a reload; applying it reloads with a cache-busting query param.
 *
 * GitHub Pages serves index.html with a ~10 minute max-age, so without this a
 * returning visitor can sit on a stale build until their cache expires.
 */

const VERSION_KEY = 'wiishowcase-version';
const BUILD_KEY = 'wiishowcase-build-number';

const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function isLocalDevServer() {
  return import.meta.env.DEV || LOOPBACK_HOSTNAMES.has(window.location.hostname);
}

function getStoredVersion() {
  try {
    return {
      version: localStorage.getItem(VERSION_KEY),
      buildNumber: localStorage.getItem(BUILD_KEY),
    };
  } catch {
    return { version: null, buildNumber: null };
  }
}

function storeVersion(version, buildNumber) {
  try {
    localStorage.setItem(VERSION_KEY, version);
    localStorage.setItem(BUILD_KEY, buildNumber);
  } catch {
    // localStorage might not be available
  }
}

async function fetchServerVersion() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.version && data.buildNumber ? data : null;
  } catch {
    return null;
  }
}

/** Reload the page, busting the HTTP cache so the new index.html is fetched. */
function applyUpdate(version, buildNumber) {
  storeVersion(version, buildNumber);
  const url = new URL(window.location.href);
  url.searchParams.set('_cb', Date.now().toString());
  window.location.href = url.toString();
}

/**
 * Check the server once. Resolves to { hasUpdate: false } or
 * { hasUpdate: true, version, buildNumber, onReload }.
 */
export async function checkForUpdates() {
  const server = await fetchServerVersion();
  if (!server) return { hasUpdate: false };

  const stored = getStoredVersion();
  if (!stored.buildNumber) {
    // First visit — remember the current build silently.
    storeVersion(server.version, server.buildNumber);
    return { hasUpdate: false };
  }

  if (server.buildNumber !== stored.buildNumber) {
    return {
      hasUpdate: true,
      version: server.version,
      buildNumber: server.buildNumber,
      onReload: () => applyUpdate(server.version, server.buildNumber),
    };
  }

  return { hasUpdate: false };
}

/**
 * Start periodic update checks. `onUpdate` receives the result object from
 * checkForUpdates() whenever a new build is detected.
 */
export function initUpdateChecker(onUpdate) {
  // Clean the cache-busting param left over from a previous update reload.
  const url = new URL(window.location.href);
  if (url.searchParams.has('_cb')) {
    url.searchParams.delete('_cb');
    window.history.replaceState({}, '', url.toString());
  }

  if (isLocalDevServer()) return;

  const runCheck = async () => {
    const result = await checkForUpdates();
    if (result.hasUpdate) onUpdate(result);
  };

  // Initial check shortly after load (don't compete with startup), then poll.
  if (document.readyState === 'complete') {
    setTimeout(runCheck, 2000);
  } else {
    window.addEventListener('load', () => setTimeout(runCheck, 2000), { once: true });
  }
  setInterval(runCheck, UPDATE_CHECK_INTERVAL);
}
