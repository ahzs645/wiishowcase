import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMenuDate } from './Clock';
import useMiiHead from '../hooks/useMiiHead';

const MESSAGE_PAGE_SLIDE_MS = 480;

const MESSAGE_TYPES = {
  memo: {
    label: 'Memo',
    cardClassName: 'is-type-memo',
    fullAvatar: false,
  },
  invite: {
    label: 'Invitation',
    cardClassName: 'is-type-invite',
    fullAvatar: false,
  },
  photo: {
    label: 'Photo',
    cardClassName: 'is-type-photo',
    fullAvatar: false,
  },
  avatar: {
    label: 'Avatar',
    cardClassName: 'is-type-avatar',
    fullAvatar: true,
  },
  system: {
    label: 'System',
    cardClassName: 'is-type-system',
    fullAvatar: false,
  },
};

function getStartOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const BOARD_ANCHOR_DATE = getStartOfDay(new Date());

const BOARD_MESSAGE_SEEDS = [
  {
    id: 'sample-onliine-message',
    dayOffset: 0,
    type: 'avatar',
    sender: 'Peter Miiffin',
    preview: 'Hello Lois',
    miiDataUrl: `${import.meta.env.BASE_URL}assets/message-board/Peter.miic`,
    avatarAlt: 'Peter Miiffin lol',
    angle: -8,
    x: 14,
    y: 22,
    lines: [
      { kind: 'text', text: 'This is a nice sample letter,' },
      { kind: 'text', text: 'with multiple lines.' },
    ],
  },
  {
    id: 'invite-mariokart',
    dayOffset: -1,
    type: 'invite',
    sender: 'Loopy',
    preview: 'Mario Kart tonight?',
    avatarFallback: 'L',
    angle: 7,
    x: 54,
    y: 14,
    lines: [
      { kind: 'text', text: 'Want to play Mario Kart later?' },
      { kind: 'text', text: 'I finally unlocked Rainbow Road!' },
    ],
  },
  {
    id: 'photo-sunset',
    dayOffset: -2,
    type: 'photo',
    sender: 'Digital Camera',
    preview: 'New photo attached',
    avatarFallback: '\ud83d\udcf7',
    angle: -2,
    x: 33,
    y: 43,
    lines: [
      { kind: 'text', text: 'Check out this sunset from our trip.' },
      { kind: 'text', text: 'It came out better than expected.' },
    ],
  },
  {
    id: 'system-update',
    dayOffset: 1,
    type: 'system',
    sender: 'Wii System',
    preview: 'System update info',
    avatarFallback: 'W',
    angle: 6,
    x: 70,
    y: 39,
    lines: [
      { kind: 'text', text: 'A new Onliine update is available.' },
      { kind: 'link', text: 'View release notes', href: 'https://github.com/ktg5/onliine-electron/releases/latest' },
    ],
  },
  {
    id: 'family-note',
    dayOffset: 3,
    type: 'memo',
    sender: 'Mom',
    preview: 'Call grandma',
    avatarFallback: 'M',
    angle: -5,
    x: 10,
    y: 63,
    lines: [
      { kind: 'text', text: "Don't forget to call grandma this weekend." },
      { kind: 'text', text: 'She misses you.' },
    ],
  },
  {
    id: 'sports-result',
    dayOffset: 0,
    type: 'invite',
    sender: 'Wii Sports Club',
    preview: 'High score challenge',
    avatarFallback: 'S',
    angle: 5,
    x: 58,
    y: 63,
    lines: [
      { kind: 'text', text: 'Your friend beat your tennis score.' },
      { kind: 'text', text: 'Play now and take the lead back!' },
    ],
  },
];

const BOARD_MESSAGES = BOARD_MESSAGE_SEEDS.map((message) => ({
  ...message,
  dateKey: toDateKey(addDays(BOARD_ANCHOR_DATE, message.dayOffset ?? 0)),
}));

const MESSAGES_BY_DATE = BOARD_MESSAGES.reduce((acc, message) => {
  const { dateKey } = message;
  if (!acc[dateKey]) {
    acc[dateKey] = [];
  }
  acc[dateKey].push(message);
  return acc;
}, {});

export const MESSAGE_DATE_KEYS = new Set(Object.keys(MESSAGES_BY_DATE));

function getMessagesForDayOffset(dayOffset) {
  const dateKey = toDateKey(addDays(BOARD_ANCHOR_DATE, dayOffset));
  return MESSAGES_BY_DATE[dateKey] ?? [];
}

