import { useCallback, useEffect, useRef } from 'react';

export default function WiiNewsChannel({ visible, onBack }) {
  const iframeRef = useRef(null);
  const detachRef = useRef(null);

  const attachMenuListener = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let doc;
    try {
      doc = iframe.contentDocument || iframe.contentWindow?.document;
    } catch {
      return;
    }
    if (!doc) return;

    if (detachRef.current) {
      detachRef.current();
      detachRef.current = null;
    }

    const onClick = (event) => {
      let el = event.target;
      while (el && el !== doc.body) {
        if (el.matches?.('button')) {
          const label = (el.textContent || '').trim().toLowerCase();
          if (label === 'wii menu') {
            event.preventDefault();
            event.stopPropagation();
            onBack();
            break;
          }
        }
        el = el.parentElement;
      }
    };

    doc.addEventListener('click', onClick, true);
    detachRef.current = () => doc.removeEventListener('click', onClick, true);
  }, [onBack]);

  useEffect(() => {
    attachMenuListener();
    return () => {
      if (detachRef.current) {
        detachRef.current();
        detachRef.current = null;
      }
    };
  }, [attachMenuListener]);

  return (
    <div className={`news-channel-screen${visible ? ' visible' : ''}`}>
      <div className="news-channel-frame">
        <iframe
          ref={iframeRef}
          src={`${import.meta.env.BASE_URL}news-channel/index.html`}
          title="Wii News Channel"
          loading="eager"
          onLoad={attachMenuListener}
        />
      </div>
    </div>
  );
}
