import { useEffect, useMemo, useRef, useState } from 'react';

const MESSAGES_PER_PAGE = 3;
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

const BOARD_MESSAGES = [
  {
    id: 'sample-onliine-message',
    type: 'avatar',
    sender: 'Peter Miiffin',
    preview: 'Hello Lois',
    avatarSrc: `${import.meta.env.BASE_URL}assets/message-board/petermiiffin-head.png`,
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

function chunkMessages(items, pageSize) {
  const pages = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
  }
  return pages;
}

const MESSAGE_PAGES = chunkMessages(BOARD_MESSAGES, MESSAGES_PER_PAGE);

function MessageCard({ message, onOpen }) {
  const type = MESSAGE_TYPES[message.type] ?? MESSAGE_TYPES.memo;
  const avatarClassName = `message-board-card-avatar${type.fullAvatar ? ' is-full-avatar' : ''}`;

  return (
    <button
      type="button"
      className={`message-board-card ${type.cardClassName}`}
      style={{
        left: `${message.x}%`,
        top: `${message.y}%`,
        transform: `rotate(${message.angle}deg)`,
      }}
      onClick={() => onOpen(message.id)}
      aria-label={`Open ${type.label} from ${message.sender}`}
    >
      <div className="message-board-card-header">
        <div className={avatarClassName} title={message.avatarAlt || message.sender}>
          {message.avatarSrc ? (
            <img src={message.avatarSrc} alt={message.avatarAlt || ''} />
          ) : (
            <span>{message.avatarFallback || message.sender[0]}</span>
          )}
        </div>
      </div>
      <div className="message-board-card-preview">{message.preview}</div>
      <div className="message-board-card-type-label">{type.label}</div>
    </button>
  );
}

function MessageMemo({ message, onClose }) {
  const type = MESSAGE_TYPES[message.type] ?? MESSAGE_TYPES.memo;
  const dialogTitleId = `message-board-memo-title-${message.id}`;
  const avatarClassName = `message-board-memo-avatar${type.fullAvatar ? ' is-full-avatar' : ''}`;

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
        <span className="message-board-memo-title" id={dialogTitleId}>{type.label}</span>

        <div className="message-board-memo-header">
          <div className={avatarClassName} title={message.avatarAlt || message.sender}>
            {message.avatarSrc ? (
              <img src={message.avatarSrc} alt={message.avatarAlt || ''} />
            ) : (
              <span>{message.avatarFallback || message.sender[0]}</span>
            )}
          </div>
          <div className="message-board-memo-sender">{message.sender}</div>
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
      </div>
    </div>
  );
}

export default function WiiMessageBoard({ visible }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [pageTransition, setPageTransition] = useState(null);
  const transitionTimerRef = useRef(null);

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
      setPageTransition(null);
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    }
  }, [visible]);

  const isPageTransitioning = Boolean(pageTransition);
  const currentMessages = MESSAGE_PAGES[currentPage] ?? [];
  const outgoingMessages = pageTransition ? (MESSAGE_PAGES[pageTransition.fromPage] ?? []) : [];
  const incomingMessages = pageTransition ? (MESSAGE_PAGES[pageTransition.toPage] ?? []) : [];
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

  const canGoPrev = !isPageTransitioning && currentPage > 0;
  const canGoNext = !isPageTransitioning && currentPage < MESSAGE_PAGES.length - 1;

  const openMessage = (messageId) => {
    if (isPageTransitioning) return;
    setSelectedMessageId(messageId);
  };

  const setPage = (toPage, direction) => {
    if (isPageTransitioning || toPage === currentPage) return;
    setSelectedMessageId(null);
    setPageTransition({
      fromPage: currentPage,
      toPage,
      direction,
    });

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = setTimeout(() => {
      setCurrentPage(toPage);
      setPageTransition(null);
      transitionTimerRef.current = null;
    }, MESSAGE_PAGE_SLIDE_MS);
  };

  const goNextPage = () => {
    if (!canGoNext) return;
    setPage(currentPage + 1, 'next');
  };

  const goPrevPage = () => {
    if (!canGoPrev) return;
    setPage(currentPage - 1, 'prev');
  };

  const renderCards = (messages, keyPrefix) => (
    messages.map((message) => (
      <MessageCard
        key={`${keyPrefix}-${message.id}`}
        message={message}
        onOpen={openMessage}
      />
    ))
  );

  return (
    <div
      className={`message-board-screen${visible ? ' visible' : ''}${selectedMessage ? ' has-opened-message' : ''}`}
      style={{ '--message-board-page-slide-ms': `${MESSAGE_PAGE_SLIDE_MS}ms` }}
    >
      <div className="board-texture" />
      <div className="message-board-holder">
        <div className="board-title">Message Board</div>

        <div className="message-board-viewport">
          <div className="message-board-canvas">
            {pageTransition ? (
              <div className={`message-board-pages-track direction-${pageTransition.direction}`}>
                <div className="message-board-page-snapshot">
                  {pageTransition.direction === 'next'
                    ? renderCards(outgoingMessages, 'slide-out')
                    : renderCards(incomingMessages, 'slide-in')}
                </div>
                <div className="message-board-page-snapshot">
                  {pageTransition.direction === 'next'
                    ? renderCards(incomingMessages, 'slide-in')
                    : renderCards(outgoingMessages, 'slide-out')}
                </div>
              </div>
            ) : (
              <div className="message-board-page-snapshot is-current">
                {renderCards(currentMessages, `page-${currentPage}`)}
              </div>
            )}
          </div>
        </div>

        <div
          className={`channel-page-arrow channel-page-arrow-prev board-page-arrow${canGoPrev ? '' : ' is-disabled'}`}
          onClick={goPrevPage}
          role="button"
          aria-label="Previous message board page"
          aria-disabled={!canGoPrev}
        >
          <button
            className="wii-arrow-btn wii-arrow-btn-right"
            type="button"
            aria-label="Previous message board page"
          />
          <button className="wii-track-btn-circle wii-track-btn-base wii-track-btn-no-shadow channel-page-circle" type="button" tabIndex={-1}>
            <span className="wii-track-btn-icon">
              <span className="wii-icon wii-icon-minus" aria-hidden="true"></span>
            </span>
          </button>
        </div>

        <div
          className={`channel-page-arrow channel-page-arrow-next board-page-arrow${canGoNext ? '' : ' is-disabled'}`}
          onClick={goNextPage}
          role="button"
          aria-label="Next message board page"
          aria-disabled={!canGoNext}
        >
          <button
            className="wii-arrow-btn"
            type="button"
            aria-label="Next message board page"
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
