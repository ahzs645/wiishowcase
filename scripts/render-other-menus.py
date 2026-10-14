"""Evidence contact sheets; preserve source image aspect and label reference limits."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root = Path("docs/other-menus")
audit = json.loads((root / "audit.json").read_text())
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 19)
small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)

def place(canvas, path, box):
    image = Image.open(path).convert("RGB")
    x, y, w, h = box
    scale = min(w / image.width, h / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    canvas.paste(image, (round(x + (w - image.width) / 2), round(y + (h - image.height) / 2)))

# Four matched/structural examples plus two actual current defects. The source
# screenshots themselves are retained unmodified in their evidence directories.
ids = ["date", "sound", "settings-one", "sd-start", "system-phone", "letter-open"]
canvas = Image.new("RGB", (1320, len(ids) * 390 + 70), "#e8eef4")
d = ImageDraw.Draw(canvas)
d.text((20, 15), "Original Wii reference (left) / current app (right) — captured 14 October 2026", font=font, fill="#243c50")
for i, id in enumerate(ids):
    state = next(s for s in audit["states"] if s["id"] == id)
    mode = "16:9" if id == "settings-one" else "4:3"
    cap = next(c for c in state["captures"] if c["mode"] == mode and c["height"] == 480)
    y = 70 + i * 390
    d.text((20, y), state["title"] + " · " + mode + " · " + cap["reference"]["id"], font=font, fill="#243c50")
    place(canvas, Path("docs/interface-audit") / cap["reference"]["image"], (15, y + 35, 630, 340))
    place(canvas, root / cap["image"], (675, y + 35, 630, 340))
canvas.save(root / "overview/audit-overview.jpg", quality=90)

canvas = Image.new("RGB", (1320, 570), "#e8eef4")
d = ImageDraw.Draw(canvas)
for i, (id, title) in enumerate([("reconnect", "Reconnect: title and close button clipped"), ("update-current", "Update: oversized OK and background focus leakage")]):
    d.text((i * 660 + 12, 12), title, font=font, fill="#243c50")
    place(canvas, root / f"current/{id}-640x480.png", (i * 660 + 10, 55, 640, 480))
canvas.save(root / "overview/broken-controls.jpg", quality=92)

# Independent first-button outline from original source pixels, then contain-fit
# into the target frame. This is approximate: cyan/glow pixels and DOM bounds are
# different edge definitions, and the 4:3 source has a four-line capture crop.
app = json.loads((root / "settings-metrics.json").read_text())
measurements = []
for c in app:
    wide = c["width"] / c["height"] > 1.5
    id = "settings-wii-guide" if wide else "copetti-settings"
    image = Image.open(f"docs/interface-audit/references/{id}.png").convert("RGB")
    a = np.asarray(image, dtype=int)
    mask = (a[:, :, 2] > 140) & (a[:, :, 1] > 110) & (a[:, :, 2] > a[:, :, 0] * 1.12) & (a[:, :, 1] > a[:, :, 0] * 1.1)
    rows = np.flatnonzero(mask.sum(axis=1) > image.width * 0.1)
    groups = []
    for y in rows:
        if not groups or y > groups[-1][-1] + 1: groups.append([int(y)])
        else: groups[-1].append(int(y))
    top, bottom = groups[0][0], groups[1][-1] + 1
    xs = np.flatnonzero(mask[top:bottom].any(axis=0))
    rect = [int(xs[0]), top, int(xs[-1]) + 1 - int(xs[0]), bottom - top]
    scale = min(c["width"] / image.width, c["height"] / image.height)
    projected = [(c["width"] - image.width * scale) / 2 + rect[0] * scale,
                 (c["height"] - image.height * scale) / 2 + rect[1] * scale,
                 rect[2] * scale, rect[3] * scale]
    actual = [c["buttons"][0]["rect"][key] for key in ["x", "y", "width", "height"]]
    measurements.append({"source": id, "width": c["width"], "height": c["height"], "originalOutlineXYWH": rect,
                         "containFitOutlineXYWH": projected, "currentDOMXYWH": actual,
                         "approximateDeltaXYWH": [b - a for a, b in zip(projected, actual)]})
(root / "settings-outline-measurements.json").write_text(json.dumps({
    "method": "First button's cyan/glow outline from original source pixels, contain-fitted without changing aspect, compared to current DOM border box. These edge definitions differ; allow approximately 2 native pixels for edge/filter uncertainty. 4:3 capture crop adds framing uncertainty. No overall accuracy score.",
    "measurements": measurements}, indent=2) + "\n")
print("Rendered comparison sheets and independent Settings outline measurements.")
