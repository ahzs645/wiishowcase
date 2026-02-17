import { useEffect, useRef } from 'react';
import WiiChannelRenderer from './WiiChannelRenderer';
import { loadJSZip } from '../lib/loadJSZip';
import useWiiAspectMode from '../hooks/useWiiAspectMode';

const BASE = import.meta.env.BASE_URL;

// Cache extracted audio blob URLs
const bundleAudioCache = new Map();

function getBundleAudio(url) {
  if (!bundleAudioCache.has(url)) {
    bundleAudioCache.set(
      url,
      (async () => {
        const JSZip = await loadJSZip();
        const res = await fetch(url);
        const zip = await JSZip.loadAsync(await res.arrayBuffer());
        const audioFile = zip.file('audio.wav');
        if (!audioFile) return null;
        const buf = await audioFile.async('arraybuffer');
        const blob = new Blob([buf], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
      })(),
    );
  }
  return bundleAudioCache.get(url);
}

export default function ChannelSelection({ visible, channel, onBack, onStart, hasPrev, hasNext, onPrev, onNext }) {
  const audioRef = useRef(null);
  const { channelPath, viewBox, aspectRatio, maskDataUri, is43 } = useWiiAspectMode();

  useEffect(() => {
    if (!audioRef.current) return;

    if (visible && channel) {
      if (channel.bundle) {
        // Load audio from bundle
        getBundleAudio(BASE + channel.bundle).then((audioUrl) => {
          if (!audioRef.current || !audioUrl) return;
          audioRef.current.src = audioUrl;
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        });
      } else if (channel.audio) {
        audioRef.current.src = `${BASE}${channel.audio}`;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else {
      audioRef.current.pause();
      audioRef.current.src = '';
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
      <audio ref={audioRef} loop />
      <div className="ch-sel-wrapper">
        <div
          className="ch-sel-frame"
          style={{
            aspectRatio: is43 ? '4 / 3' : '391 / 217',
            WebkitMask: `${maskDataUri} no-repeat center / 100% 100%`,
            mask: `${maskDataUri} no-repeat center / 100% 100%`,
          }}
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
                <span className="wii-track-btn-icon">
                  <span className="wii-icon wii-icon-minus" aria-hidden="true"></span>
                </span>
              </button>
            </div>
          )}

          {hasNext && (
            <div className="channel-page-arrow channel-page-arrow-next ch-sel-arrow" onClick={onNext}>
              <button className="wii-arrow-btn" type="button" aria-label="Next channel" />
              <button className="wii-track-btn-circle wii-track-btn-base wii-track-btn-no-shadow channel-page-circle" type="button" tabIndex={-1}>
                <span className="wii-track-btn-icon">
                  <span className="wii-icon wii-icon-plus" aria-hidden="true"></span>
                </span>
              </button>
            </div>
          )}
        </div>

        <svg
          className="wii-channel-ui-svg ch-sel-svg"
          viewBox={viewBox}
          preserveAspectRatio="none"
        >
          <path className="wii-channel-ui-dimmer" d={channelPath} />
          <path
            className="wii-channel-ui-border"
            d={channelPath}
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
