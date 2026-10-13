# Menu clock and date typography

The menu date previously inherited the browser's system font, so its letter
shapes and widths varied by operating system. It now uses an 11.5 KB, locally
served Latin subset of M PLUS 1p Bold. The subset and its SIL Open Font License
are included in the build; there is no third-party font request. This font is a
closer approximation of Rodin, not the original proprietary typeface. Its scope
is the menu date and AM/PM label; other interface text keeps its current font.

Date size is 32 logical units with no extra tracking. The old 35-unit fallback
font and the new face have different metrics, so matching their CSS size would
not match their visible height. Clock height is 35 units. Vertical digit strokes,
including the narrow `1`, are finer. Digits retain their own SVG shapes, stable
centering and round colon dots. The obsolete digital-7 font declaration is removed.

The US profile now displays a twelve-hour time and a separate AM/PM label beside
the centered digits. Midnight is `12:00 AM`; noon is `12:00 PM`. Other currently
supported country profiles retain the existing 24-hour time. The period updates
with the time and is included in the timer's accessible label. Date order,
zero-padding, settings time offset and message-board date behavior are unchanged.
This is not an exhaustive regional-format implementation.

## Comparison evidence

[Enlarged glyph comparisons](menu-typography/typography-comparison.png) show the
source, the actual menu before this change (6552e57), current components rendered
with identical source text, and a 50% overlay. Reference and screenshot aspect
ratios are preserved. These controlled specimens use `17:06 / Fri 03/01` for 4:3
and `12:59 AM / Tue 1/29` for 16:9. They isolate glyph appearance; the live US
profile uses twelve-hour time and the existing zero-padded date. The old wide
capture has another time/date. It is labeled separately to avoid treating those
characters as a font error.

The [whole-menu comparison](menu-fidelity/?mode=16%3A9&height=480) uses actual
application captures. Its US fixture now reads `5:06 PM / Fri 03/01`, so clock
characters differ from the preserved 17:06 image. The 2560×1440 wide reference's
capture settings are undocumented; these comparisons do not establish exact
pixel fidelity. Font shapes still differ from Rodin.

## Verification

[Typography results](menu-typography/results.json) record checks at 640×480,
854×480, 960×720 and 1280×720: the actual font face loads successfully beneath
the deployed base path; date and clock scale together; the AM label fits and
keeps the digits centered; noon updates the period; and the UK profile has no
AM/PM label. Boundary cases cover midnight, noon and 23:59. Browser errors and
missing assets fail the run. Controlled specimens come from the current React
components via a development-only fixture, which is excluded from the app build.

```sh
node scripts/test-menu-typography.mjs
npm run build
node scripts/test-menu-fidelity.mjs
npm run build:menu-fidelity
python scripts/render-menu-typography.py
node scripts/check-interface-improvement-viewer.mjs --menu
```

The typography test uses the Vite development server on port 4955. Whole-menu
checks use the built preview on port 4950.
