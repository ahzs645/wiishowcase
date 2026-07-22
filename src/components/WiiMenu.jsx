import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useDateTime, ClockTime, ClockDate } from './Clock';
import ChannelCard from './ChannelCard';
import DiscChannelContent from './channels/DiscChannelContent';
import MiiChannelContent from './channels/MiiChannelContent';
import PhotoChannelContent from './channels/PhotoChannelContent';
import ShopChannelContent from './channels/ShopChannelContent';
import NewsChannelContent from './channels/NewsChannelContent';
import OnliineChannelContent from './channels/OnliineChannelContent';
import PokemonRanchChannelContent from './channels/PokemonRanchChannelContent';
import BlankChannelContent from './channels/BlankChannelContent';
import { MESSAGE_DATE_KEYS } from './WiiMessageBoard';
import { NEWS_RENDERER_SETTINGS } from './channels/newsChannelRendererSettings';
import settingsIcon from '../../Wii.css/dist/assets/settings-icon.png';
import mailIcon from '../../Wii.css/dist/assets/track-btn/icon-email.svg';

const CHANNELS_PER_PAGE = 12;
const MAIL_OPEN_ANIM_MS = 520;
const MAIL_CLOSE_DELAY_MS = 520;

const TRACK_BTN_LEFT_STYLE = { "--wii-track-btn-front-count": 1, "--wii-track-btn-back-count": 2 };
const TRACK_BTN_RIGHT_STYLE = { "--wii-track-btn-front-count": 1, "--wii-track-btn-back-count": 1 };

const BLANK = { blank: true, contentComponent: BlankChannelContent, contentClassName: 'ch-blank' };

const CHANNELS = [
  { id: 'disc', name: 'Disc Channel', contentComponent: DiscChannelContent, contentClassName: 'ch-disc', bundle: 'channels/disc.zip', rendererSettings: { banner: { playbackMode: 'hold' } } },
  { id: 'mii', name: 'Mii Channel', contentComponent: MiiChannelContent, contentClassName: 'ch-mii', bundle: 'channels/mii.zip' },
  { id: 'photo', name: 'Photo Channel', contentComponent: PhotoChannelContent, contentClassName: 'ch-photo', bundle: 'channels/photo.zip' },
  {
    id: 'shop',
    name: 'Wii Shop',
    contentComponent: ShopChannelContent,
    contentClassName: 'ch-shop',
    bundle: 'channels/shop.zip',
    rendererSettings: {
      banner: { rendererBackend: 'webgl', tevQuality: 'accurate' },
    },
  },
  { id: 'news', name: 'News Channel', action: 'news', contentComponent: NewsChannelContent, contentClassName: 'ch-news', bundle: 'channels/news.zip', rendererSettings: NEWS_RENDERER_SETTINGS, video: 'channelart/news/video.gif', audio: 'channelart/news/audio.mp3' },
  { id: 'onliine', name: 'Onliine Channel', contentComponent: OnliineChannelContent, contentClassName: 'ch-onliine', video: 'channelart/onliine/video.gif', audio: 'channelart/onliine/audio.mp3' },
  { id: 'pokemon-ranch', name: 'My Pokémon Ranch', contentComponent: PokemonRanchChannelContent, contentClassName: 'ch-pokemon-ranch', video: 'channelart/pokemon-ranch/banner.png', audio: 'channelart/pokemon-ranch/audio.wav' },
  { ...BLANK },
  { ...BLANK },
  { ...BLANK },
  { ...BLANK },
  { ...BLANK },
  // Page 2
  { ...BLANK },
  { ...BLANK },
  { ...BLANK },
  { ...BLANK },
  { ...BLANK },
  { ...BLANK },
  { ...BLANK },
  { ...BLANK },
  { ...BLANK },
  { ...BLANK },
  { ...BLANK },
  { ...BLANK },
];

