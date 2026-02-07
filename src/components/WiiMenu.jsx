import { useState, useCallback, useRef } from 'react';
import { useDateTime, ClockTime, ClockDate } from './Clock';
import ChannelCard from './ChannelCard';
import DiscChannelContent from './channels/DiscChannelContent';
import MiiChannelContent from './channels/MiiChannelContent';
import PhotoChannelContent from './channels/PhotoChannelContent';
import ShopChannelContent from './channels/ShopChannelContent';
import NewsChannelContent from './channels/NewsChannelContent';
import OnliineChannelContent from './channels/OnliineChannelContent';
import settingsIcon from '../../Wii.css/dist/assets/settings-icon.png';
import mailIcon from '../../Wii.css/dist/assets/track-btn/icon-email.svg';

const CHANNELS_PER_PAGE = 12;

const CHANNELS = [
  { id: 'disc', name: 'Disc Channel', content: <DiscChannelContent />, contentClassName: 'ch-disc', video: 'channelart/disc/video.gif', audio: 'channelart/disc/audio.mp3' },
  { id: 'mii', name: 'Mii Channel', content: <MiiChannelContent />, contentClassName: 'ch-mii', video: 'channelart/mii/video.gif', audio: 'channelart/mii/audio.mp3' },
  { id: 'photo', name: 'Photo Channel', content: <PhotoChannelContent />, contentClassName: 'ch-photo', video: 'channelart/photo/video.gif', audio: 'channelart/photo/audio.mp3' },
  { id: 'shop', name: 'Wii Shop', content: <ShopChannelContent />, contentClassName: 'ch-shop', video: 'channelart/shop/video.gif', audio: 'channelart/shop/audio.mp3' },
  { id: 'news', name: 'News Channel', action: 'news', content: <NewsChannelContent />, contentClassName: 'ch-news', video: 'channelart/news/video.gif', audio: 'channelart/news/audio.mp3' },
  { id: 'onliine', name: 'Onliine Channel', content: <OnliineChannelContent />, contentClassName: 'ch-onliine', video: 'channelart/onliine/video.gif', audio: 'channelart/onliine/audio.mp3' },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
  // Page 2
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
];

function chunkChannels(channels) {
  const pages = [];
  for (let i = 0; i < channels.length; i += CHANNELS_PER_PAGE) {
    const page = channels.slice(i, i + CHANNELS_PER_PAGE);
    // Pad last page with blanks to fill 12 slots
    while (page.length < CHANNELS_PER_PAGE) {
      page.push({ blank: true });
    }
    pages.push(page);
  }
  return pages;
}

const PAGES = chunkChannels(CHANNELS);

// Channels that have an id (i.e. are selectable, not blank)
export const SELECTABLE_CHANNELS = CHANNELS.filter((ch) => ch.id);

export default function WiiMenu({
  visible,
  fadeOut,
  zoomIn,
  zoomOut,
  zoomOrigin,
  onMailClick,
  onPairClick,
  onChannelClick,
  peerConnected,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = PAGES.length;
  const viewportRef = useRef(null);
  const { time, date } = useDateTime();

  const goNext = useCallback(() => {
    setCurrentPage((p) => {
      const next = Math.min(p + 1, totalPages - 1);
      viewportRef.current?.scrollBy({ left: viewportRef.current.clientWidth, behavior: 'smooth' });
      return next;
    });
  }, [totalPages]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => {
      const prev = Math.max(p - 1, 0);
      viewportRef.current?.scrollBy({ left: -viewportRef.current.clientWidth, behavior: 'smooth' });
      return prev;
    });
  }, []);

  return (
    <div
      className={`wii-menu wii-menu-wrapper${visible ? ' visible' : ''}${fadeOut ? ' fade-out' : ''}${zoomIn ? ' ch-zoom-in' : ''}${zoomOut ? ' ch-zoom-out' : ''}`}
      style={{
        backgroundColor: '#c8c8c8',
        transformOrigin: zoomOrigin ? `${zoomOrigin.x}px ${zoomOrigin.y}px` : undefined,
      }}
    >
      <div className="channel-holder-wrapper">
        <wii-channel-holder>
          <ClockTime time={time} />
          <div className="channel-pages-viewport" ref={viewportRef}>
            {PAGES.map((pageChannels, pageIdx) => (
              <div key={pageIdx} className="wii-channel-holder-grid">
                {pageChannels.map((ch, i) => (
                  <ChannelCard
                    key={pageIdx * CHANNELS_PER_PAGE + i}
                    name={ch.name}
                    gradient={ch.gradient}
                    blank={ch.blank}
                    onClick={ch.id && onChannelClick ? (e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const origin = {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                      };
                      onChannelClick(ch, origin);
                    } : undefined}
                    content={ch.content}
                    contentClassName={ch.contentClassName}
                  />
                ))}
              </div>
            ))}
          </div>
        </wii-channel-holder>

        {/* Page arrows — outside web component to avoid reparenting conflict */}
        {currentPage > 0 && (
          <div className="channel-page-arrow channel-page-arrow-prev" onClick={goPrev}>
            <button className="wii-arrow-btn wii-arrow-btn-right" type="button" aria-label="Previous page" />
            <button className="wii-track-btn-circle wii-track-btn-base wii-track-btn-no-shadow channel-page-circle" type="button" tabIndex={-1}>
              <span className="wii-track-btn-icon">
                <span className="wii-icon wii-icon-minus" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        )}
        {currentPage < totalPages - 1 && (
          <div className="channel-page-arrow channel-page-arrow-next" onClick={goNext}>
            <button className="wii-arrow-btn" type="button" aria-label="Next page" />
            <button className="wii-track-btn-circle wii-track-btn-base wii-track-btn-no-shadow channel-page-circle" type="button" tabIndex={-1}>
              <span className="wii-track-btn-icon">
                <span className="wii-icon wii-icon-plus" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        )}
      </div>

      <ClockDate date={date} />

      {/* Bottom buttons */}
      <div className="wii-menu-bottom-buttons">
        <div className="wii-track-btn wii-track-btn-left">
          <div className="wii-track-btn-track"></div>
          <button
            className="wii-track-btn-circle wii-track-btn-base"
            aria-label="Open Settings"
            type="button"
          >
            <span className="wii-track-btn-icon">
              <img src={settingsIcon} alt="" />
            </span>
          </button>
        </div>

        <div className="wii-track-btn">
          <div className="wii-track-btn-track"></div>
          <button
            className="wii-track-btn-circle wii-track-btn-base"
            aria-label="Open Mail"
            onClick={onMailClick}
            type="button"
          >
            <span className="wii-track-btn-icon">
              <img src={mailIcon} alt="" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
