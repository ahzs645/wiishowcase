import { useEffect, useRef, useState } from "react";
import { acquireModalLayer, modalScale } from "./modalLayer";
const openModals = [];

// Portal dialogs share the Wii frame, background isolation and keyboard rules.
export default function useSystemModal(active, onClose) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  const [frame, setFrame] = useState(null);
  useEffect(() => {
    if (!active) return;
    const root = document.querySelector(".wii");
    const update = () => setFrame(root?.getBoundingClientRect());
    const observer = new ResizeObserver(update);
    if (root) observer.observe(root);
    update();
    const previous = document.activeElement;
    const release = acquireModalLayer();
    openModals.push(ref);
    (
      ref.current?.querySelector(
        "button:not(:disabled),input,textarea,select",
      ) || ref.current
    )?.focus();
    return () => {
      observer.disconnect();
      const index = openModals.indexOf(ref);
      if (index >= 0) openModals.splice(index, 1);
      release();
      if (previous?.isConnected && !previous.closest("[inert]"))
        previous.focus();
    };
  }, [active]);
  useEffect(() => {
    if (
      !active ||
      !ref.current ||
      openModals.at(-1) !== ref ||
      document.querySelector("wii-keyboard .is-open")
    )
      return;
    if (
      document.activeElement === ref.current ||
      !ref.current.contains(document.activeElement)
    ) {
      (
        ref.current.querySelector(
          "button:not(:disabled),input,textarea,select",
        ) || ref.current
      ).focus();
    }
  });
  return {
    ref,
    style: {
      "--system-scale": modalScale(),
      "--system-frame-width": `${frame?.width || window.innerWidth}px`,
      "--system-frame-height": `${frame?.height || window.innerHeight}px`,
    },
    onKeyDown(event) {
      if (openModals.at(-1) !== ref) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current?.();
      }
      if (event.key !== "Tab") return;
      const elements = [
        ...ref.current.querySelectorAll(
          'button:not(:disabled),input:not(:disabled),textarea,select,[tabindex="0"]',
        ),
      ].filter(
        (node) =>
          node.getClientRects().length &&
          getComputedStyle(node).visibility !== "hidden",
      );
      if (!elements.length) {
        event.preventDefault();
        return;
      }
      const first = elements[0],
        last = elements.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
  };
}
