import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { acquireModalLayer } from "../../lib/modalLayer";
import "../../../Wii.css/js/wii-keyboard.js";
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
    return () => {
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
