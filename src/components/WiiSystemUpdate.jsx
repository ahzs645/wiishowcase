import { useState, useEffect } from 'react';

/**
 * WiiSystemUpdate — Wii-style system update dialog.
 *
 * Opens in one of two modes:
 * - 'prompt': the background checker found a new build; ask update now/later
 * - 'checking': manual check from Wii Settings → "Wii System Update"
 *
 * Stages: checking → prompt|latest, prompt → updating → complete → reload.
 * The "update" is really just a cache-busting reload — the progress bar is
 * theater to match the console's update screen.
 */
const UPDATE_FILL_MS = 3600;

export default function WiiSystemUpdate({ mode, updateInfo, onCheck, onClose, play }) {
  const [stage, setStage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [info, setInfo] = useState(null);

  // Reset the flow each time the dialog opens
  useEffect(() => {
    if (!mode) {
      setStage(null);
      return;
    }
    setProgress(0);
    if (mode === 'prompt') {
      setInfo(updateInfo);
      setStage('prompt');
    } else {
      setStage('checking');
    }
    // updateInfo is only read at open time on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Manual check (from Wii Settings)
  useEffect(() => {
    if (stage !== 'checking') return;
    let cancelled = false;
    (async () => {
      const [result] = await Promise.all([
        onCheck(),
        // Let the "connecting" screen breathe like the real console
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
      if (cancelled) return;
      if (result?.hasUpdate) {
        setInfo(result);
        setStage('prompt');
      } else {
        setStage('latest');
      }
    })();
    return () => { cancelled = true; };
  }, [stage, onCheck]);

  // Fake download progress, then completion
  useEffect(() => {
    if (stage !== 'updating') return;
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const pct = Math.min(100, ((now - start) / UPDATE_FILL_MS) * 100);
      setProgress(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
      else setStage('complete');
    });
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  if (!mode || !stage) return null;

  const startUpdate = () => {
    play('select');
    setStage('updating');
  };

  const finishUpdate = () => {
    play('select');
    info?.onReload();
  };

  const dismiss = () => {
    play('back');
    onClose();
  };

  return (
    <div className="system-update-overlay">
      <div className="system-update-dialog">
        <div className="system-update-title">Wii System Update</div>

        {stage === 'checking' && (
          <div className="system-update-body">
            <p className="system-update-text">Connecting. Please wait a moment...</p>
            <div className="system-update-spinner" aria-hidden="true" />
          </div>
        )}

        {stage === 'latest' && (
          <div className="system-update-body">
            <p className="system-update-text">
              There is no need to update. Your Wii is already up to date.
            </p>
            <div className="system-update-buttons">
              <button className="wii-btn-start wii-btn-start-md" type="button" onClick={dismiss}>
                <div className="wii-btn-start-highlight-sharp" />
                <span>OK</span>
              </button>
            </div>
          </div>
        )}

        {stage === 'prompt' && (
          <div className="system-update-body">
            <p className="system-update-text">
              A Wii system update is available.
              <br />
              Would you like to update now?
            </p>
            {info?.buildNumber && (
              <p className="system-update-version">Ver. {info.buildNumber}</p>
            )}
            <div className="system-update-buttons">
              <button className="wii-btn-start wii-btn-start-md" type="button" onClick={dismiss}>
                <div className="wii-btn-start-highlight-sharp" />
                <span>Later</span>
              </button>
              <button className="wii-btn-start wii-btn-start-md" type="button" onClick={startUpdate}>
                <div className="wii-btn-start-highlight-sharp" />
                <span>Yes</span>
              </button>
            </div>
          </div>
        )}

        {stage === 'updating' && (
          <div className="system-update-body">
            <p className="system-update-text">
              Updating. Do not turn the power off while updating.
            </p>
            <div className="system-update-progress">
              <div className="system-update-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {stage === 'complete' && (
          <div className="system-update-body">
            <p className="system-update-text">
              The Wii system update is complete.
              <br />
              The Wii console will now restart.
            </p>
            <div className="system-update-buttons">
              <button className="wii-btn-start wii-btn-start-md" type="button" onClick={finishUpdate}>
                <div className="wii-btn-start-highlight-sharp" />
                <span>OK</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
