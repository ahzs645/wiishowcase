import WiiChannelRenderer from '../WiiChannelRenderer';

export default function ShopChannelContent({ playing = true }: { playing?: boolean }) {
  return (
    <WiiChannelRenderer
      bundlePath="channels/shop.zip"
      target="icon"
      playing={playing}
    />
  );
}
