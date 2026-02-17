import WiiChannelRenderer from '../WiiChannelRenderer';

export default function MiiChannelContent() {
  return (
    <WiiChannelRenderer
      bundlePath="channels/mii.zip"
      target="icon"
      playing={true}
    />
  );
}
