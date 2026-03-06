/**
 * Shared Blank Channel Renderer
 *
 * Runs a single BannerRenderer for the blank channel icon.
 * Subscriber canvases receive a cheap drawImage() copy each frame
 * instead of running their own full render pipeline.
 */
import { loadRendererBundle } from '@firstform/wii-channel-renderer/bundle-loader';
import { createRendererFromBundle } from '@firstform/wii-channel-renderer/bundle-renderer';

const BASE = import.meta.env.BASE_URL;

let instance = null;

class SharedBlankRenderer {
  constructor() {
    this.subscribers = new Set();
    this.masterCanvas = null;
    this.renderer = null;
    this.ready = false;
    this.readyPromise = this._init();
  }

  async _init() {
    const res = await fetch(BASE + 'channels/blank.zip');
    const buf = await res.arrayBuffer();
    const bundle = await loadRendererBundle(buf);

    this.masterCanvas = document.createElement('canvas');

    const { renderer } = createRendererFromBundle(
      this.masterCanvas,
      bundle,
      'icon',
      { fps: 30, maxRenderFps: 60, subframePlayback: false },
    );

    this.renderer = renderer;
    renderer.onFrame = () => this._copyToAll();
    renderer.renderFrame(0);
    this.ready = true;

    // If subscribers joined before init finished, start playing
    if (this.subscribers.size > 0) {
      this._copyToAll();
      renderer.play();
    }
  }

  _copyToAll() {
    const src = this.masterCanvas;
    for (const { canvas, ctx } of this.subscribers) {
      ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    }
  }

  subscribe(canvas) {
    if (!canvas) return;

    if (this.ready) {
      canvas.width = this.masterCanvas.width;
      canvas.height = this.masterCanvas.height;
    }

    const ctx = canvas.getContext('2d');
    const entry = { canvas, ctx };
    this.subscribers.add(entry);

    // Copy current frame immediately so it's not blank
    if (this.ready) {
      ctx.drawImage(this.masterCanvas, 0, 0, canvas.width, canvas.height);
    }

    // Start the master if this is the first subscriber
    if (this.subscribers.size === 1 && this.renderer) {
      this.renderer.play();
    }

    return entry;
  }

  unsubscribe(entry) {
    this.subscribers.delete(entry);

    // Stop the master when nobody is watching
    if (this.subscribers.size === 0 && this.renderer) {
      this.renderer.stop();
    }
  }
}

export function getSharedBlankRenderer() {
  if (!instance) {
    instance = new SharedBlankRenderer();
  }
  return instance;
}
