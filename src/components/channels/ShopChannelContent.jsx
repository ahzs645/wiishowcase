const BASE = import.meta.env.BASE_URL;

export default function ShopChannelContent() {
  return (
    <>
      <div className="ch-shop-logo">
        <img src={`${BASE}channelart/shop/logo.png`} alt="" />
        <span>Wii Shop Channel</span>
      </div>
      <div className="ch-shop-gradient" />
      <div className="ch-shop-grid" />
    </>
  );
}
