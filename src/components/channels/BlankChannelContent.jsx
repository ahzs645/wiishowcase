import { useEffect, useState, useRef } from 'react';
import { loadRendererBundle } from '@firstform/wii-channel-renderer/bundle-loader';
import { createRendererFromBundle } from '@firstform/wii-channel-renderer/bundle-renderer';

const BASE = import.meta.env.BASE_URL;

// Shared across all blank channel instances — render once, reuse everywhere
let sharedImagePromise = null;

function getBlankImage() {
  if (!sharedImagePromise) {
    sharedImagePromise = fetch(BASE + 'channels/blank.zip')
      .then((r) => r.arrayBuffer())
      .then((buf) => loadRendererBundle(buf))
      .then((bundle) => {
        const canvas = document.createElement('canvas');

        const { renderer } = createRendererFromBundle(canvas, bundle, 'icon', {
          playbackMode: 'hold',
        });

        renderer.renderFrame(0);
        const dataUrl = canvas.toDataURL();
        renderer.dispose();
        return { src: dataUrl, width: canvas.width, height: canvas.height };
      });
  }
  return sharedImagePromise;
}

const IMG_STYLE = { width: '100%', height: 'auto', display: 'block' };

export default function BlankChannelContent() {
  const [img, setImg] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    getBlankImage().then((result) => {
      if (mounted.current && result) setImg(result);
    });
    return () => { mounted.current = false; };
  }, []);

  if (!img) return <div style={{ width: '100%', aspectRatio: '4/3' }} />;

  return <img src={img.src} width={img.width} height={img.height} style={IMG_STYLE} alt="" />;
}
