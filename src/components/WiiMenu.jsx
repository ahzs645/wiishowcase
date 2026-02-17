import { useState, useCallback, useRef, useEffect } from 'react';
import { useDateTime, ClockTime, ClockDate } from './Clock';
import ChannelCard from './ChannelCard';
import DiscChannelContent from './channels/DiscChannelContent';
import MiiChannelContent from './channels/MiiChannelContent';
import PhotoChannelContent from './channels/PhotoChannelContent';
import ShopChannelContent from './channels/ShopChannelContent';
import NewsChannelContent from './channels/NewsChannelContent';
import OnliineChannelContent from './channels/OnliineChannelContent';
import PokemonRanchChannelContent from './channels/PokemonRanchChannelContent';
import settingsIcon from '../../Wii.css/dist/assets/settings-icon.png';
import mailIcon from '../../Wii.css/dist/assets/track-btn/icon-email.svg';

const CHANNELS_PER_PAGE = 12;
const MAIL_OPEN_ANIM_MS = 520;
const MAIL_CLOSE_DELAY_MS = 520;

const CHANNELS = [
  { id: 'disc', name: 'Disc Channel', content: <DiscChannelContent />, contentClassName: 'ch-disc', video: 'channelart/disc/video.gif', audio: 'channelart/disc/audio.mp3' },
  { id: 'mii', name: 'Mii Channel', content: <MiiChannelContent />, contentClassName: 'ch-mii', bundle: 'channels/mii.zip' },
  { id: 'photo', name: 'Photo Channel', content: <PhotoChannelContent />, contentClassName: 'ch-photo', bundle: 'channels/photo.zip' },
  { id: 'shop', name: 'Wii Shop', content: <ShopChannelContent />, contentClassName: 'ch-shop', bundle: 'channels/shop.zip' },
  { id: 'news', name: 'News Channel', action: 'news', content: <NewsChannelContent />, contentClassName: 'ch-news', video: 'channelart/news/video.gif', audio: 'channelart/news/audio.mp3' },
  { id: 'onliine', name: 'Onliine Channel', content: <OnliineChannelContent />, contentClassName: 'ch-onliine', video: 'channelart/onliine/video.gif', audio: 'channelart/onliine/audio.mp3' },
  { id: 'pokemon-ranch', name: 'My Pokémon Ranch', content: <PokemonRanchChannelContent />, contentClassName: 'ch-pokemon-ranch', video: 'channelart/pokemon-ranch/banner.png', audio: 'channelart/pokemon-ranch/audio.wav' },
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
  mailLayerVisible,
  onMailClose,
  zoomIn,
  zoomOut,
  zoomOrigin,
  onMailClick,
  onPairClick,
  onChannelClick,
  peerConnected,
  dateOverride,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isMailFlipped, setIsMailFlipped] = useState(false);
  const [isMailOpening, setIsMailOpening] = useState(false);
  const [isMailReturning, setIsMailReturning] = useState(false);
  const totalPages = PAGES.length;
  const viewportRef = useRef(null);
  const mailTimerRef = useRef(null);
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

  const openMailWithFlip = useCallback(() => {
    if (mailTimerRef.current || isMailOpening || mailLayerVisible) return;
    setIsMailReturning(false);
    setIsMailFlipped(true);
    setIsMailOpening(true);
    // Show messages immediately so they are visible while the holder flies up.
    onMailClick?.();
    mailTimerRef.current = window.setTimeout(() => {
      mailTimerRef.current = null;
      setIsMailOpening(false);
    }, MAIL_OPEN_ANIM_MS);
  }, [isMailOpening, mailLayerVisible, onMailClick]);

  const closeMailWithFlip = useCallback(() => {
    if (mailTimerRef.current || !mailLayerVisible) return;
    setIsMailFlipped(false);
    setIsMailOpening(false);
    setIsMailReturning(true);
    mailTimerRef.current = window.setTimeout(() => {
      mailTimerRef.current = null;
      setIsMailReturning(false);
      onMailClose?.();
    }, MAIL_CLOSE_DELAY_MS);
  }, [mailLayerVisible, onMailClose]);

  useEffect(() => {
    if (visible && !fadeOut && !mailLayerVisible) {
      setIsMailFlipped(false);
      setIsMailOpening(false);
      setIsMailReturning(false);
      if (mailTimerRef.current) {
        window.clearTimeout(mailTimerRef.current);
        mailTimerRef.current = null;
      }
    }
  }, [visible, fadeOut, mailLayerVisible]);

  useEffect(() => {
    return () => {
      if (mailTimerRef.current) {
        window.clearTimeout(mailTimerRef.current);
        mailTimerRef.current = null;
      }
    };
  }, []);

  const shouldMailLayerBeOpen = isMailOpening || (mailLayerVisible && !isMailReturning);
  const shouldTrackBeFlipped = isMailFlipped || (mailLayerVisible && !isMailReturning);
  const isMailAnimating = isMailOpening || isMailReturning;
  const displayedDate = dateOverride ?? date;

  return (
    <div
      className={`wii-menu wii-menu-wrapper${visible ? ' visible' : ''}${fadeOut ? ' fade-out' : ''}${zoomIn ? ' ch-zoom-in' : ''}${zoomOut ? ' ch-zoom-out' : ''}${shouldMailLayerBeOpen ? ' is-mail-opening' : ''}${mailLayerVisible ? ' is-mail-layer-visible' : ''}${isMailAnimating ? ' is-mail-animating' : ''}`}
      style={{
        backgroundColor: mailLayerVisible ? 'transparent' : '#c8c8c8',
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

      <ClockDate date={displayedDate} />

      {/* Bottom buttons */}
      <div className="wii-menu-bottom-buttons">
        <div className={`wii-track-btn wii-track-btn-flip wii-track-btn-flip-multi wii-track-btn-left${shouldTrackBeFlipped ? ' is-flipped' : ''}`} data-track-flip="" style={{"--wii-track-btn-front-count": 1, "--wii-track-btn-back-count": 2}}>
          <div className="wii-track-btn-track-pair">
            <div className="wii-track-btn-flip-side is-front">
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
            <div className="wii-track-btn-flip-side is-back">
              <button
                className="wii-track-btn-circle wii-track-btn-base"
                aria-label="Open Settings"
                type="button"
              >
                <span className="wii-track-btn-icon">
                  <img src={settingsIcon} alt="" />
                </span>
              </button>
              <button
                className="wii-track-btn-circle wii-track-btn-base"
                aria-label={peerConnected ? 'Pair another controller' : 'Pair controller'}
                onClick={onPairClick}
                type="button"
              >
                <span className="wii-track-btn-icon">
                  <span className="wii-icon wii-icon-plus" aria-hidden="true"></span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className={`wii-track-btn wii-track-btn-flip wii-track-btn-flip-multi${shouldTrackBeFlipped ? ' is-flipped' : ''}`} data-track-flip="" style={{"--wii-track-btn-front-count": 1, "--wii-track-btn-back-count": 1}}>
          <div className="wii-track-btn-track-pair">
            <div className="wii-track-btn-flip-side is-front">
              <button
                className="wii-track-btn-circle wii-track-btn-base"
                aria-label="Open Mail"
                onClick={openMailWithFlip}
                type="button"
              >
                <span className="wii-track-btn-icon">
                  <img src={mailIcon} alt="" />
                </span>
              </button>
            </div>
            <div className="wii-track-btn-flip-side is-back">
              <button
                className="wii-track-btn-circle wii-track-btn-base"
                aria-label="Close Mail"
                onClick={closeMailWithFlip}
                type="button"
              >
                <span className="wii-track-btn-icon">
                  <span className="wii-icon wii-icon-wii wii-track-btn-wii-logo" aria-hidden="true"></span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
