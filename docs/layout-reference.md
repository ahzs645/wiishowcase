# Maintaining Wii interface layout information

[Open the layout reference](layout-reference/) for coordinates at both aspect
ratios, typography, placement formulas, regional rules, firmware confidence and
an index of all recorded system screens.

## Where information belongs

- **Implementation values:** [src/layout/menu.js](https://github.com/ahzs645/wiishowcase/blob/main/src/layout/menu.js)
  is the authoritative menu registry. CSS tokens, the downloadable JSON and the
  reference page are generated from it. MenuCurve, Clock, regional formatting,
  slot storage and paging read it directly. Other system screens currently keep
  their own CSS/component rules; the screen index explicitly marks that boundary.
- **Original sources:** [interface-audit/references.json](interface-audit/references.json)
  stores reference IDs, URLs, original dimensions, hashes and capture/version
  uncertainty. Add evidence here rather than assigning unknown firmware a guessed version.
- **Native behavior and history:** [menu-versions/research.json](menu-versions/research.json)
  pins source code to a commit and line, separating code evidence from screenshot inference.
- **Independent measurements:** [menu-versions/measurements.json](menu-versions/measurements.json)
  and curve traces record observed screenshot landmarks. Do not generate expected
  native measurements from implementation tokens: that would hide regressions.
- **Captures and comparisons:** [menu-versions/](menu-versions/) records matched
  source state; [interface-sizing/](interface-sizing/) indexes broader screens.
  These are historical evidence sets, not interchangeable current screenshots.

## Coordinate rules

Positions use the fitted Wii frame's top-left corner and a common 480-line
scale. 4:3 is 640×480; wide is 853⅓×480. Test captures use rounded 854×480,
960×720 and 1280×720 too. Letterboxing is outside the coordinate frame.
Percentage anchors refer to the frame's width. Native projection, framebuffer
and video output dimensions require their own conversion; they are not CSS units.

Record whether a measurement describes a logical slot, masked visible edge,
glyph ink, pane or hit area. The wide first slot starts at x=69 at 854×480,
while its visible border starts near x=71. Do not fix one by moving the other
without checking the mask. Keep clip geometry and decorative curve geometry shared.

## Changing a maintained menu layout

1. Record the trigger/state and evidence first. Include platform, firmware
   confidence, channel revisions, region/language, display mode, source crop and
   capture pipeline, clock/date, SD/unread/hover state and icon animation frames.
   Use an unknown value when the source does not establish it.
2. Change `src/layout/menu.js`; add source links and describe any approximation.
   Mode overrides inherit common tokens. Do not edit `menu.generated.css` or
   generated reference files. Glyph artwork still lives in its owning component.
3. Run `npm run build:layout`, then `npm run check:layout` and `npm run build`.
   Both development commands and production prebuild regenerate the reference;
   CI checks committed files for drift before building.
4. Run `npm run test:menu-fidelity` against the preview server on port 4950 and
   `npm run test:menu-typography` against development on 4955. For a geometry or
   regional change, capture matched states with `npm run capture:menu-version-states`,
   rebuild the version viewer with `npm run build:menu-versions`, and inspect both
   independent wide references at 480 and 720 lines. Preserve earlier captures.
5. If shared sizing or calendar/footer rules change, run the broader sizing
   regression too. Forced aspect, paging, reordering, visible text and pointer
   targets matter alongside overlays. Record regressions even when other scores improve.

## Adding another screen or channel adapter

Create an owning registry with the same coordinate contract, profile axes,
anchors, font information, source IDs and explicit gaps. Move only values backed
by evidence; retain unknowns. Connect its renderer to that registry, then add it
to `generate-layout-reference.mjs` and update the generated screen ownership.
Add state-matched comparisons and meaningful interaction checks. Existing views
being functional does not establish native layout accuracy.

Keep retail firmware families, vWii and Wii mini distinct. Treat full Forecast,
News and Shop application layouts and their individual revisions separately
from their menu icons/banners. Full J/K localization and older firmware layouts
remain pending; the current registry does not claim to implement them.

## Validation of the initial registry refactor

The [validation record](layout-reference/validation.json) records 57 menu checks,
60 typography checks, 82 system checks and 120 screen/size cases with no
geometry failures, browser errors or missing assets. Six matched captures have
zero changed pixels in the static lower menu strip, including the curve,
clock/date and footer; animated channel textures can differ between captures.
The [preservation record](layout-reference/render-preservation.json) keeps these
counts separate from native fidelity scores. The reference page's search,
42 local links and narrow viewport were checked too.

## System menu adapters

`src/layout/system.js` now owns shared 480-line system tokens and font/source
metadata. `src/layout/system.generated.css` and
`docs/layout-reference/system-registry.json` are generated by `build:layout`.
`src/system-adapters.css` owns the screen-specific fitted rules. These are
implementation anchors, not recovered Nintendo layout values. Keep independent
source measurements in the original audit; do not rewrite them to match code.

The [new comparisons](system-menu-fixes/) preserve before captures and expose
before/after and original/after overlays at both aspect ratios and heights.
Their manifest updates screen ownership automatically. New Settings destinations
use browser adapters; the firmware label describes the retail 4.3 layout
profile, not an emulated console firmware. Original glyphs/textures, regional
translations and physical hardware still have explicit limits.

The second pass adds a centered Settings content area, separate aspect anchors,
full-skin versus cyan-outline bounds, and fitted text tracking. The active screen
index now selects the latest comparison manifest. Independent measurements and
rendered checks are linked in [the refinement report](system-menu-refinement.md).
