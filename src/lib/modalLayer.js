let count = 0,
  previousInert = false;
export function acquireModalLayer() {
  const root = document.querySelector("#root");
  if (count++ === 0 && root) {
    previousInert = root.inert;
    root.inert = true;
    root.setAttribute("aria-hidden", "true");
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--count === 0 && root) {
      root.inert = previousInert;
      root.removeAttribute("aria-hidden");
    }
  };
}
export function modalScale() {
  return (
    getComputedStyle(
      document.querySelector(".wii") || document.documentElement,
    ).getPropertyValue("--system-scale") || "calc(100vh / 480)"
  );
}
