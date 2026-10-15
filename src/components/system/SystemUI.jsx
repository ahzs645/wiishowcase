import { createPortal } from "react-dom";
import { playSystemFeedback } from "../../lib/systemFeedback";
import useSystemModal from "../../lib/useSystemModal";
export function WiiButton({ children, onClick, onMouseEnter, ...props }) {
  return (
    <button
      type="button"
      className="system-button"
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
        className="system-dialog"
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
