/**
 * Shared Blank Channel Renderer
 *
 * Runs a single BannerRenderer for the blank channel icon.
 * Subscriber canvases receive a cheap drawImage() copy each frame
 * instead of running their own full render pipeline.
 */
import { loadRendererBundle } from '@firstform/wii-channel-renderer/bundle-loader';
import { createRendererFromBundle, type ChannelRenderer } from '@firstform/wii-channel-renderer/bundle-renderer';

const BASE = import.meta.env.BASE_URL;

export interface SubscriberEntry {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

let instance: SharedBlankRenderer | null = null;

class SharedBlankRenderer {
  subscribers = new Set<SubscriberEntry>();
  masterCanvas: HTMLCanvasElement | null = null;
  renderer: ChannelRenderer | null = null;
  ready = false;
  readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = this._init();
  }

  private async _init(): Promise<void> {
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

    if (this.subscribers.size > 0) {
      this._copyToAll();
      renderer.play();
    }
  }

  private _copyToAll(): void {
    const src = this.masterCanvas!;
    for (const { canvas, ctx } of this.subscribers) {
      ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    }
  }

  subscribe(canvas: HTMLCanvasElement): SubscriberEntry | undefined {
    if (!canvas) return;

    if (this.ready && this.masterCanvas) {
      canvas.width = this.masterCanvas.width;
      canvas.height = this.masterCanvas.height;
    }

    const ctx = canvas.getContext('2d')!;
    const entry: SubscriberEntry = { canvas, ctx };
    this.subscribers.add(entry);

    if (this.ready && this.masterCanvas) {
      ctx.drawImage(this.masterCanvas, 0, 0, canvas.width, canvas.height);
    }

    if (this.subscribers.size === 1 && this.renderer) {
      this.renderer.play();
    }

    return entry;
  }

  unsubscribe(entry: SubscriberEntry): void {
    this.subscribers.delete(entry);

    if (this.subscribers.size === 0 && this.renderer) {
      this.renderer.stop();
    }
  }
}

export function getSharedBlankRenderer(): SharedBlankRenderer {
  if (!instance) {
    instance = new SharedBlankRenderer();
  }
  return instance;
}
