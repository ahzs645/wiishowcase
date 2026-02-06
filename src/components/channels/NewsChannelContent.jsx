export default function NewsChannelContent() {
  return (
    <>
      <div className="ch-news-gradient" />
      <div className="ch-news-bg" />
      <div className="ch-news-map" />
      <div className="ch-news-title">News Channel</div>
      <div className="ch-news-ticker">
        <div className="ch-news-header">
          <div className="ch-news-text">
            <img src="/channelart/news/pinpoint.png" alt="" />
            Website in development phase
          </div>
        </div>
        <div className="ch-news-header">
          <div className="ch-news-text">
            <img src="/channelart/news/pinpoint.png" className="ch-news-scnd" alt="" />
            Developed with a lot of enthusiasm and effort
          </div>
        </div>
      </div>
    </>
  );
}
