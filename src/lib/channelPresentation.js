import { prepareChannelPresentation, validateChannelPresentation } from '@firstform/wii-channel-renderer';

const snapshots = new Map(), renderers = new Map();
export const CHANNEL_PRESENTATION_PREVIEW = new URLSearchParams(window.location.search).get('channelPreview') === '1';

export function getChannelPresentation(channel, target) {
  const snapshot = snapshots.get(channel);
  return snapshot ? structuredClone({ inputs: snapshot.inputs, runtime: snapshot.runtime[target] ?? {} }) : null;
}

export function supportsChannelTitleLocale(channel, target, locale) {
  const mounted = [...(renderers.get(channel) ?? [])].filter(([, scene]) => scene === target);
  return mounted.length > 0 && mounted.every(([renderer]) => renderer.availableTitleLocales.has(locale));
}

/** Data replaces supplied snapshots; runtime pane controls merge per target. */
export function setChannelPresentation(channel, update) {
  if (typeof channel !== 'string' || !/^[a-z0-9-]+$/.test(channel)) throw new Error('Invalid channel ID');
  if (!update || typeof update !== 'object' || Array.isArray(update)) throw new Error('Presentation must be an object');
  for (const key of Object.keys(update)) if (!['inputs', 'runtime'].includes(key)) throw new Error(`Unknown presentation field: ${key}`);
  const previous = snapshots.get(channel) ?? { inputs: {}, runtime: {} };
  const inputs = update.inputs === undefined ? previous.inputs : { ...previous.inputs, ...validateChannelPresentation({ inputs: update.inputs }).inputs };
  const runtime = { ...previous.runtime };
  if (update.runtime !== undefined) {
    if (!update.runtime || typeof update.runtime !== 'object' || Array.isArray(update.runtime)) throw new Error('runtime must contain banner/icon controls');
    for (const [target, controls] of Object.entries(update.runtime)) {
      if (!['banner', 'icon'].includes(target)) throw new Error(`Unknown target: ${target}`);
      validateChannelPresentation({ runtime: controls });
      runtime[target] = { ...runtime[target], ...controls };
      for (const key of ['paneStates', 'paneVisibility']) if (controls[key]) runtime[target][key] = { ...previous.runtime[target]?.[key], ...controls[key] };
    }
  }
  const next = structuredClone({ inputs, runtime }), pending = [];
  // Validate every mounted target before changing the store or any renderer.
  for (const [renderer, target] of renderers.get(channel) ?? []) pending.push([renderer, prepareChannelPresentation(renderer, { inputs: next.inputs, runtime: next.runtime[target] ?? {} })]);
  snapshots.set(channel, next);
  for (const [renderer, prepared] of pending) { Object.assign(renderer, prepared); renderer.setChannelInputs({}); }
}

export function attachChannelPresentation(channel, target, renderer) {
  const snapshot = getChannelPresentation(channel, target);
  if (snapshot) { Object.assign(renderer, prepareChannelPresentation(renderer, snapshot)); renderer.setChannelInputs({}); }
  if (!renderers.has(channel)) renderers.set(channel, new Map());
  renderers.get(channel).set(renderer, target);
  return () => { const group = renderers.get(channel); group?.delete(renderer); if (!group?.size) renderers.delete(channel); };
}

// Host/provider bridge works without opening an application or fetching its ZIP.
window.addEventListener('wii:channel-presentation', event => {
  try { setChannelPresentation(event.detail?.channel, event.detail?.presentation); }
  catch (error) { window.dispatchEvent(new CustomEvent('wii:channel-presentation-error', { detail: { channel: event.detail?.channel, message: error.message } })); }
});
