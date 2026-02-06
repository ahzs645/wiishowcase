const BASE = import.meta.env.BASE_URL;

export default function PhotoChannelContent() {
  return (
    <div className="ch-photo-container">
      <div className="ch-photo-title">Photo Channel</div>
      <img src={`${BASE}channelart/photo/backleft.png`} className="ch-photo-bl" alt="" />
      <img src={`${BASE}channelart/photo/fore.png`} className="ch-photo-fore" alt="" />
      <img src={`${BASE}channelart/photo/backright.png`} className="ch-photo-br" alt="" />
    </div>
  );
}
