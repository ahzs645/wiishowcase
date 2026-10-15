import { useEffect, useRef, useState } from "react";
import {
  useSystemState,
  setSetting,
  updateSystem,
  resetSystem,
  getStorageError,
} from "../../lib/systemState";
import { resolveMenuRegion } from "../../lib/menuClock";
import { WiiButton, WiiTile, SystemDialog } from "./SystemUI";
import { ChoiceList, DateSelector, TimeSelector } from "./SettingsControls";
import SystemKeyboard from "./SystemKeyboard";
import SystemArt from "./SystemArt";

const PAGES = [
  ["Console Nickname", "Calendar", "Screen", "Sound"],
  ["Parental Controls", "Sensor Bar", "Internet", "WiiConnect24"],
  ["Language", "Country", "Wii System Update", "Format Wii System Memory"],
];
const COUNTRIES = [
  "Argentina",
  "Australia",
  "Austria",
  "Belgium",
  "Brazil",
  "Canada",
  "Chile",
  "Colombia",
  "Denmark",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Ireland",
  "Italy",
  "Japan",
  "Luxembourg",
  "Mexico",
  "Netherlands",
  "New Zealand",
  "Norway",
  "Peru",
  "Poland",
  "Portugal",
  "South Africa",
  "Spain",
  "Sweden",
  "Switzerland",
  "United Kingdom",
  "United States",
];
const FIELDS = {
  "Console Nickname": ["nickname"],
  Sound: ["sound"],
  "Widescreen Settings": ["aspect"],
  "Screen Position": ["screenX"],
  "TV Resolution": ["tvResolution"],
  "Screen Burn-in Reduction": ["burnIn"],
  "Sensor Bar Position": ["sensorPosition"],
  Sensitivity: ["sensorSensitivity"],
  Language: ["language"],
  Country: ["country"],
  "WiiConnect24 On/Off": ["connect24"],
  "Standby Connection": ["standby"],
  "Slot Illumination": ["slotIllumination"],
  "Game Rating": ["parentalRating"],
  "Secret Question": ["secretQuestion", "secretAnswer"],
};
const RATING = [
  "All ages",
  "Everyone",
  "Everyone 10+",
  "Teen",
  "Mature 17+",
  "Adults Only",
];

