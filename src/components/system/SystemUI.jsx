import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { playSystemFeedback } from "../../lib/systemFeedback";
import { acquireModalLayer, modalScale } from "../../lib/modalLayer";
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
}) {
  const ref = useRef(null);
  const [frame, setFrame] = useState(null);
  useEffect(() => {
    const root = document.querySelector(".wii");
    if (!root) return;
    const resize = () => {
      const { width, height } = root.getBoundingClientRect();
      setFrame({ width, height });
    };
    const observer = new ResizeObserver(resize);
    resize();
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  useEffect(acquireModalLayer, []);
  useEffect(() => {
    const old = document.activeElement;
    ref.current?.querySelector("button,input")?.focus();
    return () => {
      if (old?.isConnected) old.focus();
    };
  }, []);
  useEffect(() => {
    if (
      !ref.current?.contains(document.activeElement) &&
      !document.querySelector("wii-keyboard .is-open")
    )
      ref.current?.querySelector("button,input,select")?.focus();
  });
  return createPortal(
    <div
      style={{
        "--system-scale": modalScale(),
        "--system-frame-width": `${frame?.width || window.innerWidth}px`,
        "--system-frame-height": `${frame?.height || window.innerHeight}px`,
      }}
      className={`system-dialog-shade system-surface-${variant}`}
      onClick={onBack}
    >
      <section
        ref={ref}
        className="system-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onBack?.();
          }
          if (e.key === "Tab") {
            const nodes = [
              ...ref.current.querySelectorAll(
                'button:not(:disabled),input,textarea,select,[tabindex="0"]',
              ),
            ];
            const first = nodes[0],
              last = nodes.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <h2>{title}</h2>
        <div className="system-dialog-body">{children}</div>
        <div className="system-actions">
          <WiiButton onClick={onBack}>Back</WiiButton>
          {actions}
        </div>
      </section>
    </div>,
    document.body,
  );
}
