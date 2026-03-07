import WiiChannelRenderer from '../WiiChannelRenderer';

const DISC_ICON_SETTINGS = {
  animOverride: 'arc/anim/my_DiskCh_b.brlan',
};

export default function DiscChannelContent({ playing = true }: { playing?: boolean }) {
  return (
    <WiiChannelRenderer
      bundlePath="channels/disc.zip"
      target="icon"
      playing={playing}
      settings={DISC_ICON_SETTINGS}
    />
  );
}
