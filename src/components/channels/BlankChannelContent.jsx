import WiiChannelRenderer from '../WiiChannelRenderer';

export default function BlankChannelContent() {
  return (
    <WiiChannelRenderer
      bundlePath="channels/blank.zip"
      target="icon"
      playing={true}
    />
  );
}
