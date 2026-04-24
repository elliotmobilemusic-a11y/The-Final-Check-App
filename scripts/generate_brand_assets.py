from pathlib import Path
from typing import Iterable

from PIL import Image, ImageColor, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]

DARK = ImageColor.getrgb("#10141b")
DARK_TOP = ImageColor.getrgb("#141924")
GOLD = ImageColor.getrgb("#c6a161")
GOLD_SOFT = ImageColor.getrgb("#e9d7ad")
OFF_WHITE = ImageColor.getrgb("#f5f1eb")
MUTED = ImageColor.getrgb("#7d7671")


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


SERIF_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
SERIF = "/System/Library/Fonts/Supplemental/Georgia.ttf"
SANS = "/System/Library/Fonts/SFNS.ttf"


def fit_font(draw: ImageDraw.ImageDraw, text: str, font_path: str, target_width: int, start_size: int) -> ImageFont.FreeTypeFont:
    size = start_size
    while size > 12:
      font = load_font(font_path, size)
      bbox = draw.textbbox((0, 0), text, font=font)
      if bbox[2] - bbox[0] <= target_width:
          return font
      size -= 2
    return load_font(font_path, 12)


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size)
    px = image.load()
    for y in range(height):
        ratio = y / max(height - 1, 1)
        color = tuple(int(top[i] * (1 - ratio) + bottom[i] * ratio) for i in range(3)) + (255,)
        for x in range(width):
            px[x, y] = color
    return image


