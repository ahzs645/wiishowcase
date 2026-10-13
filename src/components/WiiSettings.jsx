import { useState, useRef, useEffect } from "react";
import {
  useSystemState,
  setSetting,
  channelTransfer,
  updateSystem,
  resetSystem,
  getStorageError,
} from "../lib/systemState";
import { CHANNEL_CATALOG } from "./WiiMenu";
import { WiiButton, SystemDialog } from "./system/SystemUI";
import SystemKeyboard from "./system/SystemKeyboard";
import SystemArt from "./system/SystemArt";
import settingsIcon from "../../Wii.css/assets/settings-icon.png";

const PAGES = [
  ["Console Nickname", "Calendar", "Screen", "Sound"],
  ["Parental Controls", "Sensor Bar", "Internet", "WiiConnect24"],
  ["Language", "Country", "Wii System Update", "Format Wii System Memory"],
];
const CHOICES = {
  Sound: ["Mono", "Stereo", "Surround"],
  Language: ["English", "French", "Spanish"],
  Country: [
    "United States",
    "Canada",
    "United Kingdom",
    "France",
    "Spain",
    "Japan",
    "Australia",
  ],
};
const DATA_ART = {
  disc: "disc/disc.png",
  mii: "mii/miis.png",
  photo: "photo/fore.png",
  shop: "shop/logo.png",
  news: "news/map.png",
  "pokemon-ranch": "pokemon-ranch/icon.png",
  onliine: "onliine/logotype.png",
};
function DataPreview({ item }) {
  const art = DATA_ART[item.id];
  return art ? (
    <img src={`${import.meta.env.BASE_URL}channelart/${art}`} alt="" />
  ) : (
    <span className="data-preview-label" aria-hidden="true">
      {item.name}
    </span>
  );
}
function DataManagement({ path, setPath, system }) {
  const [storage, setStorage] = useState("Wii");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [operation, setOperation] = useState(null);
  const [notice, setNotice] = useState("");
  const kind = path.at(-1);
  const isChannels = kind === "Channels";
  const isSaves = ["Wii", "Nintendo GameCube"].includes(kind);
  const channels = (storage === "Wii" ? system.slots : system.sd)
    .map((id) => CHANNEL_CATALOG.find((c) => c.id === id))
    .filter(Boolean);
  const saves = system.saves.filter(
    (s) => s.platform === kind && s.storage === storage,
  );
  const items = isChannels ? channels : saves;
  const apply = () => {
    let error = "";
    if (isChannels) error = channelTransfer(selected.id, storage, operation);
    else
      updateSystem((s) => {
        const destination = storage === "Wii" ? "SD" : "Wii";
        const saves =
          operation === "Erase"
            ? s.saves.filter((item) => item.id !== selected.id)
            : operation === "Move"
              ? s.saves.map((item) =>
                  item.id === selected.id
                    ? { ...item, storage: destination }
                    : item,
                )
              : [
                  ...s.saves,
                  {
                    ...selected,
                    id: crypto.randomUUID(),
                    storage: destination,
                  },
                ];
        return { ...s, saves };
      });
    setNotice(
      error ||
        `${selected.name}: ${operation === "Erase" ? "erased" : operation === "Move" ? "moved" : "copied"}.`,
    );
    setOperation(null);
    setSelected(null);
  };
  if (!isChannels && !isSaves)
    return (
      <div className="system-tile-grid">
        {(kind === "Data Management"
          ? ["Save Data", "Channels"]
          : ["Wii", "Nintendo GameCube"]
        ).map((label) => (
          <button
            className="system-tile"
            key={label}
            onClick={() => {
              setPath([...path, label]);
              setPage(0);
              setStorage("Wii");
            }}
          >
            <SystemArt kind={label === "Channels" ? "channels" : "saves"} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    );
  return (
    <>
      <div className="system-tabs" aria-label="Data storage">
        {(kind === "Nintendo GameCube"
          ? ["Slot A", "Slot B"]
          : ["Wii", "SD"]
        ).map((label) => (
          <WiiButton
            key={label}
            aria-pressed={storage === label}
            onClick={() => {
              setStorage(label);
              setPage(0);
            }}
          >
            {label === "SD" ? "SD Card" : label}
          </WiiButton>
        ))}
      </div>
      <div className="data-grid">
        {Array.from({ length: 15 }, (_, i) => {
          const item = items[page * 15 + i];
          return (
            <button
              key={i}
              aria-label={
                item
                  ? `${item.name} data`
                  : `Empty data slot ${page * 15 + i + 1}`
              }
              disabled={!item}
              className="data-slot"
              onClick={() => setSelected(item)}
            >
              {item ? <DataPreview item={item} /> : null}
            </button>
          );
        })}
      </div>
      <div
        className={`system-pagination data-pagination${items.length <= 15 ? " system-visually-hidden" : ""}`}
      >
        <WiiButton disabled={page === 0} onClick={() => setPage(page - 1)}>
          ‹
        </WiiButton>
        <span>
          {page + 1} / {Math.max(1, Math.ceil(items.length / 15))} ·{" "}
          {items.length} items
        </span>
        <WiiButton
          disabled={(page + 1) * 15 >= items.length}
          onClick={() => setPage(page + 1)}
        >
          ›
        </WiiButton>
      </div>
      <p role="status" className="system-status data-status">
        {notice ||
          (kind === "Nintendo GameCube"
            ? "No memory card is inserted."
            : `${items.length} ${items.length === 1 ? "item" : "items"} · Local data`)}
      </p>
      {selected && (
        <SystemDialog
          title={selected.name}
          onBack={() => {
            setSelected(null);
            setOperation(null);
          }}
          actions={
            operation ? (
              <>
                <WiiButton onClick={apply}>Yes</WiiButton>
                <WiiButton onClick={() => setOperation(null)}>No</WiiButton>
              </>
            ) : null
          }
        >
          {operation ? (
            <p>
              {operation} {selected.name}
              {operation !== "Erase"
                ? ` to ${storage === "Wii" ? "SD Card" : "Wii System Memory"}`
                : ""}
              ?
            </p>
          ) : (
            <>
              <p>{selected.blocks || 1} blocks</p>
              <div className="system-actions">
                {["Copy", "Move", "Erase"].map((action) => (
                  <WiiButton
                    key={action}
                    disabled={selected.id === "disc"}
                    onClick={() => setOperation(action)}
                  >
                    {action}
                  </WiiButton>
                ))}
              </div>
              {selected.id === "disc" && (
                <p>The Disc Channel stays on the Wii Menu.</p>
              )}
            </>
          )}
        </SystemDialog>
      )}
    </>
  );
}
export default function WiiSettings({
  visible,
  onBack,
  onSystemUpdate,
  onFormat,
}) {
  const system = useSystemState();
  const settings = system.settings;
  const [path, setPath] = useState([]);
  const [page, setPage] = useState(0);
  const [keyboard, setKeyboard] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [pin, setPin] = useState("");
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [notice, setNotice] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const shellRef = useRef(null);
  useEffect(() => {
    if (visible) shellRef.current?.querySelector("button")?.focus();
  }, [visible, path]);
  useEffect(() => {
    if (!visible) {
      setPath([]);
      setPage(0);
      setKeyboard(null);
      setPinUnlocked(false);
      setNotice("");
    }
  }, [visible]);
  const screen = path.at(-1);
  const dataGrid = ["Wii", "Nintendo GameCube", "Channels"].includes(screen);
  const back = () => {
    if (path.length) setPath(path.slice(0, -1));
    else onBack();
    setConfirm(false);
    setNotice("");
    setPinUnlocked(false);
  };
  const edit = (key, label, maxLength = 30) =>
    setKeyboard({
      message: label,
      value: String(settings[key] || ""),
      maxLength,
      language: settings.language,
      onConfirm: (value) => {
        if (value.trim()) setSetting(key, value.trim());
      },
    });
  if (!visible) return null;
  let content;
  if (path[0] === "Data Management")
    content = (
      <DataManagement
        key={screen}
        path={path}
        setPath={setPath}
        system={system}
      />
    );
  else if (!screen)
    content = (
      <div className="system-tile-grid">
        <button
          className="system-tile"
          onClick={() => setPath(["Data Management"])}
        >
          <SystemArt kind="data" />
          <span>Data Management</span>
        </button>
        <button
          className="system-tile"
          onClick={() => setPath(["Wii Settings"])}
        >
          <img src={settingsIcon} alt="" />
          <span>Wii Settings</span>
        </button>
      </div>
    );
  else if (screen === "Wii Settings")
    content = (
      <>
        <div className="system-settings-list">
          {PAGES[page].map((label) => (
            <WiiButton
              key={label}
              onClick={() => {
                if (label === "Wii System Update") onSystemUpdate();
                else {
                  setPath([...path, label]);
                  setConfirm(false);
                  setNotice("");
                }
              }}
            >
              {label}
            </WiiButton>
          ))}
        </div>
        <div className="system-settings-pages">
          {[0, 1, 2].map((i) => (
            <WiiButton
              key={i}
              aria-label={`Settings page ${i + 1}`}
              aria-pressed={page === i}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </WiiButton>
          ))}
        </div>
      </>
    );
  else if (screen === "Console Nickname")
    content = (
      <div className="system-detail">
        <p>Give your Wii console a nickname.</p>
        <WiiButton onClick={() => edit("nickname", "Console Nickname", 10)}>
          {settings.nickname}
        </WiiButton>
        <p>Up to 10 characters.</p>
      </div>
    );
  else if (screen === "Calendar")
    content = (
      <div className="system-settings-list">
        {["Date", "Time"].map((label) => (
          <WiiButton
            key={label}
            onClick={() => {
              const now = new Date(Date.now() + settings.timeOffset);
              setDate(
                `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
              );
              setTime(
                `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
              );
              setPath([...path, label]);
            }}
          >
            {label}
          </WiiButton>
        ))}
      </div>
    );
  else if (["Date", "Time"].includes(screen))
    content = (
      <div className="system-detail">
        <label>
          {screen}
          <input
            aria-label={`Console ${screen.toLowerCase()}`}
            type={screen === "Date" ? "date" : "time"}
            value={screen === "Date" ? date : time}
            onChange={(e) =>
              screen === "Date"
                ? setDate(e.target.value)
                : setTime(e.target.value)
            }
          />
        </label>
        <WiiButton
          onClick={() => {
            const parsed = new Date(`${date}T${time}`);
            if (!Number.isNaN(parsed.getTime())) {
              setSetting("timeOffset", parsed.getTime() - Date.now());
              setNotice("Calendar saved.");
            }
          }}
        >
          Confirm
        </WiiButton>
      </div>
    );
  else if (screen === "Screen")
    content = (
      <div className="system-settings-list">
        {[
          "Screen Position",
          "Widescreen Settings",
          "TV Resolution",
          "Screen Burn-in Reduction",
        ].map((label) => (
          <WiiButton key={label} onClick={() => setPath([...path, label])}>
            {label}
          </WiiButton>
        ))}
      </div>
    );
  else if (screen === "Widescreen Settings")
    content = (
      <div className="system-detail">
        <p>Choose the display proportions.</p>
        {[
          ["auto", "Automatic"],
          ["4:3", "Standard (4:3)"],
          ["16:9", "Widescreen (16:9)"],
        ].map(([value, label]) => (
          <WiiButton
            key={value}
            aria-pressed={settings.aspect === value}
            onClick={() => setSetting("aspect", value)}
          >
            {label}
          </WiiButton>
        ))}
      </div>
    );
  else if (screen === "Screen Position")
    content = (
      <div className="system-detail">
        <div className="screen-position-preview">
          <span style={{ transform: `translateX(${settings.screenX}px)` }}>
            ＋
          </span>
        </div>
        <div className="system-actions">
          <WiiButton
            onClick={() =>
              setSetting("screenX", Math.max(-20, settings.screenX - 1))
            }
          >
            Left
          </WiiButton>
          <span>{settings.screenX}</span>
          <WiiButton
            onClick={() =>
              setSetting("screenX", Math.min(20, settings.screenX + 1))
            }
          >
            Right
          </WiiButton>
          <WiiButton onClick={() => setSetting("screenX", 0)}>
            Reset position
          </WiiButton>
        </div>
      </div>
    );
  else if (screen === "TV Resolution")
    content = (
      <div className="system-detail">
        <p>Progressive display</p>
        <p>
          This display uses the screen's native resolution. TV output modes do
          not change the browser display.
        </p>
      </div>
    );
  else if (screen === "Screen Burn-in Reduction" || screen === "WiiConnect24") {
    const key = screen === "WiiConnect24" ? "connect24" : "burnIn";
    content = (
      <div className="system-detail">
        <p>
          {key === "connect24"
            ? "WiiConnect24 delivery is unavailable. Letters are saved on this device."
            : "Dim the display after five minutes without input."}
        </p>
        {key === "connect24" && settings.parentalEnabled && !pinUnlocked ? (
          <>
            <input
              type="password"
              aria-label="WiiConnect24 parental PIN"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <WiiButton
              onClick={() => {
                if (pin === settings.parentalPin) {
                  setPinUnlocked(true);
                  setPin("");
                } else setNotice("The PIN is incorrect.");
              }}
            >
              Unlock
            </WiiButton>
          </>
        ) : (
          [true, false].map((value) => (
            <WiiButton
              key={String(value)}
              aria-pressed={settings[key] === value}
              onClick={() => setSetting(key, value)}
            >
              {value ? "On" : "Off"}
            </WiiButton>
          ))
        )}
      </div>
    );
  } else if (CHOICES[screen]) {
    const key = screen === "Sound" ? "sound" : screen.toLowerCase();
    content = (
      <div className="system-detail">
        {CHOICES[screen].map((value) => (
          <WiiButton
            key={value}
            aria-pressed={settings[key] === value}
            onClick={() => setSetting(key, value)}
          >
            {value}
          </WiiButton>
        ))}
        {screen === "Sound" && (
          <p>
            Mono and stereo apply to channel sound playback. Surround is played
            through the available stereo output.
          </p>
        )}
      </div>
    );
  } else if (screen === "Parental Controls")
    content = (
      <div className="system-detail">
        {settings.parentalEnabled && !pinUnlocked ? (
          <>
            <p>Enter your four-digit PIN.</p>
            <input
              aria-label="Parental PIN"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
            <WiiButton
              onClick={() => {
                if (pin === settings.parentalPin) {
                  setPinUnlocked(true);
                  setPin("");
                  setNotice("");
                } else setNotice("The PIN is incorrect.");
              }}
            >
              Confirm PIN
            </WiiButton>
          </>
        ) : (
          <>
            <p>
              Require a PIN before changing Internet and WiiConnect24 settings.
            </p>
            <label>
              New four-digit PIN
              <input
                aria-label="New parental PIN"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <WiiButton
              disabled={pin.length !== 4}
              onClick={() => {
                setSetting("parentalPin", pin);
                setSetting("parentalEnabled", true);
                setPin("");
                setNotice("Parental Controls enabled.");
              }}
            >
              Enable
            </WiiButton>
            <WiiButton
              onClick={() => {
                setSetting("parentalEnabled", false);
                setSetting("parentalPin", "");
                setNotice("Parental Controls disabled.");
              }}
            >
              Disable
            </WiiButton>
          </>
        )}
      </div>
    );
  else if (screen === "Sensor Bar")
    content = (
      <div className="system-settings-list">
        {["Sensor Bar Position", "Sensitivity"].map((label) => (
          <WiiButton key={label} onClick={() => setPath([...path, label])}>
            {label}
          </WiiButton>
        ))}
      </div>
    );
  else if (screen === "Sensor Bar Position")
    content = (
      <div className="system-detail">
        {["Above TV", "Below TV"].map((value) => (
          <WiiButton
            key={value}
            aria-pressed={settings.sensorPosition === value}
            onClick={() => setSetting("sensorPosition", value)}
          >
            {value}
          </WiiButton>
        ))}
        <p>
          Phone pointing uses motion or touch rather than an infrared sensor
          bar.
        </p>
      </div>
    );
  else if (screen === "Sensitivity")
    content = (
      <div className="system-detail">
        <div className="sensor-preview">●　●</div>
        <label>
          Sensitivity {settings.sensorSensitivity}
          <input
            aria-label="Sensor sensitivity"
            type="range"
            min="1"
            max="5"
            value={settings.sensorSensitivity}
            onChange={(e) =>
              setSetting("sensorSensitivity", Number(e.target.value))
            }
          />
        </label>
      </div>
    );
  else if (screen === "Internet")
    content = (
      <div className="system-detail">
        <p>Connection Settings</p>
        <p>
          {navigator.onLine
            ? "The display is online."
            : "The display is offline."}
        </p>
        {settings.parentalEnabled && !pinUnlocked ? (
          <>
            <input
              type="password"
              aria-label="Internet parental PIN"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <WiiButton
              onClick={() => {
                if (pin === settings.parentalPin) {
                  setPinUnlocked(true);
                  setPin("");
                } else setNotice("The PIN is incorrect.");
              }}
            >
              Unlock
            </WiiButton>
          </>
        ) : (
          <>
            <WiiButton
              aria-pressed={settings.internet}
              onClick={() => setSetting("internet", !settings.internet)}
            >
              {settings.internet
                ? "Allow online channel data"
                : "Online channel data is off"}
            </WiiButton>
            <WiiButton
              onClick={() =>
                setNotice(
                  navigator.onLine
                    ? "Connection test: online. Wii services are not contacted."
                    : "Connection test: offline.",
                )
              }
            >
              Connection Test
            </WiiButton>
            <WiiButton
              onClick={() =>
                setNotice(`${system.wiiNumber.match(/.{1,4}/g).join(" ")}`)
              }
            >
              Console Information
            </WiiButton>
          </>
        )}
      </div>
    );
  else if (screen === "Format Wii System Memory")
    content = (
      <div className="system-detail">
        <p>
          Erase saved settings, channel arrangements, messages and Address Book
          entries on this device?
        </p>
        <p>Channel artwork and source files will stay available.</p>
        <WiiButton onClick={() => setConfirm(true)}>Format</WiiButton>
      </div>
    );
  return (
    <div
      ref={shellRef}
      className={`wii-settings-screen system-settings${dataGrid ? " system-data-screen" : ""}${screen === "Wii Settings" ? " system-settings-index" : ""}`}
      data-settings-path={screen || "Options"}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          back();
        }
      }}
    >
      <section className="system-settings-shell">
        <header>
          <h1 className={!screen ? "system-visually-hidden" : undefined}>
            {!screen
              ? "Wii Options"
              : screen === "Wii Settings"
                ? `Wii System Settings ${page + 1}`
                : dataGrid && screen !== "Channels"
                  ? "Save Data"
                  : screen}
          </h1>
          <span className="system-wii-logo">Wii</span>
        </header>
        <main>
          {content}
          <p role="status" className="system-status">
            {notice || getStorageError()}
          </p>
        </main>
        <footer>
          <button className="wii-settings-back system-button" onClick={back}>
            Back
          </button>
        </footer>
      </section>
      {confirm && (
        <SystemDialog
          title="Format Wii System Memory"
          onBack={() => setConfirm(false)}
          actions={
            <WiiButton
              onClick={() => {
                resetSystem();
                setPath([]);
                setConfirm(false);
                onFormat?.();
              }}
            >
              Erase saved data
            </WiiButton>
          }
        >
          <p>This will erase saved data on this device. Continue?</p>
        </SystemDialog>
      )}
      <SystemKeyboard request={keyboard} onClose={() => setKeyboard(null)} />
    </div>
  );
}
