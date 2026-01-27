export default function SafetyScreen({ visible, fadeOut, onDismiss }) {
  const classes = [
    'safety-screen',
    'wii-bg-authentic',
    visible ? 'visible' : '',
    fadeOut ? 'fade-out' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <div className="safety-dialog">
        <div className="safety-header" />
        <div className="safety-body">
          <div className="safety-icon" />
          <h1 className="safety-title">Health and Safety Precautions</h1>
          <p className="safety-text">
            Before playing, read the Health and Safety Precautions Booklet for
            important information about your health and safety.
          </p>
          <hr className="safety-divider" />
          <p className="safety-text">
            To see the Health and Safety Precautions Booklet again, go to the
            Wii Settings menu.
          </p>
          <hr className="safety-divider" />
          <p className="safety-small">
            Press <strong>A</strong> to continue.
          </p>
        </div>
        <div className="safety-footer">
          <button className="safety-btn" onClick={onDismiss}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
