import { useRef, useEffect, useState, memo } from 'react';
import { loadRendererBundle } from '@firstform/wii-channel-renderer/bundle-loader';
import { createRendererFromBundle, type ChannelRenderer } from '@firstform/wii-channel-renderer/bundle-renderer';
import useWiiAspectMode from '../hooks/useWiiAspectMode';

const BASE = import.meta.env.BASE_URL;

const bundleCache = new Map<string, Promise<unknown>>();

function fetchBundle(url: string): Promise<unknown> {
  if (!bundleCache.has(url)) {
    bundleCache.set(
      url,
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((buf) => loadRendererBundle(buf)),
    );
  }
  return bundleCache.get(url)!;
}

const WRAPPER_STYLE: React.CSSProperties = { width: '100%', overflow: 'hidden', position: 'relative' };

interface WiiChannelRendererProps {
  bundlePath: string;
  target?: string;
  playing?: boolean;
  aspectRatio?: number;
  fps?: number;
  settings?: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
}

export default memo(function WiiChannelRenderer({
  bundlePath,
  target = 'icon',
  playing = true,
  aspectRatio,
  fps = 30,
  settings,
  className,
  style,
}: WiiChannelRendererProps) {
  const { aspectRatio: wiiAspect } = useWiiAspectMode();
  const resolvedAspect = aspectRatio ?? wiiAspect;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ChannelRenderer | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const isVisibleRef = useRef(false);

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

  useEffect(() => {
    if (!canvasRef.current || !bundlePath) return;
    let cancelled = false;

    const url = BASE + bundlePath;

    fetchBundle(url).then((bundle) => {
      if (cancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const mergedSettings: Record<string, unknown> = {
          displayAspect: resolvedAspect,
          fps,
          maxRenderFps: target === 'icon' ? 60 : undefined,
          subframePlayback: target === 'icon' ? false : undefined,
          ...settings,
        };
        const { renderer } = createRendererFromBundle(canvas, bundle, target, mergedSettings);
        rendererRef.current = renderer;
      } catch (e) {
        console.error(`[WiiChannelRenderer] createRendererFromBundle failed:`, e);
        return;
      }

      try {
        rendererRef.current!.renderFrame(0);
      } catch (e) {
        console.error('[WiiChannelRenderer] renderFrame(0) failed:', e);
      }

      if (playing && isVisibleRef.current) {
        rendererRef.current!.play();
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
  }, [bundlePath, target, resolvedAspect, fps, settings]);

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
    <div ref={wrapperRef} className={className} style={wrapperStyle}>
      <canvas
        ref={canvasRef}
        data-no-style-resize=""
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    </div>
  );
});
