import { useEffect } from "react";
import { useSystemSetting } from "../lib/systemState";
const graphs = new WeakMap();
export default function useChannelSoundMode(audioRef) {
  const mode = useSystemSetting("sound");
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let graph = graphs.get(audio);
    if (mode === "Mono" && !graph && window.AudioContext) {
      const context = new AudioContext();
      const source = context.createMediaElementSource(audio);
      const mix = context.createGain();
      // Speaker downmix preserves mono gain and averages a stereo source.
      mix.channelCount = 1;
      mix.channelCountMode = "explicit";
      mix.channelInterpretation = "speakers";
      graph = { context, source, mix };
      graphs.set(audio, graph);
    }
    if (graph) {
      graph.source.disconnect();
      graph.mix.disconnect();
      if (mode === "Mono") {
        graph.source.connect(graph.mix);
        graph.mix.connect(graph.context.destination);
      } else graph.source.connect(graph.context.destination);
      graph.context.resume().catch(() => {});
    }
  }, [audioRef, mode]);
}
