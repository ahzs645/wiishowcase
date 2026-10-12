import { ChannelApplicationAdapter, loadChannelApplicationBundle } from '@firstform/wii-channel-renderer';
import { setChannelPresentation, supportsChannelTitleLocale } from './channelPresentation';
const sessions = new Map(), resources = new Map(), subscribers = new Map(), menuInputs = new Map();
export const NATIVE_APPLICATION_PREVIEW = new URLSearchParams(window.location.search).get('nativeApps') === '1';
export function getApplicationSession(channel) {
  if (!sessions.has(channel)) {
    const adapter = new ChannelApplicationAdapter(channel);
    try { const stored = localStorage.getItem(`channel-application:${channel}`); if (stored) adapter.restoreSettings(JSON.parse(stored)); } catch { adapter.setInputs({ flags: { saveStatus: 'corrupt' } }); }
    menuInputs.set(channel, adapter.getMenuInputs());
    const publishMenu = inputs => {
      const { titleLocale, ...data } = inputs;
      const clean = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined))]));
      setChannelPresentation(channel, { inputs: clean });
      for (const target of ['banner', 'icon']) if (supportsChannelTitleLocale(channel, target, titleLocale)) setChannelPresentation(channel, { runtime: { [target]: { titleLocale } } });
    };
    publishMenu(menuInputs.get(channel));
    adapter.subscribe(() => {
      const next = adapter.getMenuInputs();
      if (JSON.stringify(menuInputs.get(channel)) === JSON.stringify(next)) return;
      menuInputs.set(channel, next);
      publishMenu(next);
      for (const callback of subscribers.get(channel) ?? []) callback();
    });
    sessions.set(channel, adapter);
  }
  return sessions.get(channel);
}
export function getApplicationMenuInputs(channel) { if (!channel) return null; getApplicationSession(channel); return menuInputs.get(channel); }
export function subscribeApplicationMenu(channel, callback) {
  if (!channel) return () => {};
  if (!subscribers.has(channel)) subscribers.set(channel, new Set());
  subscribers.get(channel).add(callback); return () => subscribers.get(channel).delete(callback);
}
export function fetchApplicationResources(channel) {
  if (!resources.has(channel)) resources.set(channel, loadChannelApplicationBundle(`${import.meta.env.BASE_URL}channel-applications/${channel}.zip`).catch(error => { resources.delete(channel); throw error; }));
  return resources.get(channel);
}
