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
    return <div className="wii-channel wii-channel-empty" />;
  }

  const isClickable = typeof onClick === 'function';
  const style = {
    ...(gradient ? { background: gradient } : {}),
    ...(contentStyle || {}),
  };

  return (
    <div
      className={`wii-channel${isClickable ? ' is-clickable' : ''}`}
      style={style}
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
      <div className={`wii-channel-content ${contentClassName || 'channel-inner'}`}>
        {content || <span className="wii-channel-title">{name}</span>}
      </div>
    </div>
  );
}
