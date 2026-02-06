import Clock from './Clock';
import ChannelCard from './ChannelCard';
import settingsIcon from '../../Wii.css/dist/assets/settings-icon.png';
import mailIcon from '../../Wii.css/dist/assets/track-btn/icon-email.svg';

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
    <div
      className={`wii-menu wii-menu-wrapper${visible ? ' visible' : ''}${fadeOut ? ' fade-out' : ''}`}
      style={{ backgroundColor: '#c8c8c8' }}
    >
      <wii-channel-holder>
        <Clock />
        <div className="wii-channel-holder-grid">
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
      </wii-channel-holder>

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
