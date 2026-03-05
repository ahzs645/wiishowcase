import WiiChannelRenderer from '../WiiChannelRenderer';

const DISC_ICON_SETTINGS = {
  animOverride: 'arc/anim/my_DiskCh_b.brlan',
  scene: 'update',
};

export default function DiscChannelContent() {
  return (
    <WiiChannelRenderer
      bundlePath="channels/disc.zip"
      target="icon"
      playing={true}
      settings={DISC_ICON_SETTINGS}
    />
  );
}
