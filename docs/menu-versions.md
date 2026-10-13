# Wii Menu versions, region and widescreen alignment

The previous overlays did not establish the firmware of their menu screenshots.
The larger image improved detail, but its upload date and 16:9 dimensions did not
identify its software version or capture pipeline. The current implementation
targets the retail Wii's **4.x menu, with 4.3 U/E behavior as the baseline**.
It does not implement a selectable set of old firmware versions.

[Version-aware comparisons](menu-versions/) show two independent settled wide
references and a 4:3 reference, with their version-confidence labels. Current app captures match each
source's written time/date and unread count, using documented fixture years. Those
years do not identify the dates of the original captures. The version
of each bare menu image remains unknown. Both wide images have visible features
consistent with 4.0 or newer; that is an inference, not a firmware identification.

## What actually changed between versions

| Version/family | Relevant visible or behavioral change | Evidence |
| --- | --- | --- |
| 1.x–2.x | Pre-clock menu. SD save-data support is separate from the later SD Menu shortcut. | [Nintendo update history](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2522/~/wii-system-menu-update-history) |
| 3.0 | Clock added; Forecast/News icons can display downloaded data; message notification behavior added. | Nintendo history, [WiiBrew 3.0](https://wiibrew.org/wiki/3.0) |
| 3.1 | USB keyboard support extended to Shop, Settings and Message Board. | Nintendo history |
| 4.0 | SD Card Menu shortcut, SDHC support and storage flows added. | Nintendo history, [launch walkthrough](https://www.nintendoworldreport.com/news/18036/the-wii-sd-card-menu-a-walkthrough) |
| 4.1–4.3 | Nintendo describes behind-the-scenes updates. This is not evidence that every pixel is identical, but it does not explain our 11-pixel grid displacement. | Nintendo history, [4.3 technical report](https://hackmii.com/2010/06/system-menu-4-3-update/) |
| Wii mini | Modified menu with removed SD/network functionality. Keep separate from ordinary 4.3 captures. | [WiiBrew System Menu](https://wiibrew.org/wiki/System_Menu) |
| Wii U / vWii | Separate platform revisions and return-to-Wii-U behavior; aspect handling changed in later Wii U updates. Keep separate from retail-Wii version labels. | WiiBrew System Menu |

Individual channel revisions are another axis: Shop, Photo, Forecast and News
content can change independently of the System Menu. Different banners and
downloaded data do not, by themselves, identify a menu firmware revision.

## Region and animation state matter too

The [4.3 decompilation](https://github.com/koopthekoopa/wii-ipl/tree/6ba4232f10331df88e6ee562cb9589b62108db86)
provides stronger behavioral evidence than guessing from screenshots. We inspected
its code; we did not build or run Nintendo's executable. Relevant sources are
`src/scene/channelSelect/iplClock.cpp`, `src/layout/iplLayout.cpp`,
`src/system/iplFramework.cpp` and `src/scene/sdButton/iplSDMenuButton.cpp`.

- **Startup label:** 4.3 displays “Wii Menu” for a timer of 3,000 ms before the
  clock transition. A screenshot of that label is compatible with a modern menu;
  it is not proof of a pre-3.0 firmware. Our live menu currently begins with the
  clock; this startup animation remains an implementation gap.
- **Clock panes:** only the leading hour pane is hidden when it is zero; the
  remaining panes keep their positions. Our clock now reserves that cell, keeping
  minute digits and AM/PM in place when changing between one- and two-digit hours.
- **Product region:** U uses a right-hand period and 12 at midnight/noon. E uses
  24-hour time without a period. J uses a left-hand period and hour 0 at midnight;
  K uses a left-hand period and hour 12. Native policy uses product region, not
  Country. Existing saves infer a profile from Country; `settings.menuRegion`
  can explicitly select `U`, `E`, `J` or `K`. Canada now infers U.
- **English date formats:** independent U-style images show `1/29`, `1/1`,
  `2/1` and the 4.0 photo shows `3/25`. The U/Canada profile now uses unpadded
  month/day, replacing our incorrect `03/01`. The English E profile retains
  padded day/month. Full J/K date and period-label localization is not implemented;
  our English UI still uses AM/PM words. Country/language/region are not a complete
  native localization adapter yet.
- **State:** colon blinking can hide the separator; unread notifications can
  animate the mail button; SD insertion changes the SD button's appearance.
  Those differences must be recorded separately from firmware. Our clock colon
  and unread button do not reproduce all native animation phases yet.

## Sources and confidence

| Reference | What is established | What is not established |
| --- | --- | --- |
| [Super Mario Wiki archived menu](https://www.mariowiki.com/File:Wii_Systemmenu.png#filehistory), 2560×1440 | Exact 16:9; settled English right-hand AM/PM; clock and blue SD shortcut present. | Exact firmware, platform and rendering/filtering settings. |
| [Wikipedia menu image](https://en.wikipedia.org/wiki/File:Wiimen.png), 420×236; obtained from [HandWiki mirror](https://handwiki.org/wiki/Wii_Menu) | A second channel inventory/date; settled clock and gray SD shortcut; corroborates wide placement. | Exact firmware and capture settings. Upload date is not firmware evidence. |
| [Wii Hacks Guide Settings](https://wii.hacks.guide/letterbomb), 1920×1080 | **Ver. 4.3U is printed in this Settings image.** | It cannot assign 4.3U to another author's menu capture. |
| [Nintendo promotional menu](https://www.nintendo.com/en-gb/Wii/Wii-Channels/Wii-Menu/Wii-Menu-749371.html), 256×150 | Official image with “Wii Menu” label. | Firmware and exact startup phase; too small/cropped for fine scoring. |
| [Nintendo World Report 4.0 launch photo](https://www.nintendoworldreport.com/news/18036/the-wii-sd-card-menu-a-walkthrough) | Release-linked 4.0 context and hovered SD shortcut. | Whole-frame alignment: the image is a cropped photo of a display. |
| [RetroTINK capture](https://longplaytech.com/posts/retrotink-5x-settings-for-the-nintendo-wii/) | Documented component/scaler pipeline and adjusted crop/position. | Firmware and an untouched frame. Excluded from geometry fitting. |

URLs, original dimensions, SHA-256 and version-confidence metadata are kept in
[the source manifest](interface-audit/references.json). No theme recreation or HD
replacement texture pack is used as a native geometry reference. Searches also
checked the Wii Hacks Guide's image inventory; its factory-reset `sysmenu.png`
shows a PC NAND tool, not a Wii Menu capture. Version-linked 3.0/4.0 news coverage
was useful for history, but did not provide a suitable uncropped settled wide frame.

## Widescreen corrections

At 854×480, both settled wide images put the visible Disc border around **x=71**.
Our preserved e12cb5f capture put it at **x=60**. Four channel columns span about
180 pixels per column, while our spacing was 186. The wide menu now uses a
4-unit gap, centers the grid without the inherited 4:3 inset correction and
starts two units lower. Paging follows the revised column pitch.

The SD shortcut is also repositioned using the 4.3 pane's x=-245 coordinate in
the -416..416 wide projection. Footer buttons move six units down; the Wii
button moves four units right. The wide curve moves about one unit down, with
its clipping and stroke still sharing one shape. The paging arrow moves to the
corroborated position. These changes are scoped to the wide menu.

[Independent pixel measurements](menu-versions/measurements.json) compare the
preserved capture with the corrected capture at both 480- and 720-line sizes.
They measure outline centers, cyan landmarks and the curve, not channel artwork
or overall fidelity. The 4:3 geometry remains covered by its existing tests.

The overlay still exposes different installed channels, native icon animation
phases, approximate font/SD artwork and mail-pulse state. Fixing these anchors
does not make the entire image an exact pixel match, and firmware uncertainty
remains explicit.


## Verification

The current application passed 57 menu checks, including all four pages, resizing,
reordering, persisted slots and forced aspect frames. Region/font checks cover
US, Canada, European time/date, explicit region overrides, and fixed hour-cell
spacing. Six additional actual-app captures match written source time/date and
unread count, with all available channel icons ready and no text/control failures.
The comparison viewer checks six source/size combinations, confidence labels,
loaded images, opacity, difference and measured-outline toggles.

A wider regression also checks Settings, SD/Data Management, message composition,
calendar, HOME controls and both keyboard profiles. Its summary is recorded in
[system-regression-summary.json](menu-versions/system-regression-summary.json).

```sh
npm run build
node scripts/test-menu-fidelity.mjs
npm run build:menu-fidelity
node scripts/capture-menu-version-states.mjs
python scripts/render-menu-version-comparisons.py
node scripts/check-menu-version-viewer.mjs
```

The high-resolution primary image's 480-line Disc-border mean deviation drops
from **6.25 to 0.25 native pixels**; four-column edge deviation drops from **6.5
to 0.5**. These are specific geometric landmarks, not an overall accuracy score.
The low-resolution reference is not suitable for scoring fine texture or stroke
alignment after upscaling. Its 720-line cyan threshold trace is more sensitive to
interpolation and does not improve with this correction; it is retained in the
raw measurements rather than treated as a reason to refit the menu.
