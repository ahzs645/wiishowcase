import { useEffect, useRef } from 'react';
import WiiChannelRenderer from './WiiChannelRenderer';
import { loadJSZip } from '../lib/loadJSZip';
import useWiiAspectMode from '../hooks/useWiiAspectMode';
import type { ChannelDef } from '../store/appSlice';

const BASE = import.meta.env.BASE_URL;

interface BundleAudioResult {
  url: string;
  meta: { loopFlag?: boolean; loopStart?: number; sampleRate?: number } | null;
}

const bundleAudioCache = new Map<string, Promise<BundleAudioResult | null>>();

function getBundleAudio(url: string): Promise<BundleAudioResult | null> {
  if (!bundleAudioCache.has(url)) {
    bundleAudioCache.set(
      url,
      (async () => {
        const JSZip = await loadJSZip();
        const res = await fetch(url);
        const zip = await JSZip.loadAsync(await res.arrayBuffer());
        const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
        const audioFile = zip.file('audio.wav');
        if (!audioFile) return null;
        const buf = await audioFile.async('arraybuffer');
        const blob = new Blob([buf], { type: 'audio/wav' });
        return {
          url: URL.createObjectURL(blob),
          meta: manifest.audio ?? null,
        };
      })(),
    );
  }
  return bundleAudioCache.get(url)!;
}

interface ChannelSelectionProps {
  visible: boolean;
  channel: ChannelDef | null;
  onBack: () => void;
  onStart: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function ChannelSelection({ visible, channel, onBack, onStart, hasPrev, hasNext, onPrev, onNext }: ChannelSelectionProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioMetaRef = useRef<BundleAudioResult['meta']>(null);
  const { channelPath, viewBox, aspectRatio, maskDataUri, is43 } = useWiiAspectMode();
  const bundleSettings = channel?.rendererSettings;
  const bundleBannerSettings = bundleSettings && ('banner' in bundleSettings || 'icon' in bundleSettings)
    ? (bundleSettings as Record<string, unknown>).banner as Record<string, unknown> | undefined
    : bundleSettings;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      const meta = audioMetaRef.current;
      if (meta?.loopFlag) {
        const loopTimeSec = (meta.loopStart ?? 0) / (meta.sampleRate ?? 44100);
        audio.currentTime = loopTimeSec;
        audio.play().catch(() => {});
      }
    };

    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;

    if (visible && channel) {
      if (channel.bundle) {
        getBundleAudio(BASE + channel.bundle).then((result) => {
          if (!audioRef.current || !result) return;
          audioMetaRef.current = result.meta;
          audioRef.current.loop = !!(result.meta?.loopFlag && result.meta.loopStart === 0);
          audioRef.current.src = result.url;
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        });
      } else if (channel.audio) {
        audioMetaRef.current = null;
        audioRef.current.loop = true;
        audioRef.current.src = `${BASE}${channel.audio}`;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else {
      audioMetaRef.current = null;
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
  }, [visible, channel]);

  const renderBanner = () => {
    if (channel?.bundle) {
      return (
        <WiiChannelRenderer
          bundlePath={channel.bundle}
          target="banner"
          playing={visible}
          aspectRatio={aspectRatio}
          settings={bundleBannerSettings as Record<string, unknown>}
          className="ch-sel-video"
        />
      );
    }
    if (channel?.video) {
      return (
        <img
          src={visible ? `${BASE}${channel.video}` : ''}
          className="ch-sel-video"
          alt=""
        />
      );
    }
    return null;
  };

  return (
    <div className={`ch-selection${visible ? ' visible' : ''}`}>
      <audio ref={audioRef} />
      <div className="ch-sel-wrapper">
        <div
          className="ch-sel-frame"
          style={{
            aspectRatio: is43 ? '4 / 3' : '391 / 217',
            WebkitMask: `${maskDataUri} no-repeat center / 100% 100%`,
            mask: `${maskDataUri} no-repeat center / 100% 100%`,
          } as React.CSSProperties}
        >
          {renderBanner()}
          <div className="ch-sel-buttons">
            <div className="wii-bg-pinstripe wii-bg-pinstripe-light" />
            <button className="wii-btn-start wii-btn-start-md" type="button" onClick={onBack}>
              <div className="wii-btn-start-highlight-sharp" />
              <span>Wii Menu</span>
            </button>
            <button className="wii-btn-start wii-btn-start-md" type="button" onClick={onStart}>
              <div className="wii-btn-start-highlight-sharp" />
              <span>Start</span>
            </button>
          </div>
          {hasPrev && (
            <div className="channel-page-arrow channel-page-arrow-prev ch-sel-arrow" onClick={onPrev}>
              <button className="wii-arrow-btn wii-arrow-btn-right" type="button" aria-label="Previous channel" />
              <button className="wii-track-btn-circle wii-track-btn-base wii-track-btn-no-shadow channel-page-circle" type="button" tabIndex={-1}>
                <span className="wii-track-btn-icon"><span className="wii-icon wii-icon-minus" aria-hidden="true"></span></span>
              </button>
            </div>
          )}
          {hasNext && (
            <div className="channel-page-arrow channel-page-arrow-next ch-sel-arrow" onClick={onNext}>
              <button className="wii-arrow-btn" type="button" aria-label="Next channel" />
              <button className="wii-track-btn-circle wii-track-btn-base wii-track-btn-no-shadow channel-page-circle" type="button" tabIndex={-1}>
                <span className="wii-track-btn-icon"><span className="wii-icon wii-icon-plus" aria-hidden="true"></span></span>
              </button>
            </div>
          )}
        </div>
        <svg className="wii-channel-ui-svg ch-sel-svg" viewBox={viewBox} preserveAspectRatio="none">
          <path className="wii-channel-ui-dimmer" d={channelPath} />
          <path className="wii-channel-ui-border" d={channelPath} fill="none" />
        </svg>
      </div>
    </div>
  );
}