def add_highlights(image: Image.Image) -> None:
    width, height = image.size
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.ellipse(
        (-0.22 * width, -0.18 * height, 0.72 * width, 0.76 * height),
        fill=(214, 178, 106, 42),
    )
    draw.ellipse(
        (0.52 * width, -0.06 * height, 1.22 * width, 0.56 * height),
        fill=(255, 255, 255, 18),
    )
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=max(16, width // 22)))
    image.alpha_composite(overlay)


def draw_check(draw: ImageDraw.ImageDraw, size: int, color: tuple[int, int, int], width: int, y_shift: float = 0.0) -> None:
    points = [
        (size * 0.33, size * (0.62 + y_shift)),
        (size * 0.46, size * (0.75 + y_shift)),
        (size * 0.72, size * (0.49 + y_shift)),
    ]
    draw.line(points, fill=color, width=width, joint="curve")


def render_icon(size: int, background: bool, transparent_foreground: bool = False, safe_padding: float = 0.18) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    if background:
        base = vertical_gradient((size, size), DARK_TOP, DARK)
        add_highlights(base)
        canvas.alpha_composite(base)
        pad = int(size * 0.04)
        draw.rounded_rectangle(
            (pad, pad, size - pad, size - pad),
            radius=int(size * 0.24),
            outline=(214, 178, 106, 44),
            width=max(2, size // 96),
        )

    fg_draw = draw
    if transparent_foreground:
        fg_draw = ImageDraw.Draw(canvas)

    margin = int(size * safe_padding)
    ring_box = (margin, margin, size - margin, size - margin)
    fg_draw.ellipse(
        ring_box,
        outline=GOLD,
        width=max(4, size // 32),
    )

    letter_font = load_font(SERIF_BOLD, int(size * 0.28))
    letters = "TFC"
    bbox = fg_draw.textbbox((0, 0), letters, font=letter_font)
    text_x = (size - (bbox[2] - bbox[0])) / 2
    text_y = size * 0.29
    fg_draw.text((text_x, text_y), letters, fill=OFF_WHITE, font=letter_font)

    divider_y = size * 0.61
    fg_draw.rounded_rectangle(
        (size * 0.27, divider_y, size * 0.73, divider_y + max(4, size * 0.022)),
        radius=max(3, int(size * 0.011)),
        fill=GOLD_SOFT,
    )
    draw_check(fg_draw, size, GOLD, max(6, size // 28), 0.03)

    return canvas


def render_splash(size: tuple[int, int]) -> Image.Image:
    width, height = size
    base = vertical_gradient(size, DARK_TOP, DARK)
    add_highlights(base)
    draw = ImageDraw.Draw(base)

    mono_size = int(min(width, height) * 0.22)
    mono = render_icon(mono_size, background=False, transparent_foreground=True, safe_padding=0.26)
    mono_x = (width - mono_size) // 2
    mono_y = int(height * 0.18)
    base.alpha_composite(mono, (mono_x, mono_y))

    title_font = fit_font(draw, "THE FINAL CHECK", SERIF_BOLD, int(width * 0.82), int(min(width, height) * 0.12))
    title_bbox = draw.textbbox((0, 0), "THE FINAL CHECK", font=title_font)
    title_x = (width - (title_bbox[2] - title_bbox[0])) / 2
    title_y = mono_y + mono_size + int(height * 0.06)
    draw.text((title_x, title_y), "THE FINAL CHECK", fill=OFF_WHITE, font=title_font)

    subtitle = "PROFIT AND PERFORMANCE CONSULTANCY"
    subtitle_font = fit_font(draw, subtitle, SANS, int(width * 0.82), int(min(width, height) * 0.045))
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_x = (width - (subtitle_bbox[2] - subtitle_bbox[0])) / 2
    subtitle_y = title_y + (title_bbox[3] - title_bbox[1]) + int(height * 0.04)
    draw.text((subtitle_x, subtitle_y), subtitle, fill=GOLD, font=subtitle_font)

    label = "Hospitality consultancy portal"
    label_font = fit_font(draw, label, SANS, int(width * 0.68), int(min(width, height) * 0.03))
    label_bbox = draw.textbbox((0, 0), label, font=label_font)
    label_x = (width - (label_bbox[2] - label_bbox[0])) / 2
    label_y = subtitle_y + (subtitle_bbox[3] - subtitle_bbox[1]) + int(height * 0.03)
    draw.text((label_x, label_y), label, fill=MUTED, font=label_font)

    return base


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG")


def generate_public_assets() -> None:
    save_png(render_icon(512, background=True), ROOT / "public/the-final-check-favicon.png")
    save_png(render_icon(512, background=True), ROOT / "public/icons/icon-512.png")
    save_png(render_icon(192, background=True), ROOT / "public/icons/icon-192.png")
    save_png(render_icon(512, background=True, safe_padding=0.12), ROOT / "public/icons/icon-maskable-512.png")
    save_png(render_icon(180, background=True), ROOT / "public/icons/apple-touch-icon.png")


def generate_android_icons() -> None:
    icon_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    foreground_sizes = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432,
    }

    for folder, size in icon_sizes.items():
        directory = ROOT / "android/app/src/main/res" / folder
        save_png(render_icon(size, background=True), directory / "ic_launcher.png")
        save_png(render_icon(size, background=True), directory / "ic_launcher_round.png")

    for folder, size in foreground_sizes.items():
        directory = ROOT / "android/app/src/main/res" / folder
        save_png(render_icon(size, background=False, transparent_foreground=True, safe_padding=0.26), directory / "ic_launcher_foreground.png")


def generate_android_splashes() -> None:
    portrait_sizes = {
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
    }
    landscape_sizes = {
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
    }

    for folder, size in portrait_sizes.items():
        save_png(render_splash(size), ROOT / "android/app/src/main/res" / folder / "splash.png")

    for folder, size in landscape_sizes.items():
        save_png(render_splash(size), ROOT / "android/app/src/main/res" / folder / "splash.png")

    save_png(render_splash((480, 320)), ROOT / "android/app/src/main/res/drawable/splash.png")


def main() -> None:
    generate_public_assets()
    generate_android_icons()
    generate_android_splashes()
    print("Generated The Final Check Android and PWA branding assets.")


if __name__ == "__main__":
    main()
