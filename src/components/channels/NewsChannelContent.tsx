import WiiChannelRenderer from '../WiiChannelRenderer';
import { NEWS_RENDERER_SETTINGS } from './newsChannelRendererSettings';

export default function NewsChannelContent({ playing = true }: { playing?: boolean }) {
  return (
    <WiiChannelRenderer
      bundlePath="channels/news.zip"
      target="icon"
      playing={playing}
      settings={NEWS_RENDERER_SETTINGS.icon}
    />
  );
}
