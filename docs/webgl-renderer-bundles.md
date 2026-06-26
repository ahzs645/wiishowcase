# WebGL Renderer Bundles

## Recommended Path

`wiishowcase` should use ahead-of-time renderer bundles, then render those bundles live with the WebGL backend when available.

The intended flow is:

1. Convert WADs ahead of time into renderer bundles, like `public/channels/shop.zip`.
2. At runtime, load the bundle with `loadRendererBundle()`.
3. Create the player with `createGlBannerRenderer()` when WebGL is supported and requested.
4. Fall back to `BannerRenderer` when WebGL is unavailable or a material feature is unsupported.

Do not pre-render whole animations to frame sequences or video by default. That increases storage and memory pressure, removes runtime flexibility, and does not let the renderer adapt to aspect ratio, locale, render state, playback settings, or future shader fixes. The bundle should remain parsed renderer data: `layout.json`, animations, decoded textures, fonts, and audio. The WebGL renderer then uploads textures once, warms shaders once, evaluates animation state per frame, and draws panes as GPU quads.

## Current App Shape

`wiishowcase` is already close to this architecture:

- `src/components/WiiChannelRenderer.jsx` loads `public/channels/*.zip` with `loadRendererBundle()`.
- It then calls `createRendererFromBundle()`.
- `wewad/packages/wii-channel-renderer/src/bundleRenderer.js` is the adapter that decides which renderer class to instantiate.

That adapter supports backend selection through `settings.rendererBackend`:

```js
const rendererBackend = settings.rendererBackend ?? "canvas";
```

The vendored `wewad` renderer package must contain `createGlBannerRenderer()` and `isWebGlSupported()` for that setting to work. When syncing from a separate renderer checkout, update the vendored package before expecting `wiishowcase` to use WebGL.

## Regenerating a Bundle

Use the headless exporter when a checked-in bundle may have drifted from the source WAD:

```sh
npm run export:channel-bundle -- \
  "/path/to/Channel.wad" \
  public/channels/shop.zip
```

For the Wii Shop Channel fixture used during development:

```sh
npm run export:channel-bundle -- \
  "/Users/ahmadjalil/Desktop/Wii Shop Channel (World) (v20) (Channel).wad" \
  public/channels/shop.zip
```

The exporter writes parsed renderer assets, decoded textures, audio, and animation entry metadata. It does not pre-render frames.

## Adapter Sketch

The bundle adapter builds one shared options object, then selects WebGL or Canvas:

```js
import { BannerRenderer } from "./wadRenderer/BannerRenderer.js";
import {
  createGlBannerRenderer,
  isWebGlSupported,
} from "./wadRenderer/glRenderer/createGlBannerRenderer.js";

const backend = settings.rendererBackend ?? "canvas";
const useWebGl =
  (backend === "webgl" || backend === "auto") &&
  isWebGlSupported();

const renderer = useWebGl
  ? createGlBannerRenderer(canvas, layout, startAnim ?? loopAnim, tplImages, options)
  : new BannerRenderer(canvas, layout, startAnim ?? loopAnim, tplImages, options);
```

Keep Canvas fallback available. The WebGL path can draw supported GX/TEV material signatures directly, but unsupported material features should continue through the tested Canvas pane cache rather than blocking playback.

## Channel Settings

`wiishowcase` can opt channels into WebGL through existing `rendererSettings`:

```js
rendererSettings: {
  banner: {
    rendererBackend: "webgl",
    tevQuality: "accurate",
  },
  icon: {
    rendererBackend: "auto",
  },
}
```

Use `rendererBackend: "webgl"` when a channel should require the GPU path and fail loudly if it cannot be created. Use `rendererBackend: "auto"` when the app should prefer WebGL but quietly fall back to Canvas.

The Wii Shop selected banner currently opts into WebGL:

```js
rendererSettings: {
  banner: { rendererBackend: "webgl", tevQuality: "accurate" },
}
```

## Bundle Compatibility

Static showcase channels should continue using prebuilt ZIP bundles. Existing renderer bundles already carry the material data WebGL needs when they include fields such as:

- `textureMaps`
- `textureSRTs`
- `tevStages`
- `tevColors`
- `tevSwapTable`
- `alphaCompare`
- `blendMode`

For example, `public/channels/shop.zip` includes explicit TEV material fields, so it should not need reconversion just to use WebGL. Regenerate bundles only if an older export stripped material or texture binding fields.

## Sync Requirement

`wiishowcase` vendors WeWAD under `wewad/`. If WebGL work is developed in a separate checkout, such as `/Users/ahmadjalil/github/wewad`, sync that renderer package into `/Users/ahmadjalil/github/wiishowcase/wewad` before expecting the app to use the new backend.
