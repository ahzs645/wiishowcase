import WiiChannelRenderer from '../WiiChannelRenderer';

export default function DiscChannelContent() {
  return (
    <WiiChannelRenderer
      bundlePath="channels/disc.zip"
      target="icon"
      playing={true}
    />
  );
}
