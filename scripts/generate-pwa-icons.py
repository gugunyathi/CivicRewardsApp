#!/usr/bin/env python3
"""Generate the CivicRewards PWA icon set from brand artwork.

Usage:
    python scripts/generate-pwa-icons.py --mark <logo-mark.png> [--lockup <lockup.png>]
    python scripts/generate-pwa-icons.py --temp   # navy/CR placeholder set (dev only)

--mark   : square-ish logo mark (shield). White margins are auto-trimmed.
--lockup : wide lockup with wordmark (for splash screens). Falls back to --mark.
--out    : output dir (default public/icons, relative to repo root).

Outputs: icon-192/512 (any), maskable-192/512, apple-touch-icon (180),
favicon-16/32, and iOS splash screens.
"""
import argparse
import os
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFont

NAVY = (11, 37, 69)
GOLD = (201, 151, 28)
WHITE = (255, 255, 255)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_rgba(path):
    img = Image.open(path)
    if img.mode in ("RGBA", "LA"):
        bg = Image.new("RGBA", img.size, WHITE + (255,))
        return Image.alpha_composite(bg, img.convert("RGBA")).convert("RGB")
    return img.convert("RGB")


def trim_white(img, thresh=12):
    bg = Image.new("RGB", img.size, WHITE)
    diff = ImageChops.difference(img, bg)
    bbox = diff.point(lambda p: 255 if p > thresh else 0).getbbox()
    return img.crop(bbox) if bbox else img


def key_out_exterior_white(img, thresh=10):
    """Flood-fill the connected exterior white to transparency (RGBA).

    Keeps interior whites that are part of the artwork (e.g. inside the
    shield) while letting the mark sit directly on brand navy.
    """
    from PIL import ImageDraw as _D
    from PIL import ImageFilter as _F

    rgba = img.convert("RGBA")
    # Flood fill from all four corners on a copy.
    fill_img = rgba.convert("RGB")
    for seed in [(0, 0), (rgba.width - 1, 0), (0, rgba.height - 1),
                 (rgba.width - 1, rgba.height - 1)]:
        try:
            _D.floodfill(fill_img, seed, (255, 0, 255), thresh=thresh)
        except Exception:
            pass
    # Pixels turned magenta were exterior white → transparent.
    px = fill_img.load()
    alpha = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b = px[x, y]
            if (r, g, b) == (255, 0, 255):
                alpha[x, y] = (0, 0, 0, 0)
    # Erode alpha 1px to remove anti-aliased white fringe on dark grounds.
    rgba.putalpha(rgba.getchannel("A").filter(_F.MinFilter(3)))
    return rgba


def center_square(img):
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def fit_into(img, size, bg, scale=1.0):
    """Resize img to fit within size*scale, centered on bg color canvas."""
    canvas = Image.new("RGB", (size, size), bg)
    target = int(size * scale)
    thumb = img.copy()
    thumb.thumbnail((target, target), Image.LANCZOS)
    box = ((size - thumb.width) // 2, (size - thumb.height) // 2)
    if thumb.mode == "RGBA":
        canvas.paste(thumb, box, thumb)
    else:
        canvas.paste(thumb, box)
    return canvas.convert("RGB")


def temp_mark(size=1024):
    """Clearly-labeled placeholder mark (dev only, replaced by real logo)."""
    img = Image.new("RGB", (size, size), NAVY)
    d = ImageDraw.Draw(img)
    pad = size // 8
    d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=size // 10,
                        outline=GOLD, width=max(6, size // 90))
    try:
        font = ImageFont.truetype("C:\\Windows\\Fonts\\arial.ttf", size // 3)
    except OSError:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                                      size // 3)
        except OSError:
            font = ImageFont.load_default()
    d.text((size // 2, size // 2 - size // 24), "CR", fill=WHITE, font=font, anchor="mm")
    return img


def splash(base, art, size):
    """Splash: white background (lockup has navy type), artwork at ~62% width."""
    w, h = size
    canvas = Image.new("RGB", (w, h), WHITE)
    target_w = int(w * 0.62)
    thumb = art.copy()
    thumb.thumbnail((target_w, int(h * 0.5)), Image.LANCZOS)
    box = ((w - thumb.width) // 2, (h - thumb.height) // 2)
    if thumb.mode == "RGBA":
        canvas.paste(thumb, box, thumb)
    else:
        canvas.paste(thumb, box)
    # thin navy rule under artwork
    d = ImageDraw.Draw(canvas)
    y = (h + thumb.height) // 2 + 24
    d.line([(w // 2 - 60, y), (w // 2 + 60, y)], fill=NAVY, width=6)
    return canvas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mark", help="path to square logo mark")
    ap.add_argument("--lockup", help="path to wide lockup (splash screens)")
    ap.add_argument("--out", default=os.path.join(ROOT, "public", "icons"))
    ap.add_argument("--temp", action="store_true", help="generate placeholder set")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    temp = args.temp or not args.mark
    if temp:
        print("TEMP MODE: drawing placeholder artwork (replace with real logos).")
        mark = temp_mark()
        lockup = temp_mark()
    else:
        mark = trim_white(center_square(load_rgba(args.mark)))
        lockup = trim_white(load_rgba(args.lockup)) if args.lockup else mark

    keyed = mark if temp else key_out_exterior_white(mark, thresh=48)
    jobs = [
        ("icon-192.png", fit_into(mark, 192, WHITE)),
        ("icon-512.png", fit_into(mark, 512, WHITE)),
        ("maskable-192.png", fit_into(keyed, 192, NAVY, scale=0.72)),
        ("maskable-512.png", fit_into(keyed, 512, NAVY, scale=0.72)),
        ("apple-touch-icon.png", fit_into(mark, 180, WHITE, scale=0.86)),
        ("favicon-32.png", fit_into(mark, 32, WHITE)),
        ("favicon-16.png", fit_into(mark, 16, WHITE)),
        ("splash-1170x2532.png", splash(mark, lockup, (1170, 2532))),
        ("splash-1290x2796.png", splash(mark, lockup, (1290, 2796))),
        ("splash-2048x2732.png", splash(mark, lockup, (2048, 2732))),
    ]
    for name, img in jobs:
        path = os.path.join(args.out, name)
        img.save(path, optimize=True)
        print(f"wrote {path} ({img.width}x{img.height})")


if __name__ == "__main__":
    sys.exit(main())
