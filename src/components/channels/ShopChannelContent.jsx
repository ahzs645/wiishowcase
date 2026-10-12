import WiiChannelRenderer from '../WiiChannelRenderer';

// Shop's animated TEV materials are expensive to evaluate per pixel on the
// CPU. Prefer the accurate GPU pipeline, with Canvas on unsupported browsers.
const SHOP_ICON_SETTINGS = { rendererBackend: 'auto', tevQuality: 'accurate' };

export default function ShopChannelContent({ playing = true }) {
  return (
    <WiiChannelRenderer
      bundlePath="channels/shop.zip"
      target="icon"
      playing={playing}
      settings={SHOP_ICON_SETTINGS}
    />
  );
}
