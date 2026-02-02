import './DevModeSelector.css';

const SCREEN_LABELS = {
  black: 'Startup Black',
  safety: 'Safety Screen',
  menu: 'Wii Menu',
  messageboard: 'Message Board',
};

export default function DevModeSelector({ screens, currentScreen, onSelectScreen, onClose }) {
  return (
    <div className="dev-mode-selector">
      <div className="dev-mode-header">
        <span className="dev-mode-title">Dev Mode</span>
        <button className="dev-mode-close" onClick={onClose}>
          &times;
        </button>
      </div>
      <div className="dev-mode-hint">Press ` to toggle | 1-4 to switch</div>
      <div className="dev-mode-screens">
        {screens.map((screen, index) => (
          <button
            key={screen}
            className={`dev-mode-screen-btn ${currentScreen === screen ? 'active' : ''}`}
            onClick={() => onSelectScreen(screen)}
          >
            <span className="screen-number">{index + 1}</span>
            <span className="screen-name">{SCREEN_LABELS[screen] || screen}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
