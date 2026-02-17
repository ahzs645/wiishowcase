import { useRef, useEffect, useState } from 'react';
import { BannerRenderer } from '../lib/wadRenderer/BannerRenderer';
import { loadRendererBundle } from '../lib/bundleLoader';

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

/**
 * Renders a Wii channel icon or banner animation on a <canvas>.
 *
 * @param {string} bundlePath - Path to the bundle zip (relative to BASE_URL)
 * @param {"icon"|"banner"} target - Which animation to render
 * @param {boolean} playing - Whether the animation should be playing
 * @param {number} [aspectRatio] - Display aspect ratio (default 4/3)
 * @param {string} [className] - CSS class for the canvas wrapper
 * @param {object} [style] - Inline styles for the canvas wrapper
 */
export default function WiiChannelRenderer({
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
      const { layout, startAnim, loopAnim, tplImages, fonts } = data;

      // Use layout dimensions (actual rendering size) rather than manifest
      // thumbnail dimensions, which may be smaller
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
          useGsap: false,
          ...bundle.manifest.rendererOptions,
          renderState: meta.animSelection.renderState,
          playbackMode: meta.animSelection.playbackMode,
        },
      );

      // Debug: draw a test frame to verify canvas works
      try {
        rendererRef.current.renderFrame(0);
        console.log('[WiiChannelRenderer] renderFrame(0) ok for', target, 'canvas:', canvas.width, 'x', canvas.height);
      } catch (e) {
        console.error('[WiiChannelRenderer] renderFrame(0) failed:', e);
      }

      if (playing) {
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
    if (playing) {
      rendererRef.current.play();
    } else {
      rendererRef.current.pause?.();
    }
  }, [playing, ready]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
      />
    </div>
  );
}
