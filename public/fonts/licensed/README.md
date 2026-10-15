# Licensed site fonts

These subsets derive from the eight Rodin/NewRodin OTFs supplied by the user.
The user confirmed licensed web embedding on this public Wii showcase on
15 October 2026. They are proprietary Fontworks fonts, outside Wii.css's MIT
license, and are not included in the reusable Wii.css distribution.

`manifest.json` records original hashes, family/weight metadata and output sizes.
Glyph paths and advances are retained. Latin line metrics omit the unused CJK
line gap; the subset covers Latin, extended Latin, punctuation and UI symbols.
Other scripts fall back to browser fonts.

Rebuild with `scripts/subset-licensed-interface-fonts.py <source-font-folder>`
using fontTools and its Brotli extension. A clone does not grant downstream
users a font license; they must use their own licensed files or the separately
preserved OFL fallback assets.
