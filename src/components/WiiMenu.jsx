import Clock from './Clock';
import ChannelCard from './ChannelCard';

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
];

export default function WiiMenu({
  visible,
  fadeOut,
  onMailClick,
  onPairClick,
  onNewsClick,
  peerConnected,
}) {
  return (
    <div className={`wii-menu wii-menu-wrapper${visible ? ' visible' : ''}${fadeOut ? ' fade-out' : ''}`}>
      <Clock />

      <div className="wii-channel-grid-authentic">
        {CHANNELS.map((ch, i) => (
          <ChannelCard
            key={i}
            name={ch.name}
            gradient={ch.gradient}
            blank={ch.blank}
            onClick={ch.action === 'news' ? onNewsClick : undefined}
            content={ch.content}
            contentClassName={ch.contentClassName}
          />
        ))}
      </div>

      {/* Pair Remote button */}
      <button
        className={`wii-pair-btn${peerConnected ? ' connected' : ''}`}
        onClick={onPairClick}
      >
        {peerConnected ? 'Remote Connected' : 'Pair Wii Remote'}
      </button>

      {/* Bottom Banner */}
      <div className="wii-bottom-banner">
        <div className="wii-bottom-banner-scroll">
          <wii-banner />
        </div>
        <div className="wii-left-btn-bg" />
        <img
          src="/assets/settings-icon.png"
          className="wii-corner-btn left"
          alt="Wii Settings"
        />
        <div className="wii-right-btn-bg" />
        <img
          src="/assets/mail-button.png"
          className="wii-corner-btn right"
          alt="Wii Message Board"
          onClick={onMailClick}
        />
      </div>
    </div>
  );
}
