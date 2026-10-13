import { useEffect, useRef, useState } from "react";
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
      const scale = height / 398;
      const edge = height - 51 * scale;
      const flat = width * 0.157,
        curve = width * 0.186;
      const path = `M ${width},${edge} H ${width - flat} C ${width - flat - curve * 0.4},${edge} ${width - flat - curve * 0.6},${height} ${width - flat - curve},${height} H ${flat + curve} C ${flat + curve * 0.6},${height} ${flat + curve * 0.4},${edge} ${flat},${edge} H 0`;
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
          stroke="#42bfe7"
          strokeWidth={1.5 * shape.scale}
          vectorEffect="non-scaling-stroke"
          fill="none"
        />
      )}
    </svg>
  );
}
