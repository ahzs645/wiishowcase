import { useSyncExternalStore } from "react";

export const SYSTEM_STORAGE_KEY = "wiishowcase.system.v1";
const initialOrder = [
  "disc",
  "mii",
  "photo",
  "shop",
  "news",
  "onliine",
  "pokemon-ranch",
  "forecast",
];
const settingsDefaults = {
  nickname: "Wii",
  timeOffset: 0,
  aspect: "auto",
  screenX: 0,
  sound: "Stereo",
  burnIn: true,
  language: "English",
  country: "United States",
  sensorPosition: "Above TV",
  sensorSensitivity: 3,
  parentalEnabled: false,
  parentalPin: "",
  internet: false,
  connect24: false,
  remoteVolume: 0.5,
  rumble: true,
};
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function defaults() {
  return {
    version: 1,
    settings: { ...settingsDefaults },
    slots: Array.from({ length: 48 }, (_, i) => initialOrder[i] || null),
    sd: [],
    saves: [
      {
        id: "sample-save",
        name: "Wii Sports",
        platform: "Wii",
        storage: "Wii",
        blocks: 2,
      },
    ],
    messages: null,
    read: [],
    friends: [],
    wiiNumber: "8364910275816043",
  };
}
function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(SYSTEM_STORAGE_KEY));
    if (saved?.version !== 1) return defaults();
    const state = {
      ...defaults(),
      ...saved,
      settings: { ...settingsDefaults, ...saved.settings },
    };
    // Corrupt/stale channel lists must never move the fixed Disc slot or grow beyond 48.
    const seen = new Set(["disc"]);
    state.slots = Array.from({ length: 48 }, (_, i) => {
      if (i === 0) return "disc";
      const id = saved.slots?.[i];
      if (!initialOrder.includes(id) || seen.has(id)) return null;
      seen.add(id);
      return id;
    });
    state.sd = [
      ...new Set(
        (saved.sd || []).filter(
          (id) => initialOrder.includes(id) && id !== "disc",
        ),
      ),
    ].slice(0, 240);
    for (const key of ["saves", "read", "friends"])
      if (!Array.isArray(state[key])) state[key] = defaults()[key];
    if (state.messages !== null && !Array.isArray(state.messages))
      state.messages = null;
    return state;
  } catch {
    return defaults();
  }
}
let snapshot = read();
const listeners = new Set();
let storageError = "";
export function systemSnapshot() {
  return snapshot;
}
export function useSystemSetting(name) {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => snapshot.settings[name],
    () => settingsDefaults[name],
  );
}
export function useSystemState() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    systemSnapshot,
    systemSnapshot,
  );
}
export function updateSystem(updater) {
  const next =
    typeof updater === "function"
      ? updater(snapshot)
      : { ...snapshot, ...updater };
  try {
    localStorage.setItem(SYSTEM_STORAGE_KEY, JSON.stringify(next));
    storageError = "";
  } catch {
    storageError =
      "Storage is full or unavailable. Changes will last until this page closes.";
  }
  snapshot = next;
  listeners.forEach((fn) => fn());
  return next;
}
export function getStorageError() {
  return storageError;
}
export function setSetting(name, value) {
  updateSystem((s) => ({ ...s, settings: { ...s.settings, [name]: value } }));
}
export function swapSlots(from, to) {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 1 ||
    to < 1 ||
    from >= 48 ||
    to >= 48 ||
    !snapshot.slots[from]
  )
    return false;
  updateSystem((s) => {
    const slots = [...s.slots];
    [slots[from], slots[to]] = [slots[to], slots[from]];
    return { ...s, slots };
  });
  return true;
}
export function channelTransfer(id, source, operation) {
  if (id === "disc") return "The Disc Channel cannot be moved or erased.";
  const s = snapshot,
    destination = source === "Wii" ? "SD" : "Wii";
  if (
    operation !== "Erase" &&
    (destination === "Wii"
      ? !s.slots.slice(1).includes(null) && !s.slots.includes(id)
      : s.sd.length >= 240 && !s.sd.includes(id))
  )
    return `There is not enough space on ${destination}.`;
  updateSystem((state) => {
    let slots = [...state.slots],
      sd = [...state.sd];
    if (operation !== "Erase") {
      if (destination === "SD" && !sd.includes(id)) sd.push(id);
      if (destination === "Wii" && !slots.includes(id))
        slots[slots.indexOf(null, 1)] = id;
    }
    if (operation === "Move" || operation === "Erase") {
      if (source === "Wii")
        slots = slots.map((item) => (item === id ? null : item));
      else sd = sd.filter((item) => item !== id);
    }
    return { ...state, slots, sd };
  });
  return "";
}
export function seedMessages(messages) {
  if (snapshot.messages === null) updateSystem((s) => ({ ...s, messages }));
}
export function addMessage(message) {
  updateSystem((s) => ({
    ...s,
    messages: [
      ...(s.messages || []),
      {
        id: crypto.randomUUID(),
        type: "memo",
        dateKey: dateKey(),
        x: 15 + ((s.messages?.length || 0) % 3) * 24,
        y: 18 + ((s.messages?.length || 0) % 2) * 28,
        ...message,
      },
    ],
  }));
}
export function markRead(id) {
  if (!snapshot.read.includes(id))
    updateSystem((s) => ({ ...s, read: [...s.read, id] }));
}
export function deleteMessage(id) {
  updateSystem((s) => ({
    ...s,
    messages: (s.messages || []).filter((m) => m.id !== id),
    read: s.read.filter((item) => item !== id),
  }));
}
export function resetSystem() {
  updateSystem({ ...defaults(), messages: [] });
}
window.addEventListener("storage", (e) => {
  if (e.key === SYSTEM_STORAGE_KEY) {
    snapshot = read();
    listeners.forEach((fn) => fn());
  }
});
