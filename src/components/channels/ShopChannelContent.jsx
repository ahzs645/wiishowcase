import WiiChannelRenderer from '../WiiChannelRenderer';

export default function ShopChannelContent() {
  return (
    <WiiChannelRenderer
      bundlePath="channels/shop.zip"
      target="icon"
      playing={true}
    />
  );
}
