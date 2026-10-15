import SettingsPanel from "./system/SettingsPanel";
import { useState } from "react";
import { channelTransfer, updateSystem } from "../lib/systemState";
import { CHANNEL_CATALOG } from "./WiiMenu";
import { WiiButton, WiiTile, SystemDialog } from "./system/SystemUI";

const DATA_ART = Object.fromEntries(
  ["mii", "photo", "shop", "news", "forecast", "pokemon-ranch"].map((id) => [
    id,
    `data/${id}.png`,
  ]),
);
DATA_ART.onliine = "onliine/logotype.png";
function DataPreview({ item }) {
  const art = DATA_ART[item.id];
  return art ? (
    <img src={`${import.meta.env.BASE_URL}channelart/${art}`} alt="" />
  ) : (
    <span className="data-preview-label" aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <rect x="6" y="6" width="52" height="52" rx="6" />
        <path d="M16 24h32v20H16z" />
      </svg>
    </span>
  );
}
function DataManagement({ path, setPath, system }) {
  const [storage, setStorage] = useState(() =>
    path.at(-1) === "Nintendo GameCube" ? "Slot A" : "Wii",
  );
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [operation, setOperation] = useState(null);
  const [notice, setNotice] = useState("");
  const kind = path.at(-1);
  const isChannels = kind === "Channels";
  const isSaves = ["Wii", "Nintendo GameCube"].includes(kind);
  const channels = (storage === "Wii" ? system.slots : system.sd)
    .map((id) => CHANNEL_CATALOG.find((c) => c.id === id))
    .filter((item) => item && item.id !== "disc");
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
          <WiiTile
            kind={label === "Channels" ? "channels" : label === "Nintendo GameCube" ? "gamecube" : label === "Wii" ? "wii" : "saves"}
            key={label}
            onClick={() => {
              setPath([...path, label]);
              setPage(0);
              setStorage("Wii");
            }}
          >
              {label === "Nintendo GameCube" ? (
                <>Nintendo<br />GameCube</>
              ) : label}
          </WiiTile>
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
            : "Blocks Open: —")}
      </p>
      {selected && (
        <SystemDialog
          title={selected.name}
          variant={operation ? "dialog" : "data-item"}
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
              <div className="native-data-item-summary"><div className="native-data-item-preview"><DataPreview item={selected} /></div><p>
                {typeof selected.blocks === "number"
                  ? `${selected.blocks} blocks`
                  : "Block size unavailable"}
              </p></div>
              <p className="native-data-item-name">{selected.name}</p>
              <div className="system-actions native-data-item-actions">
                {(isChannels ? ["Move", "Copy", "Erase"] : ["Copy", "Move", "Erase"]).map((action) => (
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
export default function WiiSettings(props) {
  return <SettingsPanel {...props} DataManagement={DataManagement} />;
}
