import { useRef, useEffect } from 'react';
import { getSharedBlankRenderer, type SubscriberEntry } from '../../lib/sharedBlankRenderer';

const WRAPPER_STYLE: React.CSSProperties = { width: '100%', overflow: 'hidden', position: 'relative' };
const CANVAS_STYLE: React.CSSProperties = { width: '100%', height: 'auto', display: 'block' };

export default function BlankChannelContent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const shared = getSharedBlankRenderer();
    let entry: SubscriberEntry | undefined = undefined;
    let visible = false;

    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !visible) {
          visible = true;
          shared.readyPromise.then(() => {
            if (visible) entry = shared.subscribe(canvas);
          });
        } else if (!e.isIntersecting && visible) {
          visible = false;
          if (entry) {
            shared.unsubscribe(entry);
            entry = undefined;
          }
        }
      },
      { threshold: 0 },
    );

    observer.observe(wrapperRef.current!);

    return () => {
      observer.disconnect();
      visible = false;
      if (entry) shared.unsubscribe(entry);
    };
  }, []);

  return (
    <div ref={wrapperRef} style={WRAPPER_STYLE}>
      <canvas ref={canvasRef} style={CANVAS_STYLE} />
    </div>
  );
}
