import WiiChannelRenderer from '../WiiChannelRenderer';

export default function MiiChannelContent({ playing = true }: { playing?: boolean }) {
  return (
    <WiiChannelRenderer
      bundlePath="channels/mii.zip"
      target="icon"
      playing={playing}
    />
  );
}
