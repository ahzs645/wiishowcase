# Supplied Wii interface assets and shared Wii.css controls

[Current menu comparisons](interface-assets/) include both aspect ratios at
480 and 720 lines. The [catalog](interface-assets/catalog.html) reviews all
27 supplied files and every one of their 45 Illustrator/PDF artboards, with
input hashes, exact existing Wii.css matches, export provenance and eight live
font specimens. The [replacement map](interface-assets/replacement-map.json)
records both successful replacements and elements without a matching asset.

## Shared ownership

Reusable artwork and visual states live in Wii.css's `assets/interface/` and
`src/_system-controls.scss`, with a documented example in its Settings docs.
The showcase's `WiiButton` and `WiiTile` adapters add application events and one
feedback adapter. `SystemArt` and `MessageArt` reference those shared exports;
they no longer maintain parallel drawings of the same supplied elements.
Frame coordinates remain in `src/layout/system.js` / `src/layout/menu.js`.
`src/interface-assets.css` fits the shared components into those coordinates.

Supplied Data/Settings/Wii/GameCube tile surfaces retain their original pixels
inside SVG viewports; labels remain live text. Source padding is excluded.
Supplied Memo, envelope and Address Book artwork replaces the old choice
drawings. Paper surfaces are shared, with the old opaque composer layers
removed. Envelope exports remove only their full-canvas presentation rectangles;
their paths, gradients, clipping and shadows remain. The HOME remote uses the
supplied vector drawing, volume/arrow controls use the shared supplied sprites,
and SD return uses the supplied Wii orb. Wii logo/mail/pin files that match the
framework exactly are reused.

An Illustrator extension is not a vector-quality guarantee: most of the artboard
references contain embedded raster images. The importer extracts the image and
its existing alpha mask, converts CMYK to sRGB where necessary, and never
presents those exports as recovered vector drawings. Both blank artboards,
the partial standalone button reference and incomplete glyph fragments remain
explicitly cataloged rather than invented as complete replacements.

## Fonts

The eight uploaded OTF files exactly match the local Wii.css fonts. The user
confirmed licensed embedding on this public site on 15 October 2026. The site
ships small WOFF2 Latin/UI-symbol subsets under `public/fonts/licensed/`; they
remain outside the generic Wii.css distribution and MIT license.

NewRodin DB/EB supplies system labels. Rodin Medium supplies date/time numbers,
calendar lettering and HOME action labels. Rodin Bold supplies the Wii Menu
date/AM/PM labels. The remaining supplied weights are available in the font
catalog. Original glyph paths and advances are preserved; Latin line metrics
omit the unused CJK gap. Other scripts use browser fallback.

Visual review caught number fields clipping the wider NewRodin numerals, even
though the input rectangles fit. Numeric fields now use the supplied Rodin
Medium face and a fitted year column. Separate tests measure complete values
against each input's usable width and inspect the actual Chromium platform
fonts, rather than trusting requested CSS font names.

## Calendar

The three supplied calendar screenshots are recreated references with dated
content, not independently established native Wii screenshots. The
[calendar comparisons](interface-assets/calendar-comparisons.html) retain their
aspect/crop and compare them with February, March and May 2026 from the actual
interactive Wii.css calendar at all four application sizes.

The showcase's frame scale now controls the calendar without a second auto-fit
step. The Back action uses the shared control inside the calendar footer;
the oversized external track/capsule was removed. Month rows, date selection,
highlighting and Back remain live. No fixed screenshot replaces those controls.

## Retained elements and limits

Existing Wii.css channel cards, keyboard, track controls, icons and calendar
remain the reusable primitives. The Shop input/sound policy stays intact.
Native WAD-rendered banners/icons and channel applications are not replaced
with static artwork. There is no matching supplied game-save artwork,
individual contact silhouette or hardware-state diagram; those placeholders
and browser adapters remain identified in the map. A closed Address Book cover
is not substituted for its open interactive page. Exact native layout,
firmware/region differences and low-resolution artwork remain separate from
having the supplied fonts and artwork. Backend hosting remains deferred.

## Reproduce

```sh
python scripts/import-interface-assets.py <extracted-upload-root>
python scripts/subset-licensed-interface-fonts.py <licensed-font-source-folder>
npm run build
SYSTEM_SIZING=1 SYSTEM_ARTIFACTS=<scratch-core> node scripts/test-system-interface.mjs
OTHER_MENU_ARTIFACTS=docs/interface-assets OTHER_MENU_CORE_SOURCE=<scratch-core> node scripts/capture-other-menu-core.mjs
OTHER_MENU_ARTIFACTS=docs/interface-assets node scripts/capture-other-menus.mjs
```

The source importer expects `svg/`, `illustrator/`, `fonts/` and `button/`
subdirectories from the four uploaded files. It exports shared artwork to
Wii.css; generated site font files and comparison evidence stay in this repo.
FontTools requires Brotli for WOFF2. Do not assume a clone grants a downstream
font license.

With a Vite dev server on 4955, run the supplied-art/font checks, system-menu
interaction checks, HOME capture, keyboard-focus checks, SD fixture and supplied
calendar capture. Avoid changing source files while dev-server capture tests
run. The SD fixture imports the live state-module URL to avoid creating a second
state singleton after Vite HMR.

`npm run build:interface-assets` builds the catalog, source-linked viewer and
overview. The static site packages them with the usual build. Raw reports live
beside the viewer; source crop/state and browser substitutions remain visible.

## Verification for this pass

- 66 system states / 264 captures at both aspects and 480/720 lines: no
  recorded control bounds, text or center-hit failures.
- 84 broad system interactions, 96 additional interactions, 48 supplied-art/font
  checks, four HOME placement checks and eight keyboard-focus checks passed.
- Twelve live calendar pane captures and 28 month-row / Back checks passed.
- Eight SD full-slot fixture checks passed using isolated simulated inventory.
- All 528 main overlay combinations, twelve calendar viewer combinations,
  source/export images, filtering and eight actual font specimens passed.
- The Shop regression passed 53 keys at five sizes, sticky on-screen Shift,
  physical input, caret/focus, original images and audio options.
- Wii.css's full build passed. Its published `b6aaefb` package contains the
  shared module/assets and excludes fonts; `framework-validation.json` records
  the package hash and deployment.

Only the system/date fonts are preloaded by the app. The other supplied weights
load when used; the catalog deliberately loads all eight for comparison.
