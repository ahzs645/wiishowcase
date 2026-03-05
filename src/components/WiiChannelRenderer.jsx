import { useRef, useEffect, useState, memo } from 'react';
import { BannerRenderer } from '../lib/wadRenderer/BannerRenderer';
import { loadRendererBundle } from '../lib/bundleLoader';
import { resolveIconViewport } from '../utils/layout';

const BASE = import.meta.env.BASE_URL;

// Cache loaded bundles by URL so we don't re-fetch/re-parse
const bundleCache = new Map();

function fetchBundle(url) {
  if (!bundleCache.has(url)) {
    bundleCache.set(
      url,
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((buf) => loadRendererBundle(buf)),
    );
  }
  return bundleCache.get(url);
}

const WRAPPER_STYLE = { width: '100%', overflow: 'hidden', position: 'relative' };
const CANVAS_STYLE = { width: '100%', height: 'auto', display: 'block' };

export default memo(function WiiChannelRenderer({
  bundlePath,
  target = 'icon',
  playing = true,
  aspectRatio = 4 / 3,
  className,
  style,
}) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const wrapperRef = useRef(null);
  const [ready, setReady] = useState(false);
  const isVisibleRef = useRef(false);

  // IntersectionObserver to pause renderer when off-screen
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        const renderer = rendererRef.current;
        if (!renderer) return;
        if (entry.isIntersecting && playing) {
          renderer.play();
        } else {
          renderer.stop();
        }
      },
      { threshold: 0 },
    );

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [playing]);

  // Load bundle and create renderer
  useEffect(() => {
    if (!canvasRef.current || !bundlePath) return;
    let cancelled = false;

    const url = BASE + bundlePath;

    fetchBundle(url).then((bundle) => {
      if (cancelled) return;

      const data = bundle[target];
      if (!data) {
        console.warn(`[WiiChannelRenderer] No "${target}" data in bundle`, url);
        return;
      }

      const meta = bundle.manifest[target];
      const canvas = canvasRef.current;
      const { layout: rawLayout, startAnim, loopAnim, tplImages, fonts } = data;

      let layout = rawLayout;
      let refAspect = undefined;
      if (target === 'icon') {
        const viewport = resolveIconViewport(rawLayout);
        layout = { ...rawLayout, width: viewport.width, height: viewport.height };
        refAspect = viewport.width / viewport.height;
      }

      canvas.width = layout.width ?? meta.width;
      canvas.height = layout.height ?? meta.height;

      rendererRef.current = new BannerRenderer(
        canvas,
        layout,
        startAnim ?? loopAnim,
        tplImages,
        {
          startAnim,
          loopAnim,
          fonts,
          displayAspect: aspectRatio,
          referenceAspectRatio: refAspect,
          useGsap: false,
          ...bundle.manifest.rendererOptions,
          renderState: meta.animSelection.renderState,
          playbackMode: meta.animSelection.playbackMode,
        },
      );

      try {
        rendererRef.current.renderFrame(0);
      } catch (e) {
        console.error('[WiiChannelRenderer] renderFrame(0) failed:', e);
      }

      // Only auto-play if visible
      if (playing && isVisibleRef.current) {
        rendererRef.current.play();
      }
      setReady(true);
    }).catch((err) => {
      console.error(`[WiiChannelRenderer] Failed to load "${target}" from`, url, err);
    });

    return () => {
      cancelled = true;
      rendererRef.current?.dispose();
      rendererRef.current = null;
      setReady(false);
    };
  }, [bundlePath, target, aspectRatio]);

  // Handle play/pause toggling
  useEffect(() => {
    if (!rendererRef.current || !ready) return;
    if (playing && isVisibleRef.current) {
      rendererRef.current.play();
    } else {
      rendererRef.current.stop();
    }
  }, [playing, ready]);

  const wrapperStyle = style ? { ...WRAPPER_STYLE, ...style } : WRAPPER_STYLE;

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={wrapperStyle}
    >
      <canvas
        ref={canvasRef}
        style={CANVAS_STYLE}
      />
    </div>
  );
});
