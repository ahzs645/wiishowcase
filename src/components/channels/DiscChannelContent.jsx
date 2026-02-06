const BASE = import.meta.env.BASE_URL;

export default function DiscChannelContent() {
  return (
    <>
      <div className="ch-disc-bg" />
      <div className="ch-disc-align">
        <img src={`${BASE}channelart/disc/disc.png`} className="ch-disc-img" alt="" />
      </div>
    </>
  );
}
