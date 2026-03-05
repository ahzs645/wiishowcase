import { useEffect, useState, useRef } from 'react';
import { BannerRenderer } from '@firstform/wii-channel-renderer';
import { loadRendererBundle } from '@firstform/wii-channel-renderer/bundle-loader';
import { resolveIconViewport } from '../../utils/layout';

const BASE = import.meta.env.BASE_URL;

// Shared across all blank channel instances — render once, reuse everywhere
let sharedImagePromise = null;

function getBlankImage() {
  if (!sharedImagePromise) {
    sharedImagePromise = fetch(BASE + 'channels/blank.zip')
      .then((r) => r.arrayBuffer())
      .then((buf) => loadRendererBundle(buf))
      .then((bundle) => {
        const data = bundle.icon;
        if (!data) return null;

        const meta = bundle.manifest.icon;
        const { layout: rawLayout, startAnim, loopAnim, tplImages, fonts } = data;
        const viewport = resolveIconViewport(rawLayout);
        const layout = { ...rawLayout, width: viewport.width, height: viewport.height };
        const refAspect = viewport.width / viewport.height;

        const canvas = document.createElement('canvas');
        canvas.width = layout.width ?? meta.width;
        canvas.height = layout.height ?? meta.height;

        const renderer = new BannerRenderer(canvas, layout, startAnim ?? loopAnim, tplImages, {
          startAnim,
          loopAnim,
          fonts,
          displayAspect: 4 / 3,
          referenceAspectRatio: refAspect,
          useGsap: false,
          ...bundle.manifest.rendererOptions,
          renderState: meta.animSelection.renderState,
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
