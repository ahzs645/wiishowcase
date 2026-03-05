import WiiChannelRenderer from '../WiiChannelRenderer';
import { NEWS_RENDERER_SETTINGS } from './newsChannelRendererSettings';

export default function NewsChannelContent() {
  return (
    <WiiChannelRenderer
      bundlePath="channels/news.zip"
      target="icon"
      playing={true}
      settings={NEWS_RENDERER_SETTINGS.icon}
    />
  );
}
