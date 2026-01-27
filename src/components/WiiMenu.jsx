import Clock from './Clock';
import ChannelCard from './ChannelCard';

const CHANNELS = [
  { name: 'Disc Channel', gradient: 'linear-gradient(135deg, #4a90d9, #357abd)' },
  { name: 'Mii Channel', gradient: 'linear-gradient(135deg, #ff9500, #e08600)' },
  { name: 'Photo Channel', gradient: 'linear-gradient(135deg, #5856D6, #4240a8)' },
  { name: 'Wii Shop', gradient: 'linear-gradient(135deg, #7dc832, #5ea01e)' },
  { name: 'Forecast Channel', gradient: 'linear-gradient(135deg, #ff3b30, #cc2f26)' },
  { name: 'News Channel', gradient: 'linear-gradient(135deg, #34aadc, #2790b8)' },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
  { blank: true },
];

export default function WiiMenu({ visible, fadeOut, onMailClick }) {
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
          />
        ))}
      </div>

      {/* Bottom Bar */}
      <div className="wii-bottom-bar">
        <div className="wii-bottom-bar-lateral left">
          <div className="wii-left-btn-bg" />
          <img
            src="/assets/settings-icon.png"
            className="wii-corner-btn left"
            alt="Wii Settings"
          />
        </div>
        <div className="wii-bottom-bar-center" />
        <div className="wii-bottom-bar-lateral right">
          <div className="wii-right-btn-bg" />
          <img
            src="/assets/mail-button.png"
            className="wii-corner-btn right"
            alt="Wii Message Board"
            onClick={onMailClick}
          />
        </div>
      </div>
    </div>
  );
}
