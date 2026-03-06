import WiiChannelRenderer from '../WiiChannelRenderer';

export default function ShopChannelContent({ playing = true }) {
  return (
    <WiiChannelRenderer
      bundlePath="channels/shop.zip"
      target="icon"
      playing={playing}
    />
  );
}
