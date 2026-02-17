import WiiChannelRenderer from '../WiiChannelRenderer';

export default function PhotoChannelContent() {
  return (
    <WiiChannelRenderer
      bundlePath="channels/photo.zip"
      target="icon"
      playing={true}
    />
  );
}
