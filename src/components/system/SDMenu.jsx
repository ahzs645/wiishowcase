import { useState, useRef, useEffect } from "react";
import { useSystemState, channelTransfer } from "../../lib/systemState";
import { CHANNEL_CATALOG } from "../WiiMenu";
import ChannelCard from "../ChannelCard";
import { WiiButton, SystemDialog } from "./SystemUI";
export default function SDMenu({ visible, onBack, onChannel, onManage }) {
  const system = useSystemState();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [help, setHelp] = useState(false);
  const [memoryError, setMemoryError] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (visible)
      (
        ref.current?.querySelector("button:not(:disabled)") || ref.current
      )?.focus();
    else {
      setSelected(null);
      setNotice("");
    }
  }, [visible]);
  if (!visible) return null;
  const items = Array.from(
    { length: 240 },
    (_, i) => CHANNEL_CATALOG.find((ch) => ch.id === system.sd[i]) || null,
  );
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="system-sd-screen"
      role="dialog"
      aria-label="SD Card Menu"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          if (selected) setSelected(null);
          else onBack();
        }
      }}
    >
      <h1 className="system-visually-hidden">SD Card Menu</h1>
      <div className="sd-menu-grid">
        {items.slice(page * 12, page * 12 + 12).map((ch, i) => (
          <ChannelCard
            key={page * 12 + i}
            blank={!ch}
            name={ch?.name}
            contentComponent={ch?.contentComponent}
            contentClassName={ch?.contentClassName}
            contentPlaying={!selected}
            onClick={ch ? () => setSelected(ch) : undefined}
          />
        ))}
      </div>
      <button
        className="sd-page-arrow is-prev"
        disabled={page === 0}
        aria-label="Previous SD page"
        onClick={() => setPage(page - 1)}
      >
        ◀
      </button>
      <button
        className="sd-page-arrow is-next"
        disabled={page === 19}
        aria-label="Next SD page"
        onClick={() => setPage(page + 1)}
      >
        ▶
      </button>
      <footer className="sd-native-footer">
        <svg
          viewBox="0 0 640 130"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 15H156C193 15 182 63 234 63H406C458 63 447 15 484 15H640V130H0Z"
            fill="#e6e9ea"
            stroke="#a2dcea"
            strokeWidth="2"
          />
        </svg>
        <button
          className="sd-footer-menu"
          aria-label="Wii Menu"
          onClick={onBack}
        >
          <span className="wii-icon wii-icon-wii" aria-hidden="true" />
        </button>
        <span className="sd-page-count">
          {page + 1}
          <small>/20</small>
        </span>
        <span className="sd-footer-title">SD Card Menu</span>
        <button
          className="sd-footer-help"
          aria-label="SD Card Menu Help"
          onClick={() => setHelp(true)}
        >
          ?
        </button>
      </footer>
      {selected && (
        <SystemDialog
          title={selected.name}
          variant="sd-title"
          onBack={() => {
            setSelected(null);
            setNotice("");
          }}
          actions={
            <>
              <WiiButton
                onClick={() => {
                  if (
                    !system.slots.includes(selected.id) &&
                    system.slots.slice(1).every(Boolean)
                  )
                    setMemoryError(true);
                  else {
                    onChannel(selected);
                    setSelected(null);
                  }
                }}
              >
                Start
              </WiiButton>
            </>
          }
        >
          <div className="sd-title-preview">
            <ChannelCard
              name={selected.name}
              contentComponent={selected.contentComponent}
              contentClassName={selected.contentClassName}
              contentPlaying={false}
            />
            <strong>{selected.name}</strong>
          </div>
          <div className="sd-title-navigation">
            {[-1, 1].map((delta) => {
              const available = items.filter(Boolean),
                index = available.findIndex((ch) => ch.id === selected.id);
              return (
                <button
                  key={delta}
                  aria-label={delta < 0 ? "Previous SD title" : "Next SD title"}
                  disabled={!available[index + delta]}
                  onClick={() => {
                    setSelected(available[index + delta]);
                    setNotice("");
                  }}
                >
                  {delta < 0 ? "◀" : "▶"}
                </button>
              );
            })}
          </div>
          <WiiButton
            className="system-button sd-copy-action"
            onClick={() => {
              const error = channelTransfer(selected.id, "SD", "Copy");
              setNotice(error || "Copied to the Wii Menu.");
            }}
          >
            Copy to Wii Menu
          </WiiButton>
          {notice && <p role="status">{notice}</p>}
        </SystemDialog>
      )}
      {help && (
        <SystemDialog title="SD Card Menu" onBack={() => setHelp(false)}>
          <p>Select a channel, then choose Start.</p>
          <p>
            Use the arrows to view the twenty SD pages. Data Management copies,
            moves or erases channel entries.
          </p>
        </SystemDialog>
      )}
      {memoryError && (
        <SystemDialog
          title="Wii System Memory is full"
          onBack={() => setMemoryError(false)}
          actions={
            <WiiButton
              onClick={() => {
                setMemoryError(false);
                setSelected(null);
                onManage?.();
              }}
            >
              Data Management
            </WiiButton>
          }
        >
          <p>
            Free a Wii Menu slot in Data Management before starting this SD
            channel.
          </p>
        </SystemDialog>
      )}
    </div>
  );
}
