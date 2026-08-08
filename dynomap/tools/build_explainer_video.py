"""Build the silent Dynomap explainer video used on the project page.

The video uses only the current manuscript cover and figures extracted by
``extract_paper_assets.py``. Install ``imageio-ffmpeg`` before running.
"""

from __future__ import annotations

import math
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont

import imageio_ffmpeg


WIDTH, HEIGHT, FPS = 1280, 720, 24
INK = "#071936"
PAPER = "#f8f5ef"
ACCENT = "#a83f35"
SOFT = "#465262"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/seguisb.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def ease(value: float) -> float:
    return value * value * (3 - 2 * value)


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        candidate = word if not current else f"{current} {word}"
        if draw.textbbox((0, 0), candidate, font=face)[2] <= width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def contain(image: Image.Image, box: tuple[int, int, int, int], zoom: float = 1.0, pan: tuple[float, float] = (0.5, 0.5)) -> Image.Image:
    x, y, width, height = box
    scale = min(width / image.width, height / image.height) * zoom
    resized = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (width, height), "white")
    left = round((width - resized.width) * pan[0])
    top = round((height - resized.height) * pan[1])
    canvas.paste(resized, (left, top))
    return canvas.crop((0, 0, width, height))


def caption(frame: Image.Image, eyebrow: str, title: str, body: str = "") -> None:
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    panel_height = 196 if body else 154
    draw.rectangle((0, HEIGHT - panel_height, WIDTH, HEIGHT), fill=(248, 245, 239, 244))
    draw.rectangle((0, HEIGHT - panel_height, 9, HEIGHT), fill=ACCENT)
    small, heading, copy = font(18, True), font(40, True), font(23)
    draw.text((48, HEIGHT - panel_height + 22), eyebrow.upper(), font=small, fill=ACCENT)
    title_lines = wrap(draw, title, heading, WIDTH - 96)
    y = HEIGHT - panel_height + 52
    for line in title_lines[:2]:
        draw.text((48, y), line, font=heading, fill=INK)
        y += 47
    if body:
        draw.text((48, HEIGHT - 43), body, font=copy, fill=SOFT)
    frame.paste(overlay, (0, 0), overlay)


def image_scene(image: Image.Image, progress: float, eyebrow: str, title: str, body: str = "", zoom_to: float = 1.06, brightness: float = 1.0) -> Image.Image:
    amount = ease(progress)
    frame = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    visual = contain(image, (0, 0, WIDTH, HEIGHT), 1 + (zoom_to - 1) * amount)
    if brightness != 1:
        visual = ImageEnhance.Brightness(visual).enhance(brightness)
    frame.paste(visual, (0, 0))
    caption(frame, eyebrow, title, body)
    return frame


def statement_scene(progress: float, first: str, second: str) -> Image.Image:
    frame = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(frame)
    heading, sub = font(54, True), font(31)
    draw.rectangle((70, 86, 82, 634), fill=ACCENT)
    y = 118
    for line in wrap(draw, first, heading, 1040):
        draw.text((124, y), line, font=heading, fill=INK)
        y += 66
    y += 40
    alpha = int(255 * ease(max(0.0, min(1.0, progress * 1.6 - 0.45))))
    layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    layer_draw = ImageDraw.Draw(layer)
    for line in wrap(layer_draw, second, sub, 1010):
        layer_draw.text((124, y), line, font=sub, fill=(70, 82, 98, alpha))
        y += 45
    frame.paste(layer, (0, 0), layer)
    return frame


def closing_scene(progress: float) -> Image.Image:
    frame = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(frame)
    label, heading, copy = font(20, True), font(62, True), font(29)
    draw.text((78, 92), "EXPLORE DYNOMAP", font=label, fill=ACCENT)
    draw.text((78, 148), "59 saved analyses.", font=heading, fill=INK)
    draw.text((78, 225), "One framework for your table.", font=heading, fill=INK)
    draw.text((80, 354), "Review existing results or retrain Dynomap on your own labelled data.", font=copy, fill=SOFT)
    draw.rounded_rectangle((78, 452, 780, 532), radius=8, fill=ACCENT)
    draw.text((112, 470), "app.islamlab.org/dynomap", font=font(31, True), fill="white")
    radius = 84 + 7 * math.sin(progress * math.pi)
    draw.ellipse((1030 - radius, 360 - radius, 1030 + radius, 360 + radius), outline="#476d89", width=4)
    for index in range(18):
        angle = index * 2.399 + progress * 0.7
        distance = 18 + (index * 29) % max(20, int(radius - 12))
        x = 1030 + math.cos(angle) * distance
        y = 360 + math.sin(angle) * distance
        color = (ACCENT, "#476d89", "#b38536")[index % 3]
        draw.ellipse((x - 5, y - 5, x + 5, y + 5), fill=color)
    return frame


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Expected ASSET_DIRECTORY OUTPUT_MP4")
    assets, output = Path(sys.argv[1]), Path(sys.argv[2])
    output.parent.mkdir(parents=True, exist_ok=True)
    images = {
        "cover": Image.open(assets / "og.png").convert("RGB"),
        "framework": Image.open(assets / "figure-1-framework.png").convert("RGB"),
        "maps": Image.open(assets / "figure-s2-rareseq-maps.png").convert("RGB"),
        "bulk": Image.open(assets / "figure-5-bulk-layouts.png").convert("RGB"),
        "single": Image.open(assets / "figure-8-single-cell.png").convert("RGB"),
    }
    scenes = [
        (6, lambda p: image_scene(images["cover"], p, "DYNOMAP", "Learn the structure hidden in biomedical tables.", zoom_to=1.025)),
        (7, lambda p: statement_scene(p, "A table has measurements, but no meaningful geometry.", "Dynomap makes feature organization learnable.")),
        (11, lambda p: image_scene(images["framework"], p, "FIGURE 1 | CURRENT MANUSCRIPT", "Coordinates, rendering and prediction are optimized together.", "The map changes with the task.", zoom_to=1.12)),
        (9, lambda p: image_scene(images["maps"], p, "REAL RARE-SEQ CFRNA SAMPLES", "One learned topology. Sample-specific Dynomaps.", "LIHC · LUAD · PAAD · PRAD", zoom_to=1.08)),
        (9, lambda p: image_scene(images["bulk"], p, "LEARNED FEATURE LAYOUTS", "Predictive genes concentrate into local neighborhoods.", "Observed spatial structure is compared with shuffled-layout nulls.", zoom_to=1.1)),
        (8, lambda p: image_scene(images["single"], p, "ACROSS BIOMEDICAL MODALITIES", "Liquid biopsy, bulk RNA, voice phenomics and single cells.", "Real figures and stored evaluations from the manuscript.", zoom_to=1.07)),
        (7, closing_scene),
    ]
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        ffmpeg, "-y", "-f", "rawvideo", "-vcodec", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "-", "-an", "-vcodec", "libx264",
        "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    first_frame: Image.Image | None = None
    assert process.stdin is not None
    for duration, renderer in scenes:
        frame_count = duration * FPS
        for index in range(frame_count):
            frame = renderer(index / max(1, frame_count - 1))
            if first_frame is None:
                first_frame = frame.copy()
            process.stdin.write(frame.tobytes())
    process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError("ffmpeg failed")
    assert first_frame is not None
    first_frame.save(output.with_name("dynomap-demo-poster.jpg"), quality=90, optimize=True)
    print(f"wrote {output} ({sum(duration for duration, _ in scenes)} seconds)")


if __name__ == "__main__":
    main()
