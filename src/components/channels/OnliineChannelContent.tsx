const BASE = import.meta.env.BASE_URL;

const CIRCLE_STYLES: React.CSSProperties[] = [
  { top: '-10%', left: '-5%' },
  { top: '40%', left: '30%' },
  { top: '10%', right: '15%' },
  { bottom: '-20%', right: '-10%' },
];

export default function OnliineChannelContent() {
  return (
    <>
      <div className="ch-onliine-gradient" />
      <img src={`${BASE}channelart/onliine/logotype.png`} className="ch-onliine-logo" alt="" />
      <div className="ch-onliine-circles">
        {CIRCLE_STYLES.map((style, i) => (
          <div key={i} className="ch-onliine-circle" style={style} />
        ))}
      </div>
    </>
  );
}
