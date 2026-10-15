# System menu fixes — 14 October 2026

The [comparison viewer](system-menu-fixes/?interface=date&mode=4%3A3&height=480)
keeps the original audit captures, new application captures, and native sources
separate. Switch Before / after to Original Wii / after for native overlays.
Both 4:3 and 16:9 have 480- and 720-line captures.

Implemented:

- Shared frame-scaled system font, fitted modal layouts, Update focus entry,
  Tab trapping, return focus, background isolation and local Escape.
- Settings page arrows/version profile; native-style date/time digit columns,
  nickname field, stacked choices, aspect previews and separate Back/Confirm.
  Back discards drafts; Confirm persists them. Leap dates clamp correctly.
- Connection 1/2/3 and wired/wireless preferences, Console Information and
  User Agreements, standby, illumination, game-rating and secret-question views.
- Storage silhouettes and frozen native channel thumbnails, GameCube Slot A
  selection, Disc removed from the data inventory, unknown block capacity labeled.
- SD curved footer/page controls, selected-title layout and full-menu management
  flow. The error fixture simulates future inventory: the current eight titles
  cannot naturally fill all 47 movable slots. This is slot capacity, not NAND bytes.
- Message paper/book sizing, outer Back/Reply/trash actions, recipient chooser,
  styled photo selection and optional contact Mii.
- System keyboard type sizing, phone case/numeric rail and larger keys,
  accent layout, text and suggestion scroll controls. Shop Shift and audio
  behavior remain in their existing profile.
- Decodable QR/manual pairing at 480 lines, explicit missing-relay explanation
  and stopped HTTP retries when the endpoint is absent. Pending replaced
  companion connections cannot publish stale answers during React remounts.

The font is an OFL M PLUS 1p Latin/punctuation subset, not Nintendo's Rodin.
Regular/medium/bold files and the reproduction script are included. Main-menu
clock/date font rules stay in their separate registry. Thumbnails are frozen
from existing channel icon renders, avoiding additional animation renderers in
Data Management. Art reconstructed in SVG/CSS remains approximate.

Automatic cross-device pairing needs a backend. Set `VITE_SIGNALING_RELAY_URL`
to a reachable base endpoint; the client GETs `/<session>` for JSON `{answer}`
and POSTs `{answer}` there. A cross-origin service must allow that origin and
JSON requests. The existing production `/api/signal` is unavailable; manual
answer-code exchange is the supported fallback. Isolated browser contexts accept the real manual SDP answer. This environment
supplies no ICE candidates, so an open data channel, phone gyro and Internet/NAT
connectivity could not be verified.

Physical video modes, sensor calibration, slot lamps, Wii storage blocks and
retired online delivery have browser substitutes. Country/rating options are
an adapter subset. Channel age-rating metadata, full interface translations,
older firmware/J/K layouts and original art/glyph precision remain future work.
Some references are cropped manual illustrations or related states; the viewer
labels them. No native pixel-accuracy percentage is claimed.

Reproduce with a dev server at port 4955 and a normal production build:

```sh
npm run build
SYSTEM_SIZING=1 SYSTEM_ARTIFACTS=/tmp/system-menu-core node scripts/test-system-interface.mjs
OTHER_MENU_ARTIFACTS=docs/system-menu-fixes OTHER_MENU_CORE_SOURCE=/tmp/system-menu-core node scripts/capture-other-menu-core.mjs
OTHER_MENU_ARTIFACTS=docs/system-menu-fixes node scripts/capture-other-menus.mjs
node scripts/test-system-menu-fixes.mjs
node scripts/test-system-pairing.mjs
node scripts/test-system-keyboard-focus.mjs
node scripts/capture-system-home.mjs
```

The added interaction/pairing checks use the dev source import for state inspection and an
isolated full-slot component fixture. Their JSON results are copied into the
comparison directory before `node scripts/build-system-menu-fixes.mjs` and
`npm run build:layout`. Keep comparison captures deterministic; avoid source
edits or rebuilding CSS while live dev-server tests are running.

Validation: 84 core checks, 88 added interaction checks, 10 QR/manual SDP/SD checks,
4 HOME placement checks and 8 keyboard focus checks passed. All 256 comparison
captures passed visible bounds/text/pointer checks. The viewer passed 512
overlay combinations. The broader regressions passed 57 menu checks, 60
clock/font checks, the Shop keyboard suite and 4 controller-transport flows.
No unexpected runtime errors or static asset failures were recorded.
