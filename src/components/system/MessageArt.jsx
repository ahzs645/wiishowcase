import memo from "../../../Wii.css/assets/interface/memo-choice.svg";
import letter from "../../../Wii.css/assets/interface/envelope-open.svg";
import addressBook from "../../../Wii.css/assets/interface/address-book.png";

const ART = { Memo: memo, Letter: letter, "Address Book": addressBook };
export default function MessageArt({ kind }) {
  return <img className="message-choice-art wii-interface-art" src={ART[kind]} alt="" aria-hidden="true" />;
}
