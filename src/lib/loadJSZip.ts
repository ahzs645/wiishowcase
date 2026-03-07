export interface JSZipStatic {
  loadAsync(data: ArrayBuffer): Promise<JSZipObject>;
}

export interface JSZipObject {
  file(name: string): JSZipEntry | null;
}

export interface JSZipEntry {
  async(type: 'string'): Promise<string>;
  async(type: 'arraybuffer'): Promise<ArrayBuffer>;
}

let jsZipPromise: Promise<JSZipStatic> | null = null;

export function loadJSZip(): Promise<JSZipStatic> {
  if (jsZipPromise) return jsZipPromise;
  jsZipPromise = import(
    /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm'
  ).then((mod) => (mod.default ?? mod) as JSZipStatic);
  return jsZipPromise;
}
