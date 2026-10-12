import WiiChannelRenderer from '../WiiChannelRenderer';
const SETTINGS = { rendererBackend: 'auto', customWeather: { enabled: false, state: 'needs_access' } };
export default function ForecastChannelContent({ playing = true }) {
  return <WiiChannelRenderer bundlePath="channels/forecast.zip" target="icon" playing={playing} settings={SETTINGS}/>;
}
