import WiiSounds from "./WiiSounds";
import { systemSnapshot } from "./systemState";
const sounds = new WiiSounds();
export function playSystemFeedback(name) {
  sounds.setVolume(systemSnapshot().settings.remoteVolume);
  sounds.play(name);
}
