import WiiChannelRenderer from '../WiiChannelRenderer';

export default function PokemonRanchChannelContent({ playing = true }) {
  return (
    <WiiChannelRenderer
      bundlePath="channels/pokemon-ranch.zip"
      target="icon"
      playing={playing}
    />
  );
}
