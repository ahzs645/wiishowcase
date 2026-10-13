import { useEffect, useRef, useState } from "react";
// Draw the holder's existing clipping curve on a static sibling. Animated icon
// canvases no longer require a filtered compositing layer just to draw its edge.
export default function MenuCurve() {
  const ref = useRef(null);
  const [shape, setShape] = useState(null);
  useEffect(() => {
    const holder =
      ref.current?.parentElement.querySelector("wii-channel-holder");
    if (!holder) return;
    const update = () => {
      const match = holder.style.clipPath.match(/V ([\d.]+) (.*?) Z/);
      if (match)
        setShape({
          width: holder.offsetWidth,
          height: holder.offsetHeight,
          path: `M ${holder.offsetWidth},${match[1]} ${match[2]}`,
        });
    };
    const observer = new MutationObserver(update);
    observer.observe(holder, { attributes: true, attributeFilter: ["style"] });
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
          stroke="#26bfee"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          fill="none"
        />
      )}
    </svg>
  );
}
