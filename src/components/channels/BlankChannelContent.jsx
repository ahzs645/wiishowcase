import { useRef, useEffect } from 'react';
import { getSharedBlankRenderer } from '../../lib/sharedBlankRenderer';

const WRAPPER_STYLE = { width: '100%', overflow: 'hidden', position: 'relative' };
const CANVAS_STYLE = { width: '100%', height: 'auto', display: 'block' };

export default function BlankChannelContent() {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const shared = getSharedBlankRenderer();
    let entry = null;
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
            entry = null;
          }
        }
      },
      { threshold: 0 },
    );

    observer.observe(wrapperRef.current);

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
