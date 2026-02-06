const BASE = import.meta.env.BASE_URL;

export default function OnliineChannelContent() {
  return (
    <>
      <div className="ch-onliine-gradient" />
      <img src={`${BASE}channelart/onliine/logotype.png`} className="ch-onliine-logo" alt="" />
      <div className="ch-onliine-circles">
        <div className="ch-onliine-circle" style={{ top: '-10%', left: '-5%' }} />
        <div className="ch-onliine-circle" style={{ top: '40%', left: '30%' }} />
        <div className="ch-onliine-circle" style={{ top: '10%', right: '15%' }} />
        <div className="ch-onliine-circle" style={{ bottom: '-20%', right: '-10%' }} />
      </div>
    </>
  );
}
