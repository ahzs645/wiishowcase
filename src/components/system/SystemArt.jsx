import data from "../../../Wii.css/assets/interface/data-art.svg";
import wii from "../../../Wii.css/assets/interface/wii-art.svg";
import gamecube from "../../../Wii.css/assets/interface/gamecube-art.svg";
import settings from "../../../Wii.css/assets/interface/settings-art.svg";
import channels from "../../../Wii.css/assets/interface/channels-art.svg";

const ART = { data, saves: data, wii, gamecube, settings, channels };
// Artwork belongs to Wii.css; the owning screen supplies the fitted geometry.
export default function SystemArt({ kind }) {
  return <img className="system-tile-art-svg wii-interface-art" src={ART[kind] || data} alt="" aria-hidden="true" />;
}
