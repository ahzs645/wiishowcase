# Wii Options and Data Management sizing

[Open the comparisons](storage-menu-refinement/?interface=options&mode=4%3A3&height=480)
for native / before / after images, opacity and difference overlays at 640×480,
854×480, 960×720 and 1280×720. Before images preserve commit `75c61ab`.

This pass gives Options and storage a dedicated layout contract in
`src/layout/system.js`. It fits wider tiles at their lower native anchor,
replaces the strong striped tile surface with a graduated surface, wraps the
GameCube label, and reconstructs a more compact memory-card silhouette. Compact
icon breadcrumbs replace oversized title bars. The smaller storage header moves
the fifteen-slot grid up; independent slot and row/column sizes fill the native
area. The taller footer has a shorter Back control and larger storage status.
These controls retain keyboard focus/activation and click feedback.

The four original Nintendo manual sources (`manual-316`, `manual-315`,
`manual-312`, `manual-314`) are only 131–164 pixels wide. They support structure
and approximate anchors, with about 4–8 logical pixels of edge uncertainty after
enlargement. Firmware and exact glyph bounds cannot be recovered from them.
The comparison preserves their aspect rather than stretching them to wide mode.
**16:9 remains a centered content adaptation pending a native wide storage source.**
GameCube, Channels, alternate storage and item dialogs label related views/states
explicitly. No native pixel-accuracy score is assigned. Font glyphs, SVG icons,
button surfaces and browser substitutes remain approximations.

Verification includes 44 actual application captures across eleven states,
with visible bounds, text and center-hit checks. It exercises keyboard tile
activation, both storage tabs, both GameCube slots, copy cancellation without
inventory mutation, local Escape, Back navigation and exclusion of Disc from
channel storage. Raw geometry, font metrics, source tolerances and results are
in [validation.json](storage-menu-refinement/validation.json). Each browser
context has isolated test storage. This pass does not need or deploy a backend;
automatic Internet pairing hosting remains deferred.

The broader system regression passed 84 interaction checks and 120 geometry
cases without JavaScript errors or missing production assets. Its
[recorded scope](storage-menu-refinement/system-regression.json) distinguishes
that regression from the final footer-status paint-order check. Independent
[source-pixel measurements](storage-menu-refinement/native-measurements.json)
record the original manual dimensions, converted PNG hashes, cyan tile bounds
and lower divider rows separately from the runtime registry.

Reproduce after a production build:

```sh
npm run capture:storage-refinement
npm run build:storage-refinement
npm run build:layout
```

Run `python scripts/measure-storage-native.py` to reproduce the independent
source measurements and `npm run test:storage-refinement-viewer` with the docs
served at port 4957 to verify every overlay combination.

The focused viewer is packaged with the existing static deployment. Older
system-menu comparisons remain available; the maintained screen index directs
these storage states to their newer captures.
