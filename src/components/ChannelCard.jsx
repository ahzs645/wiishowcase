export default function ChannelCard({
  name,
  gradient,
  blank,
  onClick,
  content,
  contentClassName,
  contentStyle,
}) {
  if (blank) {
    return <div className="wii-channel-authentic wii-channel-blank" />;
  }

  const isClickable = typeof onClick === 'function';
  const className = contentClassName || 'channel-inner';
  const style = {
    ...(gradient ? { '--wii-channel-bg': gradient } : {}),
    ...(contentStyle || {}),
  };

  return (
    <div
      className={`wii-channel-authentic wii-channel-occupied${isClickable ? ' is-clickable' : ''}`}
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
        className={`wii-channel-content wii-channel-ui ${className}`}
        style={style}
      >
        {content || name}
      </div>
      <div className="wii-channel-hover-glow" />
      <span className="wii-channel-tag">{name}</span>
    </div>
  );
}
