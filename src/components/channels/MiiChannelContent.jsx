const BASE = import.meta.env.BASE_URL;

export default function MiiChannelContent() {
  return (
    <>
      <img src={`${BASE}channelart/mii/miis.png`} className="ch-mii-img" alt="" />
      <div className="ch-mii-title">Mii</div>
    </>
  );
}
