// Dev-only stand-in for the `miicreator/primitives` entry point.
//
// `miicreator` is a `file:../miicreateor` dependency that isn't present in CI or
// on a fresh clone. Vite's dev server statically resolves the bare-specifier
// dynamic import in src/hooks/useMiiHead.js, so when the real package is missing
// it returns a 500 for that module (breaking the whole dev page). This stub lets
// the import resolve, then throws a descriptive error the moment the primitives
// are actually used — which the hook's existing try/catch turns into a graceful
// "Mii head unavailable" path, mirroring the production build where the same
// specifier is externalized.

const MESSAGE =
  'miicreator is not installed (the local ../miicreateor checkout is missing), ' +
  'so Mii-head rendering is disabled in this environment.';

export const FFLResHighUrl = '';

export function configurePrimitives() {
  throw new Error(MESSAGE);
}

export function parseMii() {
  throw new Error(MESSAGE);
}

export function renderMiiFlatImage() {
  throw new Error(MESSAGE);
}