function chunkChannels(channels) {
  const pages = [];
  for (let i = 0; i < channels.length; i += CHANNELS_PER_PAGE) {
    const page = channels.slice(i, i + CHANNELS_PER_PAGE);
    // Pad last page with blanks to fill 12 slots
    while (page.length < CHANNELS_PER_PAGE) {
      page.push({ ...BLANK });
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
  onSettingsClick,
  zoomIn,
  zoomOut,
  zoomOrigin,
  onMailClick,
  onPairClick,
  onChannelClick,
  onCalendarDateSelect,
  peerConnected,
  dateOverride,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isMailFlipped, setIsMailFlipped] = useState(false);
  const [isMailOpening, setIsMailOpening] = useState(false);
  const [isMailReturning, setIsMailReturning] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarSwapped, setCalendarSwapped] = useState(false);
  const totalPages = PAGES.length;
  const viewportRef = useRef(null);
  const mailTimerRef = useRef(null);
  const calendarRef = useRef(null);
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

  const toggleCalendar = useCallback(() => {
    const el = calendarRef.current;
    if (!el) return;
    // Lazy-init on first click (starts hidden via data-calendar-hidden)
    if (!el.__wiiCalendar) {
      if (window.WiiCalendar) window.WiiCalendar.init(el);
    }
    // Toggle the calendar drop animation
    el.__wiiCalendar.toggle();
    if (!calendarOpen) {
      setCalendarOpen(true);
      setCalendarSwapped(true);
    } else {
      setCalendarSwapped(false);
      // Wait for drop-out animation (350ms) then hide wrapper
      setTimeout(() => setCalendarOpen(false), 400);
    }
  }, [calendarOpen]);

  const closeCalendarMode = useCallback(() => {
    const el = calendarRef.current;
    if (!el?.__wiiCalendar) return;
    el.__wiiCalendar.toggle();
    setCalendarSwapped(false);
    setTimeout(() => setCalendarOpen(false), 400);
  }, []);

  const handleCalendarDateClick = useCallback((e) => {
    const td = e.target.closest('td.wii-calendar-td');
    if (!td || td.classList.contains('wii-calendar-td-other')) return;

    const day = parseInt(td.textContent, 10);
    if (isNaN(day)) return;

    const cal = calendarRef.current?.__wiiCalendar;
    if (!cal) return;

    const year = cal.getYear();
    const month = cal.getMonth();
    const selectedDate = new Date(year, month, day);

    closeCalendarMode();
    onCalendarDateSelect?.(selectedDate);
  }, [closeCalendarMode, onCalendarDateSelect]);

  const decorateCalendarDates = useCallback(() => {
    const el = calendarRef.current;
    const cal = el?.__wiiCalendar;
    if (!cal) return;

    const year = cal.getYear();
    const month = cal.getMonth();
    const mailIconUrl = `${import.meta.env.BASE_URL}assets/mail-icon-tinted.svg`;

    el.querySelectorAll('td.wii-calendar-td').forEach((td) => {
      const existing = td.querySelector('.calendar-mail-icon');
      if (existing) existing.remove();

      if (td.classList.contains('wii-calendar-td-other')) return;

      const day = parseInt(td.textContent, 10);
      if (isNaN(day)) return;

      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!MESSAGE_DATE_KEYS.has(dateKey)) return;

      const icon = document.createElement('img');
      icon.src = mailIconUrl;
      icon.className = 'calendar-mail-icon';
      icon.setAttribute('aria-hidden', 'true');
      td.appendChild(icon);
    });
  }, []);

  useEffect(() => {
    const el = calendarRef.current;
    if (!calendarOpen || !el) return;

    requestAnimationFrame(decorateCalendarDates);

    const handleChange = () => requestAnimationFrame(decorateCalendarDates);
    el.addEventListener('wii-calendar-change', handleChange);
    return () => el.removeEventListener('wii-calendar-change', handleChange);
  }, [calendarOpen, decorateCalendarDates]);

  // Stable click handler that reads channel from data attribute to avoid inline closures
  const handleChannelClick = useCallback((e) => {
    if (!onChannelClick) return;
    const index = e.currentTarget.dataset.channelIndex;
    if (index == null) return;
    const ch = CHANNELS[parseInt(index, 10)];
    if (!ch?.id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    onChannelClick(ch, origin);
  }, [onChannelClick]);

  const shouldMailLayerBeOpen = isMailOpening || (mailLayerVisible && !isMailReturning);
  const shouldTrackBeFlipped = isMailFlipped || (mailLayerVisible && !isMailReturning);
  const isMailAnimating = isMailOpening || isMailReturning;
  const displayedDate = dateOverride ?? date;
  // The menu is hidden by opacity in these states, which IntersectionObserver
  // can't see — pause channel playback explicitly so renderers don't keep
  // painting invisible frames behind the channel-select banner or during
  // fades. Content stays mounted so nothing is torn down and rebuilt.
  // zoomOut included so the 12 tile renderers don't all resume painting while
  // the zoom-out animation is still running — they hold their last frame and
  // resume when App clears the flag after the animation.
  const contentPlayable = visible && !zoomIn && !zoomOut && !fadeOut && !shouldMailLayerBeOpen;

  return (
    <div
      className={`wii-menu wii-menu-wrapper${visible ? ' visible' : ''}${fadeOut ? ' fade-out' : ''}${zoomIn ? ' ch-zoom-in' : ''}${zoomOut ? ' ch-zoom-out' : ''}${shouldMailLayerBeOpen ? ' is-mail-opening' : ''}${mailLayerVisible ? ' is-mail-layer-visible' : ''}${isMailAnimating ? ' is-mail-animating' : ''}`}
      style={{
        background: 'transparent',
        transformOrigin: zoomOrigin ? `${zoomOrigin.x}px ${zoomOrigin.y}px` : undefined,
      }}
    >
      <div className="channel-holder-wrapper">
        <wii-channel-holder>
          <ClockTime time={time} />
          <div className="channel-pages-viewport" ref={viewportRef}>
            {PAGES.map((pageChannels, pageIdx) => (
              <div key={pageIdx} className="wii-channel-holder-grid">
                {pageChannels.map((ch, i) => {
                  const globalIndex = pageIdx * CHANNELS_PER_PAGE + i;
                  const isActivePage = pageIdx === currentPage;
                  const shouldRenderContent = isActivePage || ch.blank;
                  return (
                    <ChannelCard
                      key={globalIndex}
                      name={ch.name}
                      gradient={ch.gradient}
                      blank={ch.blank}
                      onClick={ch.id ? handleChannelClick : undefined}
                      channelIndex={ch.id ? globalIndex : undefined}
                      contentActive={shouldRenderContent}
                      contentPlaying={isActivePage && contentPlayable}
                      contentComponent={ch.contentComponent}
                      contentClassName={ch.contentClassName}
                    />
                  );
                })}
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

      <ClockDate date={displayedDate} hidden={calendarOpen} />

      {/* Calendar (drop animation, hidden by default) */}
      <div className={`wii-menu-calendar-wrapper${calendarOpen ? ' is-calendar-open' : ''}`} onClick={handleCalendarDateClick}>
        <div
          ref={calendarRef}
          data-wii-calendar=""
          data-calendar-animation="drop"
          data-calendar-hidden=""
          className="wii-calendar"
        >
          <div className="channel-page-arrow channel-page-arrow-prev" data-calendar-prev="">
            <button className="wii-arrow-btn wii-arrow-btn-right" type="button" aria-label="Previous month"></button>
            <button className="wii-track-btn-circle wii-track-btn-base wii-track-btn-no-shadow channel-page-circle" type="button" tabIndex={-1}>
              <span className="wii-track-btn-icon">
                <span className="wii-icon wii-icon-minus" aria-hidden="true"></span>
              </span>
            </button>
          </div>
          <div className="wii-calendar-container">
            <div className="wii-calendar-inner">
              <div className="wii-calendar-body">
                <div className="wii-calendar-grid">
                  <table className="wii-calendar-table" data-calendar-table=""></table>
                </div>
                <div className="wii-calendar-footer">
                  <div className="wii-calendar-month" data-calendar-month=""></div>
                </div>
              </div>
            </div>
          </div>
          <div className="channel-page-arrow channel-page-arrow-next" data-calendar-next="">
            <button className="wii-arrow-btn" type="button" aria-label="Next month"></button>
            <button className="wii-track-btn-circle wii-track-btn-base wii-track-btn-no-shadow channel-page-circle" type="button" tabIndex={-1}>
              <span className="wii-track-btn-icon">
                <span className="wii-icon wii-icon-plus" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className={`wii-menu-bottom-buttons${calendarSwapped ? ' is-calendar-mode' : ''}`}>
        <div className={`wii-track-btn wii-track-btn-flip wii-track-btn-flip-multi wii-track-btn-left${shouldTrackBeFlipped ? ' is-flipped' : ''}`} data-track-flip="" style={TRACK_BTN_LEFT_STYLE}>
          <div className="wii-track-btn-track-pair">
            <div className="wii-track-btn-flip-side is-front">
              <button
                className="wii-track-btn-circle wii-track-btn-base"
                aria-label="Open Settings"
                onClick={onSettingsClick}
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
                aria-label="Calendar"
                onClick={toggleCalendar}
                type="button"
              >
                <span className="wii-track-btn-icon">
                  <span className="wii-icon wii-icon-calendar" aria-hidden="true"></span>
                </span>
              </button>
              <button
                className="wii-track-btn-circle wii-track-btn-base"
                aria-label="Notepad"
                type="button"
              >
                <span className="wii-track-btn-icon">
                  <span className="wii-icon wii-icon-notepad" aria-hidden="true"></span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className={`wii-track-btn wii-track-btn-flip wii-track-btn-flip-multi${shouldTrackBeFlipped ? ' is-flipped' : ''}`} data-track-flip="" style={TRACK_BTN_RIGHT_STYLE}>
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

        {/* Calendar back track — slides in from the left when calendar is open */}
        <div className="wii-track-btn calendar-back-track">
          <div className="calendar-back-track-capsule">
            <button className="wii-btn-start wii-btn-start-md" onClick={closeCalendarMode} type="button">
              <div className="wii-btn-start-highlight-sharp"></div>
              <span>Back</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
