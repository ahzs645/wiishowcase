import { memo } from 'react';
import useWiiAspectMode from '../hooks/useWiiAspectMode';

export default memo(function ChannelCard({
  name,
  gradient,
  blank,
  onClick,
  channelIndex,
  contentActive = true,
  contentComponent: ContentComponent,
  contentPlaying = true,
  content,
  contentClassName,
  contentStyle,
}) {
  const { channelShapeId, viewBox, maskUrl } = useWiiAspectMode();
  // maskUrl is usually a data: URI (Vite inlines small SVG imports), which
  // contains commas — url() must be quoted or the declaration is invalid CSS
  // and style.setProperty silently drops it.
  const maskStyle = { '--wii-channel-mask': `url("${maskUrl}")` };
  const renderedContent = ContentComponent
    ? (contentActive ? <ContentComponent playing={contentPlaying} /> : null)
    : content;

  if (blank) {
    return (
      <div className="wii-channel-ui wii-channel-ui-empty" style={maskStyle}>
        {renderedContent && (
          <div className={`wii-channel-ui-content ${contentClassName || 'channel-inner'}`}>
            {renderedContent}
          </div>
        )}
        <svg
          className="wii-channel-ui-svg"
          viewBox={viewBox}
          preserveAspectRatio="none"
        >
          <use className="wii-channel-ui-dimmer" href={`#${channelShapeId}`} />
          <use
            className="wii-channel-ui-border"
            href={`#${channelShapeId}`}
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
        '--wii-channel-mask': `url("${maskUrl}")`,
        ...(contentStyle || {}),
      }}
      data-channel-index={channelIndex}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!isClickable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div
        className={`wii-channel-ui-content ${contentClassName || 'channel-inner'}`}
      >
        {renderedContent || <span className="wii-channel-title">{name}</span>}
      </div>
      <svg
        className="wii-channel-ui-svg"
        viewBox={viewBox}
        preserveAspectRatio="none"
      >
        <use className="wii-channel-ui-dimmer" href={`#${channelShapeId}`} />
        <use
          className="wii-channel-ui-border"
          href={`#${channelShapeId}`}
          fill="none"
        />
      </svg>
    </div>
  );
});
