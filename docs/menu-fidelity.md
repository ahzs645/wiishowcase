# Wii Menu reference alignment

The earlier sizing checks established that controls fitted and worked. They did
not establish that the menu matched the Wii capture. The previous menu still had
smaller visible cards, separated full-width pages, coarse background stripes,
a shallow 4:3 curve, undersized footer circles and a different LCD digit style.

[Matched-state overlay viewer](menu-fidelity/?mode=4%3A3&height=480) ·
[4:3 comparison](menu-fidelity/menu-43-comparison.png) ·
[wide comparison](menu-fidelity/menu-wide-comparison.png) ·
[version-aware independent sources](menu-versions/).

The previous implementation is preserved at **3e96806**. Before and corrected
captures use the same viewport, instant (**17:06 / Friday 1 March**), channel
inventory and native icon frames. The current US profile renders that instant as
**5:06 PM**. The U profile uses unpadded month/day; the 24-hour reference has a
different regional format. The Mii logo
appears late in its animation: its alpha keys fade it in at frames 380–410.
Comparison captures use frame 430, while Photo/Shop use frame 180 and Disc uses
frame 0. Live playback remains animated. One local unread memo supplies the
reference-style unread badge; reading it clears the badge.

## What changed

- 4:3 card boxes are 128×96 logical units, with 6-unit gaps and a 37-unit top
  inset. The mask's margins are accounted for when aligning the visible border.
  Wide boxes are 176 units across. An independent source comparison reduced the
  wide gap to 4 units and removed the inherited 4:3 inset correction. Borders
  are thinner.
- Pages form a continuous grid. Their stride follows four column pitches,
  rather than a whole viewport, exposing the adjacent column at the screen edge.
  Paging, manual scrolling, resizing and reordering use that measured stride.
- A menu-specific 51-line curve keeps the same depth in both modes. Its clipping
  path and static border share one geometry; animated icon canvases use no filter.
- Background lines follow the 480-line scale, replacing the coarse fixed-size
  bands. Footer circles use measured positions; the later wide correction
  lowers the wide footer six units to align it with the independent references.
- The clock uses recreated upright seven-segment shapes with round colon dots
  and finer vertical strokes. The US profile has a separate AM/PM label. The date
  uses a small bundled M PLUS 1p Bold subset at 32 logical units; original Rodin
  shapes still differ. [Typography evidence](menu-typography.md).
- The SD shortcut has card artwork instead of a large text label. Mail shows a
  real local unread count. Idle move/page helpers no longer occupy the normal
  footer; Move channels appears on hover/focus and while moving, and the page
  indicator remains available to assistive technology.

Forced display modes now produce a true 4:3 or 16:9 frame. The inherited
`min-height: 100vh` used to override the requested letterboxed height, and
`100vw`/`100vh` menu dimensions ignored a narrower Wii frame. The root minimum
is removed and the menu sizes to its parent. Checks assert the actual frame
ratio and matching menu bounds.

A navigation test also exposed a timing race: scroll settling could revert the
selected page midway through an arrow-initiated animation. A pending target now
stays selected until reached. Pointer/wheel input releases that target for manual
scrolling, and resize preserves the active page.

## Measured curve alignment

The cyan edge is traced independently from the screenshots. The original 640×476
reference is fitted without stretching and centred in the comparison frame.
At **640×480**, mean vertical deviation dropped from **8.623** to **0.400 native
pixels** across 620 columns. At **960×720**, it dropped from **9.162** to **0.605
native pixels** across 930 columns. This measures the curve only; it is not an
aggregate image-fidelity score. [Trace results](menu-fidelity/curve-alignment.json).

## Verification

The dedicated menu checks exercise all four pages, the adjacent-column view,
last-page arrows, cross-page reordering, resizing, pointer hits, persisted slots,
and unread-count/read transitions at 640×480, 854×480, 960×720 and 1280×720.
[Menu results](menu-fidelity/results.json).

The wider system regression also passed: 82 functional/check records and 120
state/resolution geometry checks, with no clipping/hit failures, browser errors
or missing assets. [Regression summary](menu-fidelity/system-regression-summary.json).
The channel smoke test passed. The viewer checks its four size/mode combinations,
loaded images, opacity, difference mode and the progress overlay.

```sh
npm run build
node scripts/test-menu-fidelity.mjs
node scripts/build-menu-fidelity.mjs
python scripts/render-menu-fidelity.py
node scripts/check-interface-improvement-viewer.mjs --menu
```

The preserved Before PNGs are reused for normal reproduction. `--capture-before`
requires the public site to be at exactly 3e96806, preventing accidental capture
of a newer implementation as the baseline.

## Remaining differences

The reference has additional installed channels, including channels not present
in this repository's fixture catalog. Channel rearrangement and animation phases
also affect appearance. These differences are visible in the overlay; they are
not counted as shell geometry failures. Source capture filtering and date-font
shapes still differ. Empty-slot texture and some icon details need a separate
asset/renderer comparison.

The widescreen comparison now uses a **2560×1440, exact 16:9 screenshot** from
[Super Mario Wiki's file history](https://www.mariowiki.com/File:Wii_Systemmenu.png#filehistory),
replacing the 256×150 promotional reference in this viewer. The original image is
retained without cropping or stretching, and its URL, dimensions and SHA-256 are
recorded in the [source manifest](interface-audit/references.json). SWFlash uploaded
it on 28 January 2013; DogsRNice losslessly optimized it on 18 November 2017. The
two archived PNGs decode to identical pixels.

This source includes the clock, date, SD shortcut, message count and adjacent
channel column. Its clock reads **12:59 AM / Tue 1/29**, whereas the preserved
browser fixture reads **5:06 PM / Fri 3/1**. Channel inventory and icon animation
phases also differ. Hardware/emulator, internal rendering resolution and filtering
are undocumented; a larger file does not establish more native texture detail.
Use the overlay to inspect proportions and font shapes, accounting for these state
differences. Precise widescreen pixel fidelity remains unverified. The earlier
Nintendo source remains in the audit catalog. Full applications and
hardware/service behavior retain the existing boundaries in the
[implementation report](interface-improvements.md).
