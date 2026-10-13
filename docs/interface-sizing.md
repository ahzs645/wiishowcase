# Wii sizing and typography pass

The [comparison viewer](interface-sizing/?interface=save-grid&mode=4%3A3) compares
Wii references, the preserved **c8c9da9** implementation, and this sizing pass.
It contains 30 states at **640×480 / 854×480** and **960×720 / 1280×720**.
Native images are separate captures. The previous pass remains unchanged apart
from a link to this newer viewer; its images are scaled proportionally when
viewing native comparisons.

Use the opacity slider or Difference mode to compare against the Wii reference.
“Refined vs previous” isolates this implementation's changes. References retain
their original aspect ratios. Small or cropped manual illustrations establish
structure; they do not prove precise widescreen pixel accuracy.

## Changes

All sizes below are logical units in the common 480-line coordinate system.

| Surface | Previous pass | Refined |
| --- | --- | --- |
| Settings page labels | 17-unit text, 49-unit buttons | 26-unit text, 61-unit buttons; wider title tab and native-style highlight |
| Settings Back | 17-unit text, 190×34 control | 27-unit text, 280×62 control |
| Other Settings/Data Back | 17-unit text, 190×34 control | 24-unit text, 220×54 control |
| Menu clock/date | 39 / 24-unit type | 54 / 32-unit type; baseline positioning adjusted for the font's glyph height |
| SD shortcut | 27×36 symbol, low footer placement | 33×44 symbol, raised to the reference footer position |
| Save/Channel Data | Small tabs; dark 5×3 grid; names and block counts in each cell | Larger header tabs; light panel; square-proportioned previews; selected-item details remain in the dialog |
| HOME Remote Settings | Cropped remote; small rounded controls and uniform meter bars | Complete remote beside larger rectangular controls; stepped volume bars; larger labels and footer |
| Create Message | Unicode glyphs in a generic dialog | Separate memo, envelope and book illustrations on the board surface |
| Memo/Letter editor | Generic dialog with centrally grouped actions | Larger paper, text and ruled lines; Back and Post/Save Letter beneath opposite sides |
| Address Book | Generic dialog with smaller rows | Book surface, larger friend rows and avatar cells, larger Back/Register below |
| Opened Memo/Letter | Header mixed viewport/clamped sizes; smaller text | 24-unit title; 22-unit body text and 44-unit ruled lines |
| System keyboard | Smaller input/key text | Larger input/key text, scoped to the opt-in system profile |

The default Shop keyboard keeps its original artwork, sounds and chosen Shift
behavior. Framework submodule revisions are unchanged. Storage previews reuse
existing static channel artwork without creating additional animated renderers.
Wii Sports save art remains a labeled placeholder.

The geometry checks exposed Calendar controls that slid outside the viewport but
remained focusable. The hidden footer and covered Message Board controls are now
inert while Calendar is open. Hidden channel-selection controls are also inert.
The Calendar Back label now fits at native size; Tab checks cover the hidden controls.

Portal dialogs also inherit the actual Wii frame dimensions, preserving forced
aspect-ratio letterboxing.

## Verified results

- 120 state/resolution checks and captures: 30 states, both aspect ratios, both resolutions.
- 1020 rendered controls and 1224 text containers checked; no bounds, pointer-hit or text-fragment failures.
- 82 functional/check records; no browser page errors or missing assets.
- Shop keyboard regression and channel smoke/audio checks passed.
- Forced-aspect dialog frames match before and after resize in both modes.

[Compact validation summary](interface-sizing/validation-summary.json).

## Reproduction and verification

```sh
npm run build
npm run test:interface-sizing
npm run build:interface-sizing
SMOKE_CHROMIUM=/usr/bin/chromium npm run test:smoke
KEYBOARD_ARTIFACTS=/tmp/wii-shop-sizing npm run test:shop-keyboard
```

The sizing run uses real navigation through Settings, Data Management, HOME,
Message Board and the system keyboard. It checks visible control bounds, centre
pointer hits and text-fragment bounds at both resolutions for each state.
The top active dialog/keyboard is checked; controls behind modal overlays are
excluded. Geometry checks allow two pixels for rounding and glyph bounds.
Functional checks also exercise persistence, copying/moving/erasing data, message
composition, Address Book registration, replies, formatting cancellation and
HOME Reset. Results and measured fonts/controls are saved in
[results.json](interface-sizing/results.json) and
[sizing-checks.json](interface-sizing/sizing-checks.json).

The Shop regression checks all 53 keys at five viewport sizes, physical input,
caret editing, focus, original artwork and playback options. The smoke test loads
all seven default channel bundles and opens the Message Board.

## Remaining fidelity gaps

System font metrics still differ from original Wii captures. Proprietary fonts
remain outside the public build. Save art and some controller/control artwork are
recreations; the Settings version identifier remains this web application's Wii
label. Several detailed Settings panels still use browser controls. The system
keyboard's input scrolling arrows and firmware-specific language layouts remain
unreproduced. Manual sources are too small to certify exact glyph shapes or
widescreen spacing.

This pass changes visual proportions and the Calendar focus issue. Existing
local-storage, service and hardware boundaries remain as documented in the
[previous implementation report](interface-improvements.md).
