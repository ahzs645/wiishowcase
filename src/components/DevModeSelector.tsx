import './DevModeSelector.css';
import type { Screen } from '../store/appSlice';

const SCREEN_LABELS: Record<string, string> = {
  black: 'Startup Black',
  safety: 'Safety Screen',
  menu: 'Wii Menu',
  settings: 'Settings',
  messageboard: 'Message Board',
  'channel-select': 'Channel Select',
  news: 'News Channel',
};

interface DevModeSelectorProps {
  screens: readonly Screen[];
  currentScreen: Screen;
  onSelectScreen: (screen: Screen) => void;
  onClose: () => void;
}

export default function DevModeSelector({ screens, currentScreen, onSelectScreen, onClose }: DevModeSelectorProps) {
  return (
    <div className="dev-mode-selector">
      <div className="dev-mode-header">
        <span className="dev-mode-title">Dev Mode</span>
        <button className="dev-mode-close" onClick={onClose}>
          &times;
        </button>
      </div>
      <div className="dev-mode-hint">Press ` to toggle | 1-{screens.length} to switch</div>
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
