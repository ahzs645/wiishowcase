# Menu date font

`mplus-1p-bold-latin.woff` is a printable-ASCII subset of **M PLUS 1p Bold**,
copyright 2016 The M+ Project Authors, distributed under the SIL Open Font
License in [OFL.txt](OFL.txt). The subset's internal family name is
`Wii Menu Date Bold`. It is 11,496 bytes and is used only for the menu date
and AM/PM label.

Source: <https://github.com/google/fonts/tree/main/ofl/mplus1p>

Rebuild with `python scripts/subset-menu-date-font.py /path/to/MPLUS1p-Bold.ttf`.
The script keeps printable ASCII and adjusts vertical metrics to contain those
glyphs; the original CJK metrics would extend beyond the menu date's line box.

This is an open-font approximation of the Wii's Rodin lettering. It does not
contain Rodin glyphs or binaries. The original proprietary fonts remain excluded
from the public build. The clock's seven-segment numbers are drawn separately.
