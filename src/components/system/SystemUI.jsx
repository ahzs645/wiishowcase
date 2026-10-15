import { createPortal } from "react-dom";
import { playSystemFeedback } from "../../lib/systemFeedback";
import useSystemModal from "../../lib/useSystemModal";
import tileData from "../../../Wii.css/assets/interface/tile-data.svg";
import tileSettings from "../../../Wii.css/assets/interface/tile-settings.svg";
import tileWii from "../../../Wii.css/assets/interface/tile-wii.svg";
import tileGamecube from "../../../Wii.css/assets/interface/tile-gamecube.svg";
import SystemArt from "./SystemArt";
const TILES = { data: tileData, saves: tileData, settings: tileSettings, wii: tileWii, gamecube: tileGamecube };
export function WiiTile({ kind, children, ...props }) {
  return <WiiButton className={`system-tile wii-system-tile${TILES[kind] ? " has-supplied-surface" : ""}`} {...props}>
    {TILES[kind] ? <img className="wii-system-tile__surface" src={TILES[kind]} alt="" aria-hidden="true" /> : <SystemArt kind={kind} />}
    <span className="wii-system-tile__label">{children}</span>
  </WiiButton>;
}
export function WiiButton({ children, className = "", variant = "default", onClick, onMouseEnter, ...props }) {
  return (
    <button
      type="button"
      className={`system-button wii-system-button${variant === "default" ? "" : ` wii-system-button--${variant}`} ${className}`.trim()}
      {...props}
      onMouseEnter={(event) => {
        playSystemFeedback("hover");
        onMouseEnter?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        playSystemFeedback(
          children === "Back"
            ? "back"
            : children === "No"
              ? "cancel"
              : "select",
        );
      }}
    >
      {children}
    </button>
  );
}
export function SystemDialog({
  title,
  children,
  onBack,
  actions,
  variant = "dialog",
  backLabel = "Back",
}) {
  const modal = useSystemModal(true, onBack);
  return createPortal(
    <div
      style={modal.style}
      className={`system-dialog-shade system-surface-${variant}`}
      onClick={onBack}
    >
      <section
        ref={modal.ref}
        tabIndex={-1}
        className={`system-dialog${variant === "composer" ? " wii-message-paper" : ""}${variant === "composer" && title === "Letter" ? " wii-message-paper--letter" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={modal.onKeyDown}
      >
        <h2
          className={
            ["sd-title", "message-chooser", "address-book"].includes(variant)
              ? "system-visually-hidden"
              : undefined
          }
        >
          {title}
        </h2>
        <div className="system-dialog-body">{children}</div>
        <div className="system-actions">
          <WiiButton onClick={onBack}>{backLabel}</WiiButton>
          {actions}
        </div>
      </section>
    </div>,
    document.body,
  );
}
