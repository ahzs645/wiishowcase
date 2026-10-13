import { useState, useRef, useEffect } from "react";
import { useSystemState, channelTransfer } from "../../lib/systemState";
import { CHANNEL_CATALOG } from "../WiiMenu";
import ChannelCard from "../ChannelCard";
import { WiiButton, SystemDialog } from "./SystemUI";
export default function SDMenu({ visible, onBack, onChannel }) {
  const system = useSystemState();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    if (visible) ref.current?.querySelector("button")?.focus();
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
      <header>SD Card Menu</header>
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
      <footer>
        <WiiButton onClick={onBack}>Wii Menu</WiiButton>
        <WiiButton
          disabled={page === 0}
          aria-label="Previous SD page"
          onClick={() => setPage(page - 1)}
        >
          ‹
        </WiiButton>
        <span>{page + 1} / 20</span>
        <WiiButton
          disabled={page === 19}
          aria-label="Next SD page"
          onClick={() => setPage(page + 1)}
        >
          ›
        </WiiButton>
      </footer>
      {selected && (
        <SystemDialog
          title={selected.name}
          onBack={() => {
            setSelected(null);
            setNotice("");
          }}
          actions={
            <>
              <WiiButton
                onClick={() => {
                  onChannel(selected);
                  setSelected(null);
                }}
              >
                Start
              </WiiButton>
              <WiiButton
                onClick={() => {
                  const error = channelTransfer(selected.id, "SD", "Copy");
                  setNotice(error || "Copied to the Wii Menu.");
                }}
              >
                Copy to Wii Menu
              </WiiButton>
            </>
          }
        >
          <p>
            {notice ||
              "Open the channel preview or copy the channel to Wii System Memory."}
          </p>
        </SystemDialog>
      )}
    </div>
  );
}
