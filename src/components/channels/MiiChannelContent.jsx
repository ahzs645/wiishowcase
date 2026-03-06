import WiiChannelRenderer from '../WiiChannelRenderer';

export default function MiiChannelContent({ playing = true }) {
  return (
    <WiiChannelRenderer
      bundlePath="channels/mii.zip"
      target="icon"
      playing={playing}
    />
  );
}
