# System menu refinement and controller relay

[Current comparisons](system-menu-refinement/?interface=settings-one&mode=16%3A9&height=480)
show 64 states at 640×480, 854×480, 960×720 and 1280×720. Before captures are
from `cb8b37b`; the earlier audit and first-fix comparisons remain preserved.
The old `/comparisons/other-menus/` URL opens the current comparisons with the
same screen/aspect/height. Add `historical=1` to view that original audit.

## Settings layout and lettering

The wide Settings shell previously anchored its title, firmware label, Back
button, page indicators and arrow to the full viewport. The native reference
places those controls within a centered content area. The new registry keeps
that content area at 640 logical units and provides separate 4:3/16:9 anchors.

Independent source measurements are in
[native-settings-measurements.json](system-menu-refinement/native-settings-measurements.json).
The 1920×1080 4.3U source has a title bright-fill box at approximately
(139.9, 28.4, 418.2, 33.8) when contain-fitted to 854×480, and Back at
(149.2, 396.9, 268, 62.7). Source bright fills, cyan outlines and complete DOM
hit boxes are different bounds; edge/crop uncertainty is approximately 2–4
logical pixels. No overall native pixel-accuracy percentage is assigned.

The native-style button skins have curved highlights and outer white/cyan
rims. Their DOM boxes include those rims, so the registry distinguishes the
full card width from the earlier cyan-outline measurement. Settings leaf
screens use their breadcrumb/title treatment. Footer controls sit higher;
wide labels have separately fitted tracking. Date/time digits use the bundled
medium face at 64 logical pixels. Status text has its own area, so Confirm no
longer shifts the selected controls.

[Rendered measurements](system-menu-refinement/rendered-settings-measurements.json)
record the actual DOM and custom fonts at all four sizes. These remain M PLUS
1p approximations; original Rodin glyphs and original pane textures are not
redistributed. Native firmware, source crop, selected values and region differ
across references. Full regional layouts and translations remain separate work.

## Controller service and transport

The [standalone Node service](https://github.com/ahzs645/wiishowcase/blob/main/server/README.md) shares the same bounded,
expiring HTTP answer store as Vite development and preview. Session IDs use
128 random bits. Transient POST errors can recover; closing pairing aborts
polling. Closing during offer creation releases its reserved controller slot;
late offers are ignored. Setup and malformed-answer failures show Retry, and
retries do not leak controller slots. RTC gathering and config fetches have
finite timeouts.

Optional `/api/rtc-config` issues temporary coturn REST credentials from a
server-side shared secret. Permanent TURN credentials are not bundled into the
frontend. The real-browser test disables BroadcastChannel, runs the standalone
HTTP service on a separate origin, fetches real temporary credentials, decodes
the displayed QR and connects two native Chromium peer connections through a
local coturn TCP relay. Player 2 assignment, actual HOME input and Disconnect
pass. This does not establish physical-phone gyro or every Internet/NAT path.

**Production hosting remains pending.** The existing frontend deploys to static
GitHub Pages, which cannot run the Node service. No backend hosting credentials
are configured in this environment. Once an HTTPS backend exists, set Actions
variable `WII_SIGNALING_RELAY_URL` to `https://<host>/api/signal`; optionally set
`WII_RTC_CONFIG_URL` to `https://<host>/api/rtc-config`. The Pages workflow reads
those variables at build time. Hosting should use the `server` directory and
`npm start`; that directory has no third-party dependencies. See the service
README for TURN variables and single-instance requirements.

## Verification

- 84 full-system interaction checks and 112 non-menu core captures passed.
- 96 added checks and 36 extra geometry captures passed, including stable
  selectors after Confirm, digit editing, settings persistence and modal focus.
- All 256 comparison captures passed control bounds, text and center-hit checks;
  no page errors or unexpected static asset failures were recorded.
- 26 HTTP/client/config checks and 7 pairing lifecycle checks passed.
- 9 real automatic-pairing checks passed using standalone HTTP plus coturn/TCP.
- 8 rendered Settings/font measurements passed at both aspects and heights.
- The existing controller transport regression passed its four flows.

Reproduce with a dev server at port 4955:

```sh
npm run build
SYSTEM_SIZING=1 SYSTEM_ARTIFACTS=/tmp/menu-refinement-core node scripts/test-system-interface.mjs
OTHER_MENU_ARTIFACTS=docs/system-menu-refinement OTHER_MENU_CORE_SOURCE=/tmp/menu-refinement-core node scripts/capture-other-menu-core.mjs
OTHER_MENU_ARTIFACTS=docs/system-menu-refinement node scripts/capture-other-menus.mjs
FIXES_ARTIFACTS=/tmp/menu-refinement-interactions node scripts/test-system-menu-fixes.mjs
FIXES_ARTIFACTS=/tmp/menu-refinement-sd node scripts/test-system-pairing.mjs
node scripts/test-signaling-relay.mjs
node scripts/test-pairing-lifecycle.mjs
TURN_SERVER_BINARY=/path/to/turnserver node scripts/test-automatic-controller-pairing.mjs
node scripts/measure-settings-native.py
node scripts/measure-refined-settings.mjs
```

The automatic test requires coturn and binds only localhost. If its shared
libraries are outside the standard search path, set `TURN_LIBRARY_PATH` for the
test process. Do not use its loopback-peer flags in a public TURN deployment.
Copy the interaction result and SD fixture captures into the comparison folder
as in the first-fix workflow. HOME/keyboard-focus records retained from cb8b37b
are labeled unchanged; their layouts were not changed in this pass. Build the
new viewer with `npm run build:system-menu-refinement`, then `build:layout`.
