import { useEffect, useRef } from 'react';
import WiiChannelRenderer from './WiiChannelRenderer';
import { loadRendererBundle } from '../lib/bundleLoader';

const BASE = import.meta.env.BASE_URL;

// Cache loaded bundles so audio extraction doesn't re-fetch
const bundleAudioCache = new Map();

function getBundleAudio(url) {
  if (!bundleAudioCache.has(url)) {
    bundleAudioCache.set(
      url,
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((buf) => loadRendererBundle(buf))
        .then((bundle) => {
          if (bundle.audioWav) {
            const blob = new Blob([bundle.audioWav], { type: 'audio/wav' });
            return URL.createObjectURL(blob);
          }
          return null;
        }),
    );
  }
  return bundleAudioCache.get(url);
}

const CHANNEL_PATH =
  'M1002 3.5C1069.66 3.5 1125.47 3.49908 1164.54 5.64062L1168.27 5.85449L1168.28 5.85547C1173.85 6.21006 1179.13 8.51403 1183.18 12.3643C1187.22 16.209 1189.78 21.3508 1190.42 26.8926C1193.03 47.9647 1194.5 82.1481 1194.5 108.5C1194.5 134.842 1193.03 169.009 1190.42 190.083L1190.42 190.084C1189.79 195.635 1187.22 200.786 1183.18 204.636C1179.13 208.486 1173.85 210.79 1168.28 211.145L1168.27 211.146C1129.06 213.501 1071.84 213.5 1002 213.5C932.156 213.5 874.944 213.501 835.73 211.146L835.722 211.145C830.146 210.79 824.873 208.486 820.824 204.636C816.776 200.786 814.21 195.635 813.576 190.084V190.083C810.97 169.009 809.5 134.882 809.5 108.5C809.5 82.108 810.972 47.9647 813.579 26.8926C814.217 21.3508 816.782 16.209 820.824 12.3643C824.873 8.51402 830.146 6.21006 835.722 5.85547L835.73 5.85449L839.459 5.64062C878.532 3.49908 934.339 3.5 1002 3.5Z';

export default function ChannelSelection({ visible, channel, onBack, onStart, hasPrev, hasNext, onPrev, onNext }) {
  const audioRef = useRef(null);

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
          aspectRatio={16 / 9}
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
        <div className="ch-sel-frame">
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
          viewBox="806 0 391 217"
          preserveAspectRatio="none"
        >
          <path className="wii-channel-ui-dimmer" d={CHANNEL_PATH} />
          <path
            className="wii-channel-ui-border"
            d={CHANNEL_PATH}
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
