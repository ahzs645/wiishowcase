import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { acquireModalLayer } from "../../lib/modalLayer";
import "../../../Wii.css/js/wii-keyboard.js";
import { modalScale } from "../../lib/modalLayer";

function addSystemControls(keyboard, request) {
  const panel = keyboard.querySelector(".wii-keyboard-panel");
  const input = keyboard.querySelector(".wii-keyboard-input");
  if (!panel || !input) return () => {};
  const root = document.querySelector(".wii");
  const updateFrame = () => {
    const frame = root?.getBoundingClientRect();
    keyboard.style.setProperty("--system-scale", modalScale());
    keyboard.style.setProperty(
      "--system-frame-width",
      `${frame?.width || innerWidth}px`,
    );
    keyboard.style.setProperty(
      "--system-frame-height",
      `${frame?.height || innerHeight}px`,
    );
  };
  const frameObserver = new ResizeObserver(updateFrame);
  if (root) frameObserver.observe(root);
  updateFrame();
  if (request.password && input.tagName === "INPUT") input.type = "password";
  const make = (label, text, className, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `wii-keyboard-key system-keyboard-utility ${className}`;
    button.setAttribute("aria-label", label);
    button.textContent = text;
    button.onclick = () => {
      onClick();
      keyboard._playSound?.("kbd_key");
    };
    panel.append(button);
    return button;
  };
  make("Scroll text up", "▲", "system-input-up", () =>
    input.scrollBy({ top: -input.clientHeight / 2 }),
  );
  make("Scroll text down", "▼", "system-input-down", () =>
    input.scrollBy({ top: input.clientHeight / 2 }),
  );
  make("Previous suggestions", "◀", "system-prediction-prev", () =>
    keyboard
      .querySelector(".wii-keyboard-predictions")
      .scrollBy({ left: -150 }),
  );
  make("Next suggestions", "▶", "system-prediction-next", () =>
    keyboard.querySelector(".wii-keyboard-predictions").scrollBy({ left: 150 }),
  );
  const rail = document.createElement("div");
  rail.className = "system-phone-cases";
  let mode = "lower";
  for (const [key, label] of [
    ["sentence", "Abc"],
    ["lower", "abc"],
    ["upper", "ABC"],
    ["number", "123"],
  ]) {
    const button = make(
      `Phone ${label} mode`,
      label,
      "system-phone-case",
      () => {
        mode = key;
        keyboard._toggleCaps?.(key === "upper" || key === "sentence");
        apply();
      },
    );
    button.dataset.case = key;
    rail.append(button);
  }
  panel.append(rail);
  const apply = () => {
    const phone = keyboard
      .querySelector(".wii-keyboard")
      .classList.contains("is-phone-layout");
    if (rail.hidden === phone) rail.hidden = !phone;
    for (const button of rail.querySelectorAll("button")) {
      if (button.hidden === phone) button.hidden = !phone;
      const pressed = String(mode === button.dataset.case);
      if (button.getAttribute("aria-pressed") !== pressed)
        button.setAttribute("aria-pressed", pressed);
    }
    for (const selector of [
      ".wii-keyboard-key--caps",
      ".wii-keyboard-key--shift",
    ]) {
      const button = keyboard.querySelector(selector);
      if (button.hidden !== phone) button.hidden = phone;
    }
    const extraRow =
      mode === "number" ||
      keyboard
        .querySelector('[data-action="more"]')
        ?.getAttribute("aria-pressed") === "true";
    keyboard
      .querySelector(".wii-keyboard")
      .classList.toggle("is-phone-extra-row", phone && extraRow);
    if (phone)
      [...keyboard.querySelectorAll(".is-phone-key")].forEach((button, i) => {
        const hidden = i >= (extraRow ? 12 : 9);
        if (button.hidden !== hidden) button.hidden = hidden;
        if (i >= 12) return;
        let chars = button.dataset.char;
        if (mode === "number")
          chars = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "@", "."][
            i
          ];
        else if (/^[1-9]/.test(chars) && chars.length > 1)
          chars = chars.slice(1);
        if (button.dataset.char !== chars) button.dataset.char = chars;
        const label = mode === "upper" ? chars.toUpperCase() : chars;
        const span = button.querySelector(".wii-keyboard-label");
        if (span.textContent !== label) span.textContent = label;
      });
  };
  const observer = new MutationObserver(apply);
  observer.observe(panel, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-char"],
    childList: true,
  });
  const sentence = (event) => {
    if (mode === "sentence" && event.target.closest("button[data-char]"))
      keyboard._toggleCaps?.(false);
  };
  // The phone case rail and inactive key groups are hidden by this adapter.
  // Trap against the visible controls rather than the element's static key list.
  const trapFocus = (event) => {
    if (event.key !== "Tab") return;
    const controls = [
      ...panel.querySelectorAll("input,textarea,button:not(:disabled)"),
    ].filter(
      (element) =>
        element.getClientRects().length &&
        getComputedStyle(element).visibility !== "hidden",
    );
    const first = controls[0],
      last = controls.at(-1);
    if (!first) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      event.stopPropagation();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      event.stopPropagation();
      first.focus();
    }
  };
  panel.addEventListener("click", sentence);
  panel.addEventListener("keydown", trapFocus, true);
  apply();
  return () => {
    observer.disconnect();
    frameObserver.disconnect();
    panel.removeEventListener("click", sentence);
    panel.removeEventListener("keydown", trapFocus, true);
  };
}
const files = import.meta.glob("../../../Wii.css/assets/audio/kbd_*.wav", {
  eager: true,
  query: "?url",
  import: "default",
});
const soundUrls = Object.fromEntries(
  Object.entries(files).map(([name, url]) => [
    name.split("/").pop().replace(".wav", ""),
    url,
  ]),
);
export default function SystemKeyboard({ request, onClose }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!request) return;
    const returnFocus = document.activeElement;
    const release = acquireModalLayer();
    const keyboard = ref.current;
    keyboard.soundUrls = soundUrls;
    keyboard.open({
      ...request,
      profile: "system",
      onConfirm: (value) => {
        request.onConfirm(value);
        closeRef.current();
      },
      onCancel: () => closeRef.current(),
    });
    const releaseControls = addSystemControls(keyboard, request);
    return () => {
      releaseControls();
      release();
      keyboard.close();
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [request]);
  return createPortal(
    <wii-keyboard
      ref={ref}
      sounds={`${import.meta.env.BASE_URL}assets/audio/`}
    />,
    document.body,
  );
}
