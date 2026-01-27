import { useState } from 'react';

const messages = [
  { id: 1, color: '#fff9c4', pinColor: '#e53935', from: 'Mom', angle: -5, x: 8, y: 12, message: "Don't forget to call grandma this weekend! She misses you. 💕", special: false },
  { id: 2, color: '#b2ebf2', pinColor: '#ffc107', from: 'Loopy', angle: 8, x: 55, y: 8, message: "Hey! Want to play Mario Kart later? I finally unlocked Rainbow Road!", special: true, mii: '😊' },
  { id: 3, color: '#fff9c4', pinColor: '#e53935', from: 'Toru', angle: -3, x: 32, y: 35, message: "Thanks for the birthday gift! The game is amazing, I've been playing non-stop!", special: false },
  { id: 4, color: '#fff9c4', pinColor: '#ffc107', from: 'デジカメ', angle: 12, x: 62, y: 42, message: "Check out this photo from our trip! The sunset was incredible.", special: false },
  { id: 5, color: '#b2ebf2', pinColor: '#e53935', from: 'Loopy', angle: -8, x: 78, y: 18, message: "I beat your high score in Wii Sports! Try to catch up! 🎾", special: true, mii: '😄' },
  { id: 6, color: '#ffffff', pinColor: '#ffc107', from: 'Heutig_', angle: 4, x: 12, y: 55, message: "Meeting rescheduled to 3pm tomorrow. See you there!", special: false },
];

function Envelope({ message, onClick, isSelected }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${message.x}%`,
        top: `${message.y}%`,
        transform: `rotate(${message.angle}deg) scale(${isSelected ? 1.1 : 1})`,
        cursor: 'pointer',
        transition: 'transform 0.2s ease, z-index 0s',
        zIndex: isSelected ? 100 : 10,
        filter: isSelected ? 'drop-shadow(0 8px 20px rgba(0,0,0,0.3))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
      }}
    >
      {/* Pin */}
      <div style={{
        position: 'absolute',
        top: '-12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${message.pinColor === '#e53935' ? '#ff6659' : '#ffecb3'}, ${message.pinColor} 60%, ${message.pinColor === '#e53935' ? '#b71c1c' : '#ff8f00'})`,
          boxShadow: '0 3px 6px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-4px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '4px',
          height: '8px',
          background: 'linear-gradient(to bottom, #888, #666)',
          borderRadius: '0 0 2px 2px',
        }} />
      </div>

      {/* Envelope */}
      <div style={{
        width: '140px',
        height: '100px',
        background: `linear-gradient(145deg, ${message.color} 0%, ${message.color === '#b2ebf2' ? '#80deea' : message.color === '#ffffff' ? '#f5f5f5' : '#fff59d'} 100%)`,
        borderRadius: '4px',
        position: 'relative',
        border: '1px solid rgba(0,0,0,0.08)',
      }}>
        {/* Envelope flap */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '0',
          height: '0',
          borderLeft: '70px solid transparent',
          borderRight: '70px solid transparent',
          borderTop: `45px solid ${message.color === '#b2ebf2' ? '#4dd0e1' : message.color === '#ffffff' ? '#e0e0e0' : '#ffee58'}`,
        }} />

        {/* Flap shadow line */}
        <div style={{
          position: 'absolute',
          top: '44px',
          left: '10px',
          right: '10px',
          height: '1px',
          background: 'rgba(0,0,0,0.1)',
        }} />

        {/* Mii face for special envelopes */}
        {message.special && (
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            width: '36px',
            height: '36px',
            background: '#4dd0e1',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            border: '2px solid #fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}>
            {message.mii}
          </div>
        )}

        {/* Stamp for special envelopes */}
        {message.special && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '6px',
            width: '32px',
            height: '38px',
            background: '#fff',
            border: '2px dashed #ccc',
            transform: 'rotate(8deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}>
            📸
          </div>
        )}

        {/* From name */}
        <div style={{
          position: 'absolute',
          bottom: message.special ? '8px' : '12px',
          left: message.special ? '50px' : '12px',
          fontFamily: "'Caveat', cursive",
          fontSize: '18px',
          color: '#37474f',
        }}>
          {message.from}
        </div>
      </div>
    </div>
  );
}

