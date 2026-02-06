import { useState, useCallback, useRef } from 'react';
import { useDateTime, ClockTime, ClockDate } from './Clock';
import ChannelCard from './ChannelCard';
import settingsIcon from '../../Wii.css/dist/assets/settings-icon.png';
import mailIcon from '../../Wii.css/dist/assets/track-btn/icon-email.svg';

const CHANNELS_PER_PAGE = 12;

const NEWS_CHANNEL_CONTENT = (
  <div className="splash-content">
    <div className="news-channel-tv-icon">
      <p>News Channel</p>
      <img
        src="/news-channel/assets/images/world-map.png"
        alt="World Map Icon"
        className="map-image-icon"
      />
      <img
        src="/news-channel/assets/images/world-map.png"
        alt="World Map Icon"
        className="map-image-icon-overlay"
      />
    </div>
    <p className="click-to-start">Click to start</p>
  </div>
);

const CHANNELS = [
  { name: 'Disc Channel', gradient: 'linear-gradient(135deg, #4a90d9, #357abd)' },
  { name: 'Mii Channel', gradient: 'linear-gradient(135deg, #ff9500, #e08600)' },
  { name: 'Photo Channel', gradient: 'linear-gradient(135deg, #5856D6, #4240a8)' },
  { name: 'Wii Shop', gradient: 'linear-gradient(135deg, #7dc832, #5ea01e)' },
  { name: 'Forecast Channel', gradient: 'linear-gradient(135deg, #ff3b30, #cc2f26)' },
  {
    name: 'News Channel',
    action: 'news',
    content: NEWS_CHANNEL_CONTENT,
    contentClassName: 'news-channel-card',
  },
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

export default function WiiMenu({
  visible,
  fadeOut,
  onMailClick,
  onPairClick,
  onNewsClick,
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
      className={`wii-menu wii-menu-wrapper${visible ? ' visible' : ''}${fadeOut ? ' fade-out' : ''}`}
      style={{ backgroundColor: '#c8c8c8' }}
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
                    onClick={ch.action === 'news' ? onNewsClick : undefined}
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
