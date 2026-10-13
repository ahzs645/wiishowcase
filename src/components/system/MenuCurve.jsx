import { useEffect, useRef, useState } from "react";
import { MENU_LAYOUT } from "../../layout/menu";
// The native menu curve is about 51 lines deep in both display modes. The
// framework's width-scaled curve made it too shallow at 4:3. Draw this measured
// menu shape on a static sibling; animated icon canvases need no filter.
export default function MenuCurve() {
  const ref = useRef(null);
  const [shape, setShape] = useState(null);
  useEffect(() => {
    const holder =
      ref.current?.parentElement.querySelector("wii-channel-holder");
    if (!holder) return;
    const update = () => {
      const width = holder.offsetWidth,
        height = holder.offsetHeight;
      const config = MENU_LAYOUT.curve;
      const scale = height / config.scaleHeight;
      const edge = height - config.depth * scale;
      const flat = width * config.flatWidthFraction,
        curve = width * config.bendWidthFraction;
      const path = `M ${width},${edge} H ${width - flat} C ${width - flat - curve * config.controlNear},${edge} ${width - flat - curve * config.controlFar},${height} ${width - flat - curve},${height} H ${flat + curve} C ${flat + curve * config.controlFar},${height} ${flat + curve * config.controlNear},${edge} ${flat},${edge} H 0`;
      holder.style.clipPath = `path('M 0,0 H ${width} V ${edge} ${path.replace(/^M [^ ]+ /, "")} Z')`;
      setShape({ width, height, path, scale });
    };
    const observer = new ResizeObserver(update);
    observer.observe(holder);
    update();
    return () => observer.disconnect();
  }, []);
  return (
    <svg
      ref={ref}
      className="menu-holder-curve"
      aria-hidden="true"
      viewBox={shape ? `0 0 ${shape.width} ${shape.height}` : undefined}
      preserveAspectRatio="none"
    >
      {shape && (
        <path
          d={shape.path}
          stroke={MENU_LAYOUT.curve.strokeColor}
          strokeWidth={MENU_LAYOUT.curve.strokeWidth * shape.scale}
          vectorEffect="non-scaling-stroke"
          fill="none"
        />
      )}
    </svg>
  );
}