function MiiAvatar({ miiDataUrl, className, title, alt, fallback }) {
  const miiSrc = useMiiHead(miiDataUrl);

  return (
    <div className={className} title={title}>
      {miiSrc ? (
        <img src={miiSrc} alt={alt || ''} />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}

function AvatarDisplay({ message, className }) {
  const type = MESSAGE_TYPES[message.type] ?? MESSAGE_TYPES.memo;
  const avatarClassName = `${className}${type.fullAvatar ? ' is-full-avatar' : ''}`;
  const title = message.avatarAlt || message.sender;
  const fallback = message.avatarFallback || message.sender[0];
  if (message.miiDataUrl) {
    return <MiiAvatar miiDataUrl={message.miiDataUrl} preset="head" className={avatarClassName} title={title} alt={message.avatarAlt} fallback={fallback} />;
  }

  return (
    <div className={avatarClassName} title={title}>
      {message.avatarSrc ? (
        <img src={message.avatarSrc} alt={message.avatarAlt || ''} />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}

const PIN_UNREAD_SRC = `${import.meta.env.BASE_URL}Wii.css/assets/icons/letter-pin-unread.svg`;
const PIN_READ_SRC = `${import.meta.env.BASE_URL}Wii.css/assets/icons/letter-pin.svg`;

function MessageCard({ message, onOpen, isRead }) {
  const type = MESSAGE_TYPES[message.type] ?? MESSAGE_TYPES.memo;

  return (
    <button
      type="button"
      className={`message-board-card ${type.cardClassName}`}
      style={{
        left: `${message.x}%`,
        top: `${message.y}%`,
      }}
      onClick={() => onOpen(message.id)}
      aria-label={`Open ${type.label} from ${message.sender}`}
    >
      <img
        className="message-board-card-pin"
        src={isRead ? PIN_READ_SRC : PIN_UNREAD_SRC}
        alt={isRead ? 'Read' : 'Unread'}
        aria-hidden="true"
      />
      <div className="message-board-card-header">
        <AvatarDisplay message={message} className="message-board-card-avatar" />
      </div>
      <div className="message-board-card-preview">{message.preview}</div>
      <div className="message-board-card-type-label">{type.label}</div>
    </button>
  );
}

function MessageMemo({ message, onClose }) {
  const type = MESSAGE_TYPES[message.type] ?? MESSAGE_TYPES.memo;
  const dialogTitleId = `message-board-memo-title-${message.id}`;
  const memoTitle = message.sender || 'Memo';

  return (
    <div className="message-board-opened" onClick={onClose} role="presentation">
      <div className="message-board-opened-bg" aria-hidden="true" />
      <div
        className={`message-board-memo ${type.cardClassName}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        onClick={(event) => event.stopPropagation()}
      >
        <span className="message-board-memo-title" id={dialogTitleId}>{memoTitle}</span>

        <div className="message-board-memo-header">
          <AvatarDisplay message={message} className="message-board-memo-avatar" />
        </div>

        <div className="message-board-memo-lines">
          {message.lines.map((line, index) => (
            line.kind === 'link' ? (
              <a key={`${message.id}-line-${index}`} href={line.href} target="_blank" rel="noreferrer">
                {line.text}
              </a>
            ) : (
              <span key={`${message.id}-line-${index}`}>{line.text}</span>
            )
          ))}
        </div>

        <div className="message-board-memo-footer" aria-hidden="true">
          <span className="wii-icon wii-icon-wii message-board-memo-wii-logo"></span>
        </div>
      </div>
    </div>
  );
}

export default function WiiMessageBoard({ visible, onDisplayedDateChange, targetDate }) {
  const [currentDayOffset, setCurrentDayOffset] = useState(0);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [readMessageIds, setReadMessageIds] = useState(new Set());
  const [dateTransition, setDateTransition] = useState(null);
  const transitionTimerRef = useRef(null);
  const lastTargetDateRef = useRef(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setSelectedMessageId(null);
      setDateTransition(null);
      lastTargetDateRef.current = null;
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    }
  }, [visible]);

  // Navigate to a calendar-selected target date
  useEffect(() => {
    if (!targetDate || !visible) return;
    const targetTime = targetDate.getTime();
    if (lastTargetDateRef.current === targetTime) return;
    lastTargetDateRef.current = targetTime;

    const target = getStartOfDay(targetDate);
    const diffMs = target.getTime() - BOARD_ANCHOR_DATE.getTime();
    const targetOffset = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (targetOffset === currentDayOffset) return;

    // Cancel any in-progress transition
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    const direction = targetOffset > currentDayOffset ? 'next' : 'prev';
    setSelectedMessageId(null);
    setDateTransition({
      fromOffset: currentDayOffset,
      toOffset: targetOffset,
      direction,
    });

    transitionTimerRef.current = setTimeout(() => {
      setCurrentDayOffset(targetOffset);
      setDateTransition(null);
      transitionTimerRef.current = null;
    }, MESSAGE_PAGE_SLIDE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate, visible]);

  const isDateTransitioning = Boolean(dateTransition);
  const displayedDayOffset = dateTransition ? dateTransition.toOffset : currentDayOffset;
  const displayedDate = useMemo(
    () => addDays(BOARD_ANCHOR_DATE, displayedDayOffset),
    [displayedDayOffset],
  );
  const displayedDateText = useMemo(
    () => formatMenuDate(displayedDate),
    [displayedDate],
  );
  const currentMessages = useMemo(
    () => getMessagesForDayOffset(currentDayOffset),
    [currentDayOffset],
  );
  const outgoingMessages = dateTransition ? getMessagesForDayOffset(dateTransition.fromOffset) : [];
  const incomingMessages = dateTransition ? getMessagesForDayOffset(dateTransition.toOffset) : [];
  const selectedMessage = useMemo(
    () => BOARD_MESSAGES.find((message) => message.id === selectedMessageId) ?? null,
    [selectedMessageId],
  );

  useEffect(() => {
    if (!selectedMessageId) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSelectedMessageId(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [selectedMessageId]);

  useEffect(() => {
    if (!onDisplayedDateChange) return;
    if (!visible) {
      onDisplayedDateChange(null);
      return;
    }
    onDisplayedDateChange(displayedDateText);
  }, [displayedDateText, onDisplayedDateChange, visible]);

  const canGoPrev = !isDateTransitioning;
  const canGoNext = !isDateTransitioning;

  const openMessage = (messageId) => {
    if (isDateTransitioning) return;
    setSelectedMessageId(messageId);
    setReadMessageIds((prev) => {
      if (prev.has(messageId)) return prev;
      const next = new Set(prev);
      next.add(messageId);
      return next;
    });
  };

  const setDate = (toOffset, direction) => {
    if (isDateTransitioning || toOffset === currentDayOffset) return;
    setSelectedMessageId(null);
    setDateTransition({
      fromOffset: currentDayOffset,
      toOffset,
      direction,
    });

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = setTimeout(() => {
      setCurrentDayOffset(toOffset);
      setDateTransition(null);
      transitionTimerRef.current = null;
    }, MESSAGE_PAGE_SLIDE_MS);
  };

  const goNextDate = () => {
    if (!canGoNext) return;
    setDate(currentDayOffset + 1, 'next');
  };

  const goPrevDate = () => {
    if (!canGoPrev) return;
    setDate(currentDayOffset - 1, 'prev');
  };

  const renderCards = (messages, keyPrefix) => (
    messages.map((message) => (
      <MessageCard
        key={`${keyPrefix}-${message.id}`}
        message={message}
        onOpen={openMessage}
        isRead={readMessageIds.has(message.id)}
      />
    ))
  );

  const renderSnapshot = (messages, keyPrefix) => {
    if (messages.length === 0) {
      return (
        <div className="message-board-empty" key={`${keyPrefix}-empty`}>
          No messages for this day.
        </div>
      );
    }

    return renderCards(messages, keyPrefix);
  };

  return (
    <div
      className={`message-board-screen${visible ? ' visible' : ''}${selectedMessage ? ' has-opened-message' : ''}`}
      style={{ '--message-board-page-slide-ms': `${MESSAGE_PAGE_SLIDE_MS}ms` }}
    >
      <div className="board-texture" />
      <div className="message-board-holder">
        <div className="message-board-viewport">
          <div className="message-board-canvas">
            {dateTransition ? (
              <div className={`message-board-pages-track direction-${dateTransition.direction}`}>
                <div className="message-board-page-snapshot">
                  {dateTransition.direction === 'next'
                    ? renderSnapshot(outgoingMessages, 'slide-out')
                    : renderSnapshot(incomingMessages, 'slide-in')}
                </div>
                <div className="message-board-page-snapshot">
                  {dateTransition.direction === 'next'
                    ? renderSnapshot(incomingMessages, 'slide-in')
                    : renderSnapshot(outgoingMessages, 'slide-out')}
                </div>
              </div>
            ) : (
              <div className="message-board-page-snapshot is-current">
                {renderSnapshot(currentMessages, `day-${currentDayOffset}`)}
              </div>
            )}
          </div>
        </div>

        <div
          className={`channel-page-arrow channel-page-arrow-prev board-page-arrow${canGoPrev ? '' : ' is-disabled'}`}
          onClick={goPrevDate}
          role="button"
          aria-label="Previous message board day"
          aria-disabled={!canGoPrev}
        >
          <button
            className="wii-arrow-btn wii-arrow-btn-right"
            type="button"
            aria-label="Previous message board day"
          />
          <button className="wii-track-btn-circle wii-track-btn-base wii-track-btn-no-shadow channel-page-circle" type="button" tabIndex={-1}>
            <span className="wii-track-btn-icon">
              <span className="wii-icon wii-icon-minus" aria-hidden="true"></span>
            </span>
          </button>
        </div>

        <div
          className={`channel-page-arrow channel-page-arrow-next board-page-arrow${canGoNext ? '' : ' is-disabled'}`}
          onClick={goNextDate}
          role="button"
          aria-label="Next message board day"
          aria-disabled={!canGoNext}
        >
          <button
            className="wii-arrow-btn"
            type="button"
            aria-label="Next message board day"
          />
          <button className="wii-track-btn-circle wii-track-btn-base wii-track-btn-no-shadow channel-page-circle" type="button" tabIndex={-1}>
            <span className="wii-track-btn-icon">
              <span className="wii-icon wii-icon-plus" aria-hidden="true"></span>
            </span>
          </button>
        </div>
      </div>

      {selectedMessage && (
        <MessageMemo message={selectedMessage} onClose={() => setSelectedMessageId(null)} />
      )}
    </div>
  );
}
