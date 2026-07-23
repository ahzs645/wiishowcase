import { useRef, useEffect, useState, memo } from 'react';
import { loadRendererBundle } from '@firstform/wii-channel-renderer/bundle-loader';
import { createRendererFromBundle } from '@firstform/wii-channel-renderer/bundle-renderer';
import useWiiAspectMode from '../hooks/useWiiAspectMode';

const BASE = import.meta.env.BASE_URL;

// Cache the raw zip download per URL and the decoded data per URL+target: the
// menu decodes only its icons at startup, and the (much larger) banner decode
// happens on first channel-select open, reusing the already-downloaded bytes.
const zipCache = new Map();
const bundleCache = new Map();

// Decode one bundle at a time. Zip downloads run in parallel, but
// loadRendererBundle does heavy main-thread work (PNG → ImageData for every
// texture and font sheet). With ~5 channel bundles kicking off together at
// startup, letting those decoders interleave keeps the main thread saturated
// for the whole load window and janks any menu interaction that happens during
// it. Serializing the decode step gets the first icons on screen sooner and
// leaves frame-sized gaps for input/animation between textures.
let decodeQueue = Promise.resolve();

function fetchZip(url) {
  if (!zipCache.has(url)) {
    zipCache.set(url, fetch(url).then((r) => r.arrayBuffer()));
  }
  return zipCache.get(url);
}

// Exported for ChannelSelection, which pulls the channel's audio out of the
// same decoded banner bundle instead of downloading/unzipping the zip again.
// Audio is only extracted alongside the banner — the menu's icon decode
// doesn't need it.
export function fetchBundle(url, target) {
  const key = `${url}#${target}`;
  if (!bundleCache.has(key)) {
    const buffered = fetchZip(url);
    bundleCache.set(
      key,
      new Promise((resolve, reject) => {
        decodeQueue = decodeQueue.then(
          () => buffered
            .then((buf) => loadRendererBundle(buf, { targets: [target], audio: target === 'banner' }))
            .then(resolve, reject),
        );
      }),
    );
  }
  return bundleCache.get(key);
}

const WRAPPER_STYLE = { width: '100%', overflow: 'hidden', position: 'relative' };

export default memo(function WiiChannelRenderer({
  bundlePath,
  target = 'icon',
  playing = true,
  aspectRatio,
  fps = 30,
  settings,
  className,
  style,
}) {
  const { aspectRatio: wiiAspect } = useWiiAspectMode();
  const resolvedAspect = aspectRatio ?? wiiAspect;
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

    fetchBundle(url, target).then((bundle) => {
      if (cancelled) return;

      const canvas = canvasRef.current;

      try {
        const mergedSettings = {
          displayAspect: resolvedAspect,
          fps,
          // Menu thumbnails ('icon') are small and there are ~12 animating at
          // once, so each one's full-canvas redraw + GPU upload is what dominates
          // compositing. Cap the redraw rate and the backing-store resolution:
          // at this size 24fps and <=1.5x DPR are visually indistinguishable from
          // 60fps/native DPR but cost a fraction to paint.
          // Banners animate at 30fps source data with subframe interpolation, so
          // repaints beyond 60/sec (high-refresh displays redraw at rAF rate) and
          // backing stores beyond 2x DPR are pure waste for a ~608px layout.
          maxRenderFps: target === 'icon' ? 24 : 60,
          maxDevicePixelRatio: target === 'icon' ? 1.5 : 2,
          subframePlayback: target === 'icon' ? false : undefined,
          ...settings,
        };
        const { renderer, layout: resolvedLayout } = createRendererFromBundle(canvas, bundle, target, mergedSettings);
        rendererRef.current = renderer;
      } catch (e) {
        console.error(`[WiiChannelRenderer] createRendererFromBundle failed:`, e);
        return;
      }

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

      // Warm the banner decode in the background once this icon is up, so the
      // channel-select screen (and its audio, which comes from the same
      // bundle) doesn't pay the full texture decode on first open. The shared
      // decode queue keeps this behind every pending icon decode, and the
      // cache makes it a no-op if channel select got there first.
      if (target === 'icon') {
        const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 2000));
        idle(() => { fetchBundle(url, 'banner').catch(() => {}); });
      }
    }).catch((err) => {
      console.error(`[WiiChannelRenderer] Failed to load "${target}" from`, url, err);
    });

    return () => {
      cancelled = true;
      rendererRef.current?.dispose();
      rendererRef.current = null;
      setReady(false);
    };
  }, [bundlePath, target, resolvedAspect, fps, settings]);

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
        data-no-style-resize
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    </div>
  );
});
