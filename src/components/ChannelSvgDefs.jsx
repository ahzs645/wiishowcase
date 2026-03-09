import useWiiAspectMode from '../hooks/useWiiAspectMode';

const HIDDEN_SVG_STYLE = {
  position: 'absolute',
  width: 0,
  height: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
};

export default function ChannelSvgDefs() {
  const { channelPath, channelShapeId, viewBox } = useWiiAspectMode();

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={HIDDEN_SVG_STYLE}
    >
      <defs>
        <path id={channelShapeId} d={channelPath} />
      </defs>
    </svg>
  );
}