export default function SettingsPanel({
  visible,
  onBack,
  onSystemUpdate,
  onFormat,
  DataManagement,
  initialPath,
}) {
  const system = useSystemState(),
    settings = system.settings;
  const [path, setPath] = useState([]),
    [page, setPage] = useState(0),
    [draft, setDraft] = useState(settings);
  const [keyboard, setKeyboard] = useState(null),
    [confirm, setConfirm] = useState(false),
    [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false),
    [notice, setNotice] = useState("");
  const [date, setDate] = useState("2026-01-01"),
    [time, setTime] = useState("12:00");
  const [countryPage, setCountryPage] = useState(0),
    [connection, setConnection] = useState(0);
  const ref = useRef(null);
  const screen = path.at(-1);
  const dataGrid =
    path[0] === "Data Management" &&
    ["Wii", "Nintendo GameCube", "Channels"].includes(screen);
  const storageScreen = !screen || path[0] === "Data Management";
  const storageTitleArt = {
    "Save Data": "saves",
    Wii: "wii",
    "Nintendo GameCube": "gamecube",
    Channels: "channels",
  }[screen] || "data";
  const change = (key, value) => setDraft((old) => ({ ...old, [key]: value }));
  useEffect(() => {
    setDraft({ ...settings });
    setNotice("");
    setConfirm(false);
    const now = new Date(Date.now() + settings.timeOffset);
    setDate(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    );
    setTime(
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    );
    setCountryPage(
      Math.max(0, Math.floor(COUNTRIES.indexOf(settings.country) / 4)),
    );
    if (visible) ref.current?.querySelector("button")?.focus();
  }, [screen, visible]);
  useEffect(() => {
    if (!visible) {
      setPath([]);
      setPage(0);
      setKeyboard(null);
      setUnlocked(false);
      setPin("");
    }
  }, [visible]);
  useEffect(() => {
    if (visible && initialPath) setPath([initialPath]);
  }, [visible, initialPath]);
  const go = (label) => {
    setPath((old) => [...old, label]);
    setUnlocked(false);
    setPin("");
  };
  const back = () => {
    if (path.length) setPath(path.slice(0, -1));
    else onBack();
    setUnlocked(false);
    setNotice("");
  };
  const save = () => {
    if (["Date", "Time"].includes(screen)) {
      const parsed = new Date(`${date}T${time}`);
      if (!Number.isNaN(parsed.getTime()))
        setSetting("timeOffset", parsed.getTime() - Date.now());
    } else
      updateSystem((state) => ({
        ...state,
        settings: {
          ...state.settings,
          ...Object.fromEntries(
            (FIELDS[screen] || []).map((key) => [key, draft[key]]),
          ),
        },
      }));
    setNotice("Settings saved.");
  };
  const edit = (key, message, maxLength = 30, password = false) =>
    setKeyboard({
      message,
      value: String(draft[key] || ""),
      maxLength,
      password,
      language: settings.language,
      onConfirm: (value) => change(key, value.trim()),
    });
  const list = (labels) => (
    <div className="system-settings-list">
      {labels.map((label) => (
        <WiiButton key={label} variant="choice" onClick={() => go(label)}>
          {label}
        </WiiButton>
      ))}
    </div>
  );
  const choices = (key, values, label = screen) => (
    <ChoiceList
      label={label}
      values={values}
      value={draft[key]}
      onChange={(v) => change(key, v)}
    />
  );
  const pinGate = (label) => (
    <div className="native-pin-entry">
      <p>Enter your four-digit PIN.</p>
      <input
        aria-label={`${label} parental PIN`}
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
      />
      <WiiButton
        onClick={() => {
          if (pin === settings.parentalPin) {
            setUnlocked(true);
            setPin("");
          } else setNotice("The PIN is incorrect.");
        }}
      >
        Unlock
      </WiiButton>
    </div>
  );
  if (!visible) return null;
  let content,
    extraFooter = null;
  const needsConfirm =
    Boolean(FIELDS[screen]) || ["Date", "Time"].includes(screen);
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
        {["Data Management", "Wii Settings"].map((label) => (
          <WiiTile kind={label === "Wii Settings" ? "settings" : "data"} key={label} onClick={() => go(label)}>{label}</WiiTile>
        ))}
      </div>
    );
  else if (screen === "Wii Settings")
    content = (
      <>
        <div className="system-settings-list">
          {PAGES[page].map((label) => (
            <WiiButton
              key={label}
              variant="choice"
              onClick={() =>
                label === "Wii System Update" ? onSystemUpdate() : go(label)
              }
            >
              {label}
            </WiiButton>
          ))}
        </div>
        {page > 0 && (
          <button
            className="native-settings-arrow is-prev"
            aria-label="Previous Settings page"
            onClick={() => setPage(page - 1)}
          >
            <span className="wii-icon wii-icon-control-next" aria-hidden="true" />
          </button>
        )}
        {page < 2 && (
          <button
            className="native-settings-arrow is-next"
            aria-label="Next Settings page"
            onClick={() => setPage(page + 1)}
          >
            <span className="wii-icon wii-icon-control-next" aria-hidden="true" />
          </button>
        )}
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
  else if (screen === "Calendar") content = list(["Date", "Time"]);
  else if (screen === "Screen")
    content = list([
      "Screen Position",
      "Widescreen Settings",
      "TV Resolution",
      "Screen Burn-in Reduction",
    ]);
  else if (screen === "Sensor Bar")
    content = list(["Sensor Bar Position", "Sensitivity"]);
  else if (screen === "Console Nickname")
    content = (
      <WiiButton
        className="system-button native-text-field"
        onClick={() => edit("nickname", "Console Nickname", 10)}
      >
        {draft.nickname || "Enter nickname"}
      </WiiButton>
    );
  else if (screen === "Date")
    content = (
      <DateSelector
        value={date}
        onChange={setDate}
        country={settings.country}
        region={settings.menuRegion}
      />
    );
  else if (screen === "Time")
    content = <TimeSelector value={time} onChange={setTime} />;
  else if (screen === "Sound")
    content = choices("sound", ["Mono", "Stereo", "Surround"]);
  else if (screen === "Language")
    content = choices("language", [
      ["English", "English"],
      ["French", "Français"],
      ["Spanish", "Español"],
    ]);
  else if (screen === "Country")
    content = (
      <div className="native-country-picker">
        <p>Select your country of residence.</p>
        <ChoiceList
          label="Country"
          values={COUNTRIES.slice(countryPage * 4, countryPage * 4 + 4)}
          value={draft.country}
          onChange={(v) => change("country", v)}
        />
        <div className="native-country-pages">
          <WiiButton
            aria-label="Previous countries"
            disabled={!countryPage}
            onClick={() => setCountryPage(countryPage - 1)}
          >
            ▲
          </WiiButton>
          <WiiButton
            aria-label="Next countries"
            disabled={(countryPage + 1) * 4 >= COUNTRIES.length}
            onClick={() => setCountryPage(countryPage + 1)}
          >
            ▼
          </WiiButton>
        </div>
      </div>
    );
  else if (screen === "Widescreen Settings")
    content = (
      <div className="native-aspect-picker">
        <div>
          {[
            ["4:3", "Standard (4:3)"],
            ["16:9", "Widescreen (16:9)"],
          ].map(([value, label]) => (
            <WiiButton
              key={value}
              aria-pressed={
                (draft.aspect === "auto"
                  ? window.innerWidth / window.innerHeight > 1.5
                    ? "16:9"
                    : "4:3"
                  : draft.aspect) === value
              }
              onClick={() => change("aspect", value)}
            >
              <span
                className={`native-aspect-preview aspect-${value === "4:3" ? "43" : "169"}`}
                aria-hidden="true"
              />
              {label}
            </WiiButton>
          ))}
        </div>
        <WiiButton
          className="system-button native-auto-fit"
          aria-pressed={draft.aspect === "auto"}
          onClick={() => change("aspect", "auto")}
        >
          Automatic
        </WiiButton>
      </div>
    );
  else if (screen === "Screen Position")
    content = (
      <div className="native-position">
        <div
          className="native-position-frame"
          style={{ transform: `translateX(${draft.screenX}px)` }}
        />
        <div>
          <button
            aria-label="Left"
            onClick={() => change("screenX", Math.max(-20, draft.screenX - 1))}
          >
            ◀
          </button>
          <output>{String(draft.screenX).padStart(2, "0")}</output>
          <button
            aria-label="Right"
            onClick={() => change("screenX", Math.min(20, draft.screenX + 1))}
          >
            ▶
          </button>
        </div>
        <WiiButton
          className="system-button native-auto-fit"
          aria-label="Reset position"
          onClick={() => change("screenX", 0)}
        >
          Reset position
        </WiiButton>
      </div>
    );
  else if (screen === "TV Resolution")
    content = (
      <>
        <ChoiceList
          label="TV Resolution"
          values={[
            ["480p", "EDTV or HDTV (480p)"],
            ["480i", "Standard TV (480i)"],
          ]}
          value={draft.tvResolution || "480p"}
          onChange={(v) => change("tvResolution", v)}
        />
        <p className="native-capability-note">
          This display uses its own video output.
        </p>
      </>
    );
  else if (screen === "Screen Burn-in Reduction")
    content = choices("burnIn", [
      [true, "On"],
      [false, "Off"],
    ]);
  else if (screen === "Sensor Bar Position")
    content = choices("sensorPosition", ["Above TV", "Below TV"]);
  else if (screen === "Sensitivity")
    content = (
      <div className="native-sensitivity">
        <div className="sensor-preview">
          <i />
          <i />
        </div>
        <div>
          <WiiButton
            aria-label="Decrease sensitivity"
            disabled={draft.sensorSensitivity <= 1}
            onClick={() =>
              change("sensorSensitivity", draft.sensorSensitivity - 1)
            }
          >
            −
          </WiiButton>
          <input
            aria-label="Sensor sensitivity"
            type="range"
            min="1"
            max="5"
            value={draft.sensorSensitivity}
            onChange={(e) =>
              change("sensorSensitivity", Number(e.target.value))
            }
          />
          <output>{draft.sensorSensitivity}</output>
          <WiiButton
            aria-label="Increase sensitivity"
            disabled={draft.sensorSensitivity >= 5}
            onClick={() =>
              change("sensorSensitivity", draft.sensorSensitivity + 1)
            }
          >
            ＋
          </WiiButton>
        </div>
        <p>Pointing preview · select Confirm when done.</p>
      </div>
    );
  else if (screen === "WiiConnect24")
    content =
      settings.parentalEnabled && !unlocked
        ? pinGate("WiiConnect24")
        : list([
            "WiiConnect24 On/Off",
            "Standby Connection",
            "Slot Illumination",
          ]);
  else if (screen === "WiiConnect24 On/Off")
    content = (
      <>
        {choices("connect24", [
          [true, "On"],
          [false, "Off"],
        ])}
        <p className="native-capability-note">
          Letters stay on this device; WiiConnect24 delivery is unavailable.
        </p>
      </>
    );
  else if (screen === "Standby Connection")
    content = (
      <>
        {choices("standby", [
          [true, "On"],
          [false, "Off"],
        ])}
        <p className="native-capability-note">
          Background delivery is unavailable when this page is closed.
        </p>
      </>
    );
  else if (screen === "Slot Illumination")
    content = choices("slotIllumination", ["Bright", "Dim", "Off"]);
  else if (screen === "Parental Controls")
    content =
      settings.parentalEnabled && !unlocked ? (
        <div className="native-pin-entry">
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
            onClick={() =>
              pin === settings.parentalPin
                ? (setUnlocked(true), setPin(""))
                : setNotice("The PIN is incorrect.")
            }
          >
            Confirm PIN
          </WiiButton>
        </div>
      ) : (
        <div className="native-parental">
          <label>
            Four-digit PIN
            <input
              aria-label="New parental PIN"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <WiiButton onClick={() => go("Secret Question")}>
            Secret Question
          </WiiButton>
          <WiiButton onClick={() => go("Game Rating")}>
            Highest Game Rating Allowed: {settings.parentalRating || "All ages"}
          </WiiButton>
          <div>
            <WiiButton
              disabled={pin.length !== 4}
              onClick={() => {
                updateSystem((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    parentalPin: pin,
                    parentalEnabled: true,
                  },
                }));
                setPin("");
                setUnlocked(true);
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
          </div>
          <p className="native-capability-note">
            PIN restrictions protect online preferences. Channel age-rating data
            is unavailable.
          </p>
        </div>
      );
  else if (screen === "Secret Question")
    content = (
      <div className="native-secret">
        <p>Choose a question and answer for your PIN.</p>
        <WiiButton
          onClick={() => edit("secretQuestion", "Secret question", 80)}
        >
          {draft.secretQuestion || "What is your favourite food?"}
        </WiiButton>
        <WiiButton
          onClick={() => edit("secretAnswer", "Secret answer", 30, true)}
        >
          {draft.secretAnswer ? "••••••" : "Enter answer"}
        </WiiButton>
      </div>
    );
  else if (screen === "Game Rating")
    content = (
      <div className="native-rating">
        <p>Select the highest game rating allowed.</p>
        <ChoiceList
          label="Game rating"
          values={RATING}
          value={draft.parentalRating || "All ages"}
          onChange={(v) => change("parentalRating", v)}
        />
      </div>
    );
  else if (screen === "Internet")
    content =
      settings.parentalEnabled && !unlocked
        ? pinGate("Internet")
        : list([
            "Connection Settings",
            "Console Information",
            "User Agreements",
          ]);
  else if (screen === "Connection Settings")
    content = (
      <div className="native-connections">
        {[0, 1, 2].map((i) => (
          <WiiButton
            key={i}
            onClick={() => {
              setConnection(i);
              go("Connection Type");
            }}
          >
            Connection {i + 1}
            <span>{settings.connections?.[i] || "None"}</span>
          </WiiButton>
        ))}
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
                ? "Connection test: online."
                : "Connection test: offline.",
            )
          }
        >
          Connection Test
        </WiiButton>
      </div>
    );
  else if (screen === "Connection Type")
    content = (
      <div className="native-connection-types">
        {["Wireless Connection", "Wired Connection"].map((kind) => (
          <WiiButton
            key={kind}
            onClick={() => {
              const connections = [
                ...(settings.connections || ["None", "None", "None"]),
              ];
              connections[connection] = kind;
              setSetting("connections", connections);
              setNotice(
                "Preference saved. This browser uses its existing network connection.",
              );
            }}
          >
            {kind}
          </WiiButton>
        ))}
      </div>
    );
  else if (screen === "Console Information")
    content = (
      <div className="native-information">
        <p>Wii Number</p>
        <strong>{system.wiiNumber.match(/.{1,4}/g).join(" ")}</strong>
        <p>
          {navigator.onLine
            ? "This display is online."
            : "This display is offline."}
        </p>
      </div>
    );
  else if (screen === "User Agreements")
    content = (
      <div className="native-information">
        <p>This recreation stores settings and messages on this device.</p>
        <p>
          It does not connect to Nintendo's discontinued Wii services. Online
          channel data uses your browser connection.
        </p>
      </div>
    );
  else if (screen === "Format Wii System Memory") {
    content = (
      <div className="native-format-warning">
        <p>
          All local channel arrangements, messages, Address Book entries and
          settings will be erased.
        </p>
        <p>Channel artwork and source files stay available.</p>
        <p>Do you still wish to continue?</p>
      </div>
    );
    extraFooter = (
      <WiiButton onClick={() => setConfirm(true)}>Format</WiiButton>
    );
  }
  const title = !screen
    ? "Wii Options"
    : screen === "Wii Settings"
      ? `Wii System Settings ${page + 1}`
      : screen === "WiiConnect24 On/Off"
        ? "WiiConnect24"
        : screen;
  return (
    <div
      ref={ref}
      className={`wii-settings-screen system-settings native-system-settings${path[0] === "Wii Settings" ? " native-settings-page" : ""}${storageScreen ? " native-storage-page" : ""}${dataGrid ? " system-data-screen" : ""}${screen === "Wii Settings" ? " system-settings-index" : ""}`}
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
          {storageScreen && path.length > 1 && (
            <span className="native-storage-breadcrumbs" aria-hidden="true">
              <SystemArt kind="data" />
              {dataGrid && <SystemArt kind="saves" />}
            </span>
          )}
          {path[0] === "Wii Settings" && screen !== "Wii Settings" && (
            <span className="native-settings-tabs" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
          <h1 className={!screen ? "system-visually-hidden" : undefined}>
            {storageScreen && screen && (
              <SystemArt kind={storageTitleArt} />
            )}
            {title}
          </h1>
          {screen === "Wii Settings" ? (
            <span className="system-version">
              Ver. 4.3{resolveMenuRegion(settings.country, settings.menuRegion)}
              <span className="system-visually-hidden"> layout profile</span>
            </span>
          ) : (
            <span className="system-wii-logo" aria-hidden="true">
              <span className="wii-icon wii-icon-wii" />
            </span>
          )}
        </header>
        <main>
          {content}
          <p role="status" className="system-status">
            {notice || getStorageError()}
          </p>
        </main>
        <footer>
          <WiiButton className="wii-settings-back" variant="action" onClick={back}>
            Back
          </WiiButton>
          {needsConfirm && <WiiButton variant="action" onClick={save}>Confirm</WiiButton>}
          {extraFooter}
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
