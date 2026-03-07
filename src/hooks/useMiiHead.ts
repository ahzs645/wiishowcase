import { useEffect, useState } from 'react';

let primitivesPromise: Promise<{
  parseMii: (buffer: Uint8Array) => Promise<unknown>;
  renderMiiFlatImage: (mii: unknown, opts?: { preset?: string }) => Promise<Blob>;
}> | null = null;

function loadPrimitives() {
  if (!primitivesPromise) {
    primitivesPromise = (async () => {
      const { configurePrimitives, parseMii, renderMiiFlatImage, FFLResHighUrl } =
        await import('miicreator/primitives');
      configurePrimitives({ fflResourceUrl: FFLResHighUrl });
      return { parseMii, renderMiiFlatImage };
    })();
  }
  return primitivesPromise;
}

export default function useMiiHead(miiDataUrl: string | undefined, preset = 'head'): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!miiDataUrl) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(miiDataUrl);
        const buffer = new Uint8Array(await response.arrayBuffer());
        const { parseMii, renderMiiFlatImage } = await loadPrimitives();
        const mii = await parseMii(buffer);
        const blob = await renderMiiFlatImage(mii, { preset });
        if (cancelled) return;
        setSrc(URL.createObjectURL(blob));
      } catch (err) {
        console.error('Failed to render Mii head:', err);
      }
    })();

    return () => {
      cancelled = true;
      setSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [miiDataUrl]);

  return src;
}
