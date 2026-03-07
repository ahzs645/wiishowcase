import { memo, type ReactNode } from 'react';
import useWiiAspectMode from '../hooks/useWiiAspectMode';

interface ChannelCardProps {
  name?: string;
  gradient?: string;
  blank?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  channelIndex?: number;
  contentActive?: boolean;
  contentComponent?: React.ComponentType<{ playing?: boolean }>;
  contentPlaying?: boolean;
  content?: ReactNode;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
}

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
}: ChannelCardProps) {
  const { channelPath, viewBox, maskUrl } = useWiiAspectMode();
  const maskStyle = { '--wii-channel-mask': `url(${maskUrl})` } as React.CSSProperties;
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
        <svg className="wii-channel-ui-svg" viewBox={viewBox} preserveAspectRatio="none">
          <path className="wii-channel-ui-dimmer" d={channelPath} />
          <path className="wii-channel-ui-border" d={channelPath} fill="none" />
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
      } as React.CSSProperties}
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
      <div className={`wii-channel-ui-content ${contentClassName || 'channel-inner'}`}>
        {renderedContent || <span className="wii-channel-title">{name}</span>}
      </div>
      <svg className="wii-channel-ui-svg" viewBox={viewBox} preserveAspectRatio="none">
        <path className="wii-channel-ui-dimmer" d={channelPath} />
        <path className="wii-channel-ui-border" d={channelPath} fill="none" />
      </svg>
    </div>
  );
});
