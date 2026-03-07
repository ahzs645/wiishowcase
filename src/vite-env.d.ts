/// <reference types="vite/client" />

declare const __LAN_HOST__: string;

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}

declare module '*.wav' {
  const src: string;
  export default src;
}

declare module '@firstform/wii-channel-renderer/bundle-loader' {
  export function loadRendererBundle(buffer: ArrayBuffer): Promise<unknown>;
}

declare module '@firstform/wii-channel-renderer/bundle-renderer' {
  export function createRendererFromBundle(
    canvas: HTMLCanvasElement,
    bundle: unknown,
    target: string,
    settings?: Record<string, unknown>,
  ): { renderer: ChannelRenderer; layout?: unknown };

  export interface ChannelRenderer {
    play(): void;
    stop(): void;
    dispose(): void;
    renderFrame(frame: number): void;
    onFrame?: (() => void) | null;
  }
}

declare module 'miicreator/primitives' {
  export function configurePrimitives(opts: { fflResourceUrl: string }): void;
  export function parseMii(buffer: Uint8Array): Promise<unknown>;
  export function renderMiiFlatImage(
    mii: unknown,
    opts?: { preset?: string },
  ): Promise<Blob>;
  export const FFLResHighUrl: string;
}

// CDN ESM modules
declare module 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm' {
  const JSZip: {
    loadAsync(data: ArrayBuffer): Promise<{
      file(name: string): {
        async(type: 'string'): Promise<string>;
        async(type: 'arraybuffer'): Promise<ArrayBuffer>;
      } | null;
    }>;
  };
  export default JSZip;
}

interface WiiCalendarInstance {
  toggle(): void;
  getYear(): number;
  getMonth(): number;
}

interface WiiCalendarElement extends HTMLDivElement {
  __wiiCalendar?: WiiCalendarInstance;
}

interface Window {
  WiiCalendar?: {
    init(el: HTMLElement): void;
  };
}
