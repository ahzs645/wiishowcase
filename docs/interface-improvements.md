# Wii interface improvements and comparisons

All five areas from the visual audit now have a working web implementation. The
[comparison viewer](interface-improvements/index.html) contains 60 source-linked
captures: 30 states at both **960×720 (4:3)** and **1280×720 (16:9)**. It shows the
original reference, preserved baseline, implemented screen, opacity overlay and
difference view. [Menu overview](interface-improvements/menu-comparison.png) and
[system overview](interface-improvements/system-comparisons.png) provide static
comparisons. The production build also publishes the viewer at
`/wiishowcase/comparisons/interface-improvements/`.

Original references and baseline captures remain in the
[earlier audit](interface-audit.md).

## Changes

| Audit gap | Implemented behavior |
| --- | --- |
| Menu grid, clock and footer | Common 480-line coordinate scale; 122-unit 4:3 and 165-unit wide cards; smaller clock/date/footer controls; Wii logo and SD button; proportional arrows. The blue curve is drawn on a static sibling rather than filtering animated icon canvases. |
| Settings and Data Management | Two Options tiles; all three Settings pages; saved nickname/date/time/display/sound/country/language/parental/sensor preferences; Internet status and connection test; web update checker. Data Management navigates save platforms and Wii/SD entries with copy, move, erase and confirmation flows. |
| HOME remote controls | Volume, rumble pulse, reconnect/pairing, Operations Guide and battery connection indicators. P1 is local and three companions fill P2–P4. Reset now reaches Safety instead of leaving the screen black. |
| Message Board | Memo creation, multiline text, optional existing Mii, Address Book registration/erasure, local letters, replies, photo attachments, persistent read state and confirmed deletion. Calendar decorations use stored message dates and the configured console day. Escape closes the active editor/letter first. |
| 48 slots and SD/reordering | Four pages of twelve menu slots; fixed Disc slot; drag, right-click, accessible pick/place and paired A+B initiation. Placement survives reload. SD has twenty pages of twelve slots. Copying and moving update both inventories. |
| System keyboard | Separate opt-in system profile; symbol Shift, independent Caps, multiline Return, language controls, local word suggestions, accented More palette and twelve phone groups. Physical input remains supported. The default Shop profile retains its 53 keys, original PNGs, all ten WAVs and persistent on-screen Shift. |

State is versioned under `wiishowcase.system.v1` in local storage. It synchronizes
between tabs and reports when storage is unavailable. Format asks for confirmation
and resets local records; it does not touch repository assets. Dialogs and
keyboards render in a shared modal layer, with focus trapping and inert background
controls. Hidden pages and flipped footer faces cannot receive keyboard focus.

## What the comparison establishes

Menu shell proportions are substantially closer to the references, particularly
in 4:3. Settings, SD, message composition and Address Book destinations previously
had no handler, so their **Before** panel shows the screen where navigation
stopped. The old keyboard baseline was a standalone Shop-profile harness; the new
system-profile captures come from actual Message Board composition.

Sources retain their original aspect ratios. Nintendo manual illustrations are
small, sometimes cropped, and usually 4:3. Widescreen captures of those states
therefore provide structural comparisons, not native widescreen pixel evidence.
Menu content, dates and animation phases differ. There is no aggregate pixel
accuracy percentage.

Fonts, some icons and detailed control artwork still differ. The existing Peter Mii fixture also has a matching PNG fallback for builds
without the optional Mii renderer. The system prediction
list is a small local dictionary, not Nintendo's original dictionary. Date/time
controls use browser inputs, and the phone profile recreates the character groups
rather than reproducing every firmware language layout.

## Functional boundaries

Storage screens manipulate **local virtual channel/save entries**. They do not
install WADs, read physical SD cards, access GameCube memory cards or change TV
output. Battery capacity and infrared measurements are unavailable. Sensor
sensitivity adjusts paired phone motion; sensor placement is stored as a profile
preference. Sound Mono is applied to channel audio; Surround uses available stereo
output. Volume affects interface feedback; turning Rumble on sends a haptic pulse
to connected companions when vibration is supported.

Letters and replies are explicitly saved locally. Nintendo messaging/WiiConnect24
delivery is unavailable. Internet and WiiConnect24 configuration are local profile
preferences; they do not create a console service connection. Full channel
applications retain their existing availability; this work does not expand
Forecast or News application adapters.

## Validation

The [flow results](interface-improvements/results.json) cover both display modes:
reordering across pages and reloads; fixed Disc placement; save-copy cancellation;
Wii/SD transfer; nickname/date/display/sound/sensor/language preferences; correct
and incorrect parental PINs; HOME controls; integrated keyboard and suggestions;
registration, memo/letter/reply creation, read/delete persistence; format
cancellation and confirmation; Reset and SD Escape routing. Options and every
visible system-keyboard key also pass bounds and centre-hit checks at **640×480**
and **854×480**. No browser page errors or missing production assets were found.

The Shop keyboard regression checks all 53 keys at five viewport sizes, artwork,
physical input, caret/selection, focus, audio volume/restart/overlap and pressed
styles. Production smoke, stale channel audio, all-channel loading and outer-view
presentation regressions pass. The [controller checks](interface-improvements/controller-results.json)
use a deterministic transport with the actual React UI and input adapter to verify
rumble after Off→On, reconnect/canceled offers and paired A+B reordering. These
checks do not claim real phone, battery or infrared hardware coverage.

[Loading measurements](interface-improvements/channel-loading-results.json) from
headless Chromium in this workspace: all seven menu channels were ready in
**1.63 seconds** normally, **4.69 seconds** with 4× CPU slowdown and 750 ms ZIP
delays, and **1.48 seconds** with WebGL unavailable. Warm bundle reuse, heavy
Mii/Shop/Ranch selection, rapid cold switching and final banner/audio agreement
passed. These are local scenario measurements, not a universal device benchmark.
First-use decoding and some main-thread tasks remain the performance work to
prioritize. Increasing slots to 48 does not create 48 live channel renderers:
inactive pages and obscured menu content pause playback.

Run `npm run test:system-interface`, `npm run build:interface-improvements`, then
`python scripts/render-interface-improvement-overviews.py` to reproduce this pass.
Serve the repository's `docs/` directory to use both viewers and their shared
reference images. `scripts/check-interface-improvement-viewer.mjs` validates all
60 interface/mode combinations and the overlay controls on port 4957.
