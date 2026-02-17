let jsZipPromise = null;

export function loadJSZip() {
  if (jsZipPromise) return jsZipPromise;
  jsZipPromise = import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm").then(
    (mod) => mod.default ?? mod,
  );
  return jsZipPromise;
}
