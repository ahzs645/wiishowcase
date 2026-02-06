import { useEffect, useRef } from 'react';

const BASE = import.meta.env.BASE_URL;

export default function ChannelSelection({ visible, channel, onBack, onStart }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) return;
    if (visible && channel?.audio) {
      audioRef.current.src = `${BASE}${channel.audio}`;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, [visible, channel]);

  return (
    <div className={`ch-selection${visible ? ' visible' : ''}`}>
      <audio ref={audioRef} loop />
      <div className="ch-sel-content">
        <div className="ch-sel-tl" />
        <div className="ch-sel-tr" />
        <div className="ch-sel-bl" />
        <div className="ch-sel-br" />

        {channel?.video && (
          <img
            src={visible ? `${BASE}${channel.video}` : ''}
            className="ch-sel-video"
            alt=""
          />
        )}

        <div className="ch-sel-buttons">
          <button className="wii-btn-start wii-btn-start-md" type="button" onClick={onBack}>
            <div className="wii-btn-start-highlight-sharp" />
            <span>Wii Menu</span>
          </button>
          <button className="wii-btn-start wii-btn-start-md" type="button" onClick={onStart}>
            <div className="wii-btn-start-highlight-sharp" />
            <span>Start</span>
          </button>
        </div>
      </div>
    </div>
  );
}
