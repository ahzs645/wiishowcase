export default function ChannelCard({ name, gradient, blank }) {
  if (blank) {
    return <div className="wii-channel-authentic wii-channel-blank" />;
  }

  return (
    <div className="wii-channel-authentic wii-channel-occupied">
      <div
        className="wii-channel-content channel-inner"
        style={{ background: gradient }}
      >
        {name}
      </div>
      <div className="wii-channel-hover-glow" />
      <span className="wii-channel-tag">{name}</span>
    </div>
  );
}