function OpenedPostcard({ message, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'msgFadeIn 0.3s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '450px',
          background: 'linear-gradient(145deg, #fffef5 0%, #f8f3e3 100%)',
          borderRadius: '12px',
          padding: '0',
          position: 'relative',
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
          animation: 'msgSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header stripe */}
        <div style={{
          height: '6px',
          background: 'repeating-linear-gradient(90deg, #e53935 0px, #e53935 20px, #fff 20px, #fff 40px)',
        }} />

        <div style={{ padding: '30px' }}>
          {/* From section */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '1px dashed #ddd',
          }}>
            {message.special && (
              <div style={{
                width: '50px',
                height: '50px',
                background: '#4dd0e1',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                marginRight: '15px',
                border: '3px solid #fff',
                boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
              }}>
                {message.mii}
              </div>
            )}
            <div>
              <div style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: '12px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>
                From
              </div>
              <div style={{
                fontFamily: "'Caveat', cursive",
                fontSize: '28px',
                color: '#37474f',
              }}>
                {message.from}
              </div>
            </div>

            {/* Stamp */}
            <div style={{
              marginLeft: 'auto',
              width: '55px',
              height: '65px',
              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
              border: '3px solid #fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(5deg)',
            }}>
              <span style={{ fontSize: '24px' }}>✉️</span>
              <span style={{ fontSize: '8px', color: '#666', marginTop: '2px' }}>Wii Mail</span>
            </div>
          </div>

          {/* Message */}
          <div style={{
            fontFamily: "'Caveat', cursive",
            fontSize: '24px',
            color: '#37474f',
            lineHeight: '1.6',
            minHeight: '120px',
          }}>
            {message.message}
          </div>

          {/* Close hint */}
          <div style={{
            textAlign: 'center',
            marginTop: '25px',
            paddingTop: '15px',
            borderTop: '1px dashed #ddd',
            fontFamily: "'Nunito', sans-serif",
            fontSize: '13px',
            color: '#aaa',
          }}>
            Click anywhere to close
          </div>
        </div>

        {/* Footer stripe */}
        <div style={{
          height: '6px',
          background: 'repeating-linear-gradient(90deg, #e53935 0px, #e53935 20px, #fff 20px, #fff 40px)',
        }} />
      </div>
    </div>
  );
}

export default function WiiMessageBoard({ visible, onBack }) {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div className={`message-board-screen${visible ? ' visible' : ''}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Nunito:wght@400;600;700&display=swap');

        @keyframes msgFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes msgSlideUp {
          from {
            opacity: 0;
            transform: translateY(50px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      <div className="board-texture" />

      <div className="board-title">Message Board</div>

      {/* Envelopes */}
      {messages.map((msg) => (
        <Envelope
          key={msg.id}
          message={msg}
          isSelected={hoveredId === msg.id}
          onClick={() => setSelectedMessage(msg)}
        />
      ))}

      {/* Navigation Arrows */}
      <button className="wii-arrow-btn board-arrow-left" />
      <button className="wii-arrow-btn wii-arrow-btn-right board-arrow-right" />

      {/* Bottom Bar */}
      <div className="wii-bottom-bar">
        <div className="wii-bottom-bar-lateral left">
          <div className="wii-left-btn-bg" />
          <img
            src="/assets/settings-icon.png"
            className="wii-corner-btn left"
            alt="Back"
            onClick={onBack}
          />
        </div>
        <div className="wii-bottom-bar-center" />
        <div className="wii-bottom-bar-lateral right">
          <div className="wii-right-btn-bg" />
        </div>
      </div>

      {/* Opened Postcard Modal */}
      {selectedMessage && (
        <OpenedPostcard
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </div>
  );
}
