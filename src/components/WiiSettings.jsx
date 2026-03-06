const SETTINGS_SECTIONS = [
  {
    id: 'data',
    label: 'Data Management',
    iconClass: 'wii-settings-navbtn-icon--data',
    ringClass: 'wii-settings-navbtn--ring-blue',
  },
  { id: 'settings', label: 'Wii Settings', iconClass: 'wii-settings-navbtn-icon--settings' },
];

export default function WiiSettings({ visible, onBack }) {
  if (!visible) return null;

  return (
    <div className="wii-settings-screen">
      <section
        id="settings"
        className="wii-settings wii-settings-screen-shell"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <div className="wii-settings-header wii-animate"></div>

        <div className="wii-settings-line"></div>

        <div className="wii-settings-screen-center">
          <div className="wii-settings-stripes"></div>
          <div className="wii-settings-content">
            <div className="wii-settings-nav wii-animate">
              {SETTINGS_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  className={`wii-settings-navbtn${section.ringClass ? ` ${section.ringClass}` : ''}`}
                  aria-label={section.label}
                  type="button"
                >
                  <span className={`wii-settings-navbtn-icon ${section.iconClass}`}></span>
                  <span className="wii-settings-navbtn-label">{section.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="wii-settings-line"></div>

        <div className="wii-settings-footer wii-animate">
          <button className="wii-settings-back wii-settings-screen-back" onClick={onBack} type="button">
            <span className="wii-settings-back-arrow" aria-hidden="true"></span>
            <span className="wii-settings-back-label">Back</span>
          </button>
        </div>
      </section>
    </div>
  );
}
