import WiiChannelRenderer from '../WiiChannelRenderer';

export default function PhotoChannelContent({ playing = true }: { playing?: boolean }) {
  return (
    <WiiChannelRenderer
      bundlePath="channels/photo.zip"
      target="icon"
      playing={playing}
    />
  );
}
