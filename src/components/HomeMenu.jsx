/**
 * HomeMenu — Wii HOME Menu overlay.
 * Triggered by Ctrl+H. Recreates the real Wii HOME Menu with:
 * - Top bar sliding from top (title + close button)
 * - Bottom bar sliding from bottom (battery indicators + settings text)
 * - Center area with "Wii Menu" and "Reset" pill buttons
 * - Wii Remote SVG on bottom-left
 */
export default function HomeMenu({
  visible,
  onClose,
  onWiiMenu,
  onReset,
  controllers,
  connectedCount,
}) {
  if (!visible) return null;

  return (
    <div className="home-menu-overlay" onClick={onClose}>
      <div className="home-menu-container" onClick={(e) => e.stopPropagation()}>

        {/* Top Bar */}
        <div className="home-menu-top-bar">
          <div className="home-menu-top-bar-inner">
            <span className="home-menu-title">HOME Menu</span>
            <button className="home-menu-close-btn" onClick={onClose}>
              <span className="home-menu-close-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
              </span>
              Close
            </button>
          </div>
        </div>

        {/* Center Content */}
        <div className="home-menu-center">
          {/* Wii Remote on the left */}
          <div className="home-menu-remote">
            <span className="wii-icon wii-icon-remote" />
          </div>

          {/* Two pill buttons */}
          <div className="home-menu-buttons">
            <button
              className="wii-btn-start wii-btn-start-md"
              type="button"
              onClick={onWiiMenu}
            >
              <div className="wii-btn-start-highlight-sharp" />
              <span>Wii Menu</span>
            </button>
            <button
              className="wii-btn-start wii-btn-start-md"
              type="button"
              onClick={onReset}
            >
              <div className="wii-btn-start-highlight-sharp" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="home-menu-bottom-bar">
          <div className="home-menu-bottom-bar-inner">
            <div className="home-menu-battery-row">
              {[1, 2, 3, 4].map((playerNum) => {
                // P1 is always the local host; P2-P4 are remote companions
                const isConnected = playerNum === 1 || controllers[playerNum - 2]?.state === 'connected';
                return (
                  <div key={playerNum} className={`home-menu-battery${isConnected ? ' connected' : ''}`}>
                    <span className="home-menu-battery-label">P{playerNum}</span>
                    <div className="home-menu-battery-indicator">
                      {[0, 1, 2, 3].map((seg) => (
                        <div
                          key={seg}
                          className={`home-menu-battery-seg${isConnected ? ' filled' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="home-menu-settings-text">Wii Remote Settings</span>
          </div>
        </div>

      </div>
    </div>
  );
}
