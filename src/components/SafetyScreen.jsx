export default function SafetyScreen({ visible, fadeOut, onDismiss }) {
  const classes = [
    'safety-screen',
    visible ? 'visible' : '',
    fadeOut ? 'fade-out' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} onClick={onDismiss}>
      <div className="safety-dialog">
        <div className="safety-body">
          <div className="safety-text">
            <h2 className="safety-title">
              <span className="safety-icon">&#9888;&nbsp;</span>
              WARNING-HEALTH AND SAFETY
            </h2>
            <p className="safety-desc">
              BEFORE PLAYING, READ YOUR OPERATIONS MANUAL
              FOR IMPORTANT INFORMATION ABOUT YOUR HEALTH
              AND SAFETY.
            </p>
            <p className="safety-bottom">
              Also online at<br />
              <a href="https://www.nintendo.com/healthsafety">www.nintendo.com/healthsafety</a>
            </p>
          </div>
          <span className="safety-prompt">Press left click to continue.</span>
        </div>
      </div>
    </div>
  );
}
