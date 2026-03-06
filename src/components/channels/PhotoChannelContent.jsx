import WiiChannelRenderer from '../WiiChannelRenderer';

export default function PhotoChannelContent({ playing = true }) {
  return (
    <WiiChannelRenderer
      bundlePath="channels/photo.zip"
      target="icon"
      playing={playing}
    />
  );
}
