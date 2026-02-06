import channelMask from '../../Wii.css/dist/assets/channel-mask.svg';

const CHANNEL_PATH =
  'M1002 3.5C1069.66 3.5 1125.47 3.49908 1164.54 5.64062L1168.27 5.85449L1168.28 5.85547C1173.85 6.21006 1179.13 8.51403 1183.18 12.3643C1187.22 16.209 1189.78 21.3508 1190.42 26.8926C1193.03 47.9647 1194.5 82.1481 1194.5 108.5C1194.5 134.842 1193.03 169.009 1190.42 190.083L1190.42 190.084C1189.79 195.635 1187.22 200.786 1183.18 204.636C1179.13 208.486 1173.85 210.79 1168.28 211.145L1168.27 211.146C1129.06 213.501 1071.84 213.5 1002 213.5C932.156 213.5 874.944 213.501 835.73 211.146L835.722 211.145C830.146 210.79 824.873 208.486 820.824 204.636C816.776 200.786 814.21 195.635 813.576 190.084V190.083C810.97 169.009 809.5 134.882 809.5 108.5C809.5 82.108 810.972 47.9647 813.579 26.8926C814.217 21.3508 816.782 16.209 820.824 12.3643C824.873 8.51402 830.146 6.21006 835.722 5.85547L835.73 5.85449L839.459 5.64062C878.532 3.49908 934.339 3.5 1002 3.5Z';

export default function ChannelCard({
  name,
  gradient,
  blank,
  onClick,
  content,
  contentClassName,
  contentStyle,
}) {
  const maskStyle = { '--wii-channel-mask': `url(${channelMask})` };

  if (blank) {
    return (
      <div className="wii-channel-ui wii-channel-ui-empty" style={maskStyle}>
        <svg
          className="wii-channel-ui-svg"
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
    );
  }

  const isClickable = typeof onClick === 'function';

  return (
    <div
      className={`wii-channel-ui${isClickable ? ' is-clickable' : ''}`}
      style={{
        '--wii-channel-bg': gradient || undefined,
        '--wii-channel-mask': `url(${channelMask})`,
        ...(contentStyle || {}),
      }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!isClickable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div
        className={`wii-channel-ui-content ${contentClassName || 'channel-inner'}`}
      >
        {content || <span className="wii-channel-title">{name}</span>}
      </div>
      <svg
        className="wii-channel-ui-svg"
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
  );
}
