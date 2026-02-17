import useWiiAspectMode from '../hooks/useWiiAspectMode';

export default function ChannelCard({
  name,
  gradient,
  blank,
  onClick,
  content,
  contentClassName,
  contentStyle,
}) {
  const { channelPath, viewBox, maskUrl } = useWiiAspectMode();
  const maskStyle = { '--wii-channel-mask': `url(${maskUrl})` };

  if (blank) {
    return (
      <div className="wii-channel-ui wii-channel-ui-empty" style={maskStyle}>
        <svg
          className="wii-channel-ui-svg"
          viewBox={viewBox}
          preserveAspectRatio="none"
        >
          <path className="wii-channel-ui-dimmer" d={channelPath} />
          <path
            className="wii-channel-ui-border"
            d={channelPath}
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
        '--wii-channel-mask': `url(${maskUrl})`,
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
        viewBox={viewBox}
        preserveAspectRatio="none"
      >
        <path className="wii-channel-ui-dimmer" d={channelPath} />
        <path
          className="wii-channel-ui-border"
          d={channelPath}
          fill="none"
        />
      </svg>
    </div>
  );
}
