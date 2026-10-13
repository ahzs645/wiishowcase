// Browser-side checks of the rendered UI, independent of CSS token values.
export function interfaceGeometry() {
  const keyboard = document.querySelector("wii-keyboard .is-open");
  const activeDialog = [...document.querySelectorAll('[aria-modal="true"]')]
    .filter((el) => {
      if (el.closest("[inert]") || !el.getClientRects().length) return false;
      for (let ancestor = el; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity) === 0
        )
          return false;
      }
      return true;
    })
    .at(-1);
  const failures = [],
    controls = [],
    text = [];
  const ignored = (el) =>
    (keyboard && !keyboard.contains(el)) ||
    (!keyboard && activeDialog && !activeDialog.contains(el)) ||
    el.closest(
      '[inert],[aria-hidden="true"],.system-visually-hidden,.system-surface-message-chooser h2',
    );
  const visible = (el) => {
    for (let ancestor = el; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (
        style.visibility === "hidden" ||
        style.display === "none" ||
        Number(style.opacity) === 0
      )
        return false;
    }
    const r = el.getBoundingClientRect(),
      s = getComputedStyle(el);
    return (
      !ignored(el) &&
      r.width > 2 &&
      r.height > 2 &&
      s.visibility !== "hidden" &&
      s.display !== "none" &&
      Number(s.opacity) !== 0
    );
  };
  for (const el of document.querySelectorAll("button:not(:disabled)")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const name = el.getAttribute("aria-label") || el.textContent.trim();
    const hit = document.elementFromPoint(
      r.x + r.width / 2,
      r.y + r.height / 2,
    );
    const inBounds =
      r.x >= -2 &&
      r.y >= -2 &&
      r.right <= innerWidth + 2 &&
      r.bottom <= innerHeight + 2;
    // The inactive sides of flip controls may retain a rectangle during transition.
    if (!hit || !el.contains(hit))
      failures.push({ type: "pointer", name, rect: r.toJSON() });
    if (!inBounds) failures.push({ type: "bounds", name, rect: r.toJSON() });
    controls.push({
      name,
      width: r.width,
      height: r.height,
      fontSize: getComputedStyle(el).fontSize,
    });
  }
  for (const el of document.querySelectorAll(
    "button,h1,h2,.menu-clock-time,.menu-clock-date,.message-board-memo-title",
  )) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    // Check text fragments rather than the union rectangle of a wrapping label.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (
        !node.textContent.trim() ||
        ignored(node.parentElement) ||
        node.parentElement.closest("svg")
      )
        continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const fragments = [...range.getClientRects()];
      for (const f of fragments) {
        if (f.width <= 0) continue;
        if (
          f.x < r.x - 2 ||
          f.right > r.right + 2 ||
          f.y < r.y - 2 ||
          f.bottom > r.bottom + 2
        )
          failures.push({
            type: "text-clipping",
            name: node.textContent.trim(),
            rect: f.toJSON(),
            container: r.toJSON(),
          });
      }
    }
    text.push({
      name: el.textContent.trim(),
      fontSize: getComputedStyle(el).fontSize,
    });
  }
  return { width: innerWidth, height: innerHeight, controls, text, failures };
}
