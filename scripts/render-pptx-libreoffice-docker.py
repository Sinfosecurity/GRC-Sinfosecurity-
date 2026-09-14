#!/usr/bin/env python3
"""Render a PPTX through LibreOffice in Docker, then write per-slide PNGs via PyMuPDF.

This is not Microsoft PowerPoint. HTML reconstructions are not used.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import fitz

IMAGE = "minidocks/libreoffice:latest"


def die(message: str, code: int = 1) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(code)


def render(pptx: Path, dest: Path) -> dict:
    if not pptx.exists():
        die(f"PPTX not found: {pptx}")
    if not shutil.which("docker"):
        die("docker is not installed")
    dest.mkdir(parents=True, exist_ok=True)
    work = dest / "_work"
    work.mkdir(parents=True, exist_ok=True)
    copied = work / pptx.name
    shutil.copyfile(pptx, copied)
    pull = subprocess.run(["docker", "pull", IMAGE], capture_output=True, text=True)
    if pull.returncode != 0:
        die(f"docker pull failed: {pull.stderr.strip() or pull.stdout.strip()}")
    converted = subprocess.run(
        [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{work.resolve()}:/work",
            "-w",
            "/work",
            IMAGE,
            "soffice",
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            "--norestore",
            "--convert-to",
            "pdf:impress_pdf_Export",
            "--outdir",
            "/work",
            pptx.name,
        ],
        capture_output=True,
        text=True,
    )
    pdf = work / f"{pptx.stem}.pdf"
    if converted.returncode != 0 or not pdf.exists():
        die(f"LibreOffice convert failed: {converted.stderr.strip() or converted.stdout.strip()}")
    document = fitz.open(pdf)
    pages = []
    hashes = []
    for index, page in enumerate(document, start=1):
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        path = dest / f"lo-slide-{index:02d}.png"
        pix.save(str(path))
        pages.append(path)
        digest = __import__("hashlib").sha256(path.read_bytes()).hexdigest()
        hashes.append({"file": path.name, "sha256": digest, "bytes": path.stat().st_size})
    document.close()
    unique = {item["sha256"] for item in hashes}
    payload = {
        "engine": "LibreOffice (Docker minidocks/libreoffice)",
        "nativePowerPoint": False,
        "pptx": str(pptx),
        "pages": len(pages),
        "uniqueHashes": len(unique),
        "hashes": hashes,
        "reconstruction": "libreoffice-impress",
    }
    (dest / "libreoffice-render.json").write_text(json.dumps(payload, indent=2))
    print(json.dumps({"engine": payload["engine"], "pages": len(pages), "uniqueHashes": len(unique)}, indent=2))
    return payload


def main() -> None:
    if len(sys.argv) < 3:
        die("Usage: render-pptx-libreoffice-docker.py <deck.pptx> <output-dir>")
    render(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve())


if __name__ == "__main__":
    main()
