import { useEffect, useRef, useState } from 'react';
import { ChannelApplicationRenderer, getExampleChannelApplicationInputs } from '@firstform/wii-channel-renderer';
import { fetchApplicationResources, getApplicationSession } from '../lib/nativeChannelApplications';

export default function WiiNativeApplication({ channel, onBack }) {
  const canvasRef = useRef(null), rendererRef = useRef(null), fileRef = useRef(null);
  const adapter = getApplicationSession(channel);
  const [resources, setResources] = useState(null), [state, setState] = useState(adapter.getState()), [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    fetchApplicationResources(channel).then(resources => { if (!cancelled) setResources(resources); }).catch(error => { if (!cancelled) setError(error.message); });
    return () => { cancelled = true; };
  }, [channel]);
  useEffect(() => adapter.subscribe(setState), [adapter]);
  useEffect(() => {
    if (!resources || !canvasRef.current) return;
    const renderer = new ChannelApplicationRenderer(canvasRef.current, resources, adapter, { onExit: onBack });
    rendererRef.current = renderer; canvasRef.current.applicationAdapter = adapter; canvasRef.current.applicationRenderer = renderer;
    return () => { renderer.dispose(); rendererRef.current = null; };
  }, [resources, adapter, onBack]);
  const send = event => { try { adapter.dispatch(event); setError(''); } catch (error) { setError(error.message); } };
  return <section className="native-application-screen" data-native-application={channel}>
    <div className="native-application-toolbar">
      <button onClick={onBack}>Wii Menu</button>
      <button onClick={() => { adapter.setInputs(getExampleChannelApplicationInputs(channel)); setError(''); }}>Load example data</button>
      <button onClick={() => fileRef.current?.click()}>Load data snapshot</button>
      <input hidden ref={fileRef} type="file" accept="application/json,.json" onChange={async event => { try { const file = event.target.files?.[0]; if (file) adapter.setInputs(JSON.parse(await file.text())); setError(''); } catch (error) { setError(error.message); } }}/>
      <button onClick={() => send({ type: 'back' })}>Back</button>
      <button onClick={() => send({ type: 'previous' })}>Previous</button>
      <button onClick={() => send({ type: 'next' })}>Next</button>
      <button onClick={async () => { try { await adapter.saveSettings(settings => localStorage.setItem(`channel-application:${channel}`, JSON.stringify(settings))); setError(''); } catch (error) { setError(error.message); } }}>Save settings</button>
      <select aria-label="Native application view" value={state.navigation.view} onChange={event => send({ type: 'view', view: event.target.value })}>{adapter.getCapabilities().views.map(view => <option key={view}>{view}</option>)}</select>
    </div>
    {!resources && !error ? <p>Loading channel application…</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {resources ? <canvas ref={canvasRef} width="608" height="456"/> : null}
    <p className="native-application-note">Application adapter preview. Example data is not live; the globe uses a host marker projection.</p>
  </section>;
}
