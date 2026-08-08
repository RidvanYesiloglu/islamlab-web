"""Extract web-ready Dynomap figures from the current manuscript PDFs.

Usage:
    python extract_paper_assets.py MAIN_PDF SUPPLEMENTARY_PDF OUTPUT_DIRECTORY
"""

from __future__ import annotations

import sys
from pathlib import Path

import pypdf.filters
from PIL import Image
from pypdf import PdfReader


pypdf.filters.ZLIB_MAX_OUTPUT_LENGTH = 400_000_000


def extract(reader: PdfReader, page_number: int, output: Path, max_width: int = 1800) -> None:
    images = list(reader.pages[page_number - 1].images)
    if len(images) != 1:
        raise RuntimeError(f"Expected one figure image on page {page_number}; found {len(images)}")
    image = images[0].image.convert("RGB")
    if image.width > max_width:
        height = round(image.height * max_width / image.width)
        image = image.resize((max_width, height), Image.Resampling.LANCZOS)
    image.save(output, format="PNG", optimize=True)
    print(f"{output.name}: {image.width}x{image.height}")


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("Expected MAIN_PDF SUPPLEMENTARY_PDF OUTPUT_DIRECTORY")
    main_pdf, supplementary_pdf, output_directory = map(Path, sys.argv[1:])
    output_directory.mkdir(parents=True, exist_ok=True)
    main_reader = PdfReader(main_pdf)
    supplementary_reader = PdfReader(supplementary_pdf)
    for page, filename in (
        (3, "figure-1-framework.png"),
        (5, "figure-2-liquid-biopsy.png"),
        (10, "figure-5-bulk-layouts.png"),
        (12, "figure-6-parkinson-layout.png"),
        (16, "figure-8-single-cell.png"),
    ):
        extract(main_reader, page, output_directory / filename)
    extract(supplementary_reader, 3, output_directory / "figure-s2-rareseq-maps.png")


if __name__ == "__main__":
    main()
