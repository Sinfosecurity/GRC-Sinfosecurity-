#!/usr/bin/env python3
"""Render a PPTX through PowerPoint or LibreOffice, then write per-slide PNGs.

HTML reconstructions are not accepted. Fails if no native slide engine is present.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def die(message: str, code: int = 1) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(code)


def which(name: str) -> str | None:
    return shutil.which(name)


def powerpoint_app() -> Path | None:
    candidate = Path("/Applications/Microsoft PowerPoint.app")
    return candidate if candidate.exists() else None


def convert_with_powerpoint(pptx: Path, pdf: Path) -> None:
    variants = [
        f'''
tell application "Microsoft PowerPoint"
    activate
    open POSIX file "{pptx}"
    delay 1
    set dest to POSIX file "{pdf}"
    save active presentation in dest as save as PDF
    close active presentation saving no
end tell
''',
        f'''
tell application "Microsoft PowerPoint"
    activate
    open POSIX file "{pptx}"
    delay 1
    save active presentation in (POSIX file "{pdf}" as string) as save as PDF
    close active presentation saving no
end tell
''',
        f'''
tell application "Microsoft PowerPoint"
    open POSIX file "{pptx}"
    delay 2
    set thePres to active presentation
    save thePres in POSIX file "{pdf}" as save as PDF
    close thePres saving no
end tell
''',
    ]
    errors: list[str] = []
    for script in variants:
        if pdf.exists():
            pdf.unlink()
        completed = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
        if completed.returncode == 0 and pdf.exists() and pdf.stat().st_size > 1000:
            return
        errors.append(completed.stderr.strip() or completed.stdout.strip() or "no PDF written")
    die("PowerPoint PDF export failed: " + " | ".join(errors))


def convert_with_libreoffice(pptx: Path, pdf: Path) -> None:
    soffice = which("soffice") or which("libreoffice")
    if not soffice:
        die("LibreOffice is not installed")
    out_dir = pdf.parent
    profile = Path(tempfile.mkdtemp(prefix="lo-profile-"))
    completed = subprocess.run(
        [
            soffice,
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            "--norestore",
            f"-env:UserInstallation=file://{profile}",
            "--convert-to",
            "pdf:impress_pdf_Export",
            "--outdir",
            str(out_dir),
            str(pptx),
        ],
        capture_output=True,
        text=True,
    )
    produced = out_dir / f"{pptx.stem}.pdf"
    if completed.returncode != 0 or not produced.exists():
        die(f"LibreOffice PDF export failed: {completed.stderr.strip() or completed.stdout.strip() or 'no PDF written'}")
    if produced.resolve() != pdf.resolve():
        produced.replace(pdf)


def pdf_to_pngs(pdf: Path, dest: Path, prefix: str) -> list[Path]:
    dest.mkdir(parents=True, exist_ok=True)
    pdftoppm = which("pdftoppm")
    if pdftoppm:
        completed = subprocess.run(
            [pdftoppm, "-png", "-r", "144", str(pdf), str(dest / prefix)],
            capture_output=True,
            text=True,
        )
        if completed.returncode != 0:
            die(f"pdftoppm failed: {completed.stderr.strip() or completed.stdout.strip()}")
        pages = sorted(dest.glob(f"{prefix}-*.png"))
        if not pages:
            die("pdftoppm wrote no PNG pages")
        return pages
    try:
        import fitz  # type: ignore
    except ImportError:
        die("Neither pdftoppm nor PyMuPDF is available for PDF page images")
    document = fitz.open(pdf)
    pages: list[Path] = []
    for index, page in enumerate(document, start=1):
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        path = dest / f"{prefix}-{index:02d}.png"
        pix.save(str(path))
        pages.append(path)
    document.close()
    return pages


def normalize_names(pages: list[Path], dest: Path) -> list[Path]:
    normalized: list[Path] = []
    for index, page in enumerate(pages, start=1):
        target = dest / f"native-slide-{index:02d}.png"
        if page.resolve() != target.resolve():
            shutil.copyfile(page, target)
        normalized.append(target)
    return normalized


def render(pptx: Path, dest: Path) -> dict:
    if not pptx.exists():
        die(f"PPTX not found: {pptx}")
    dest.mkdir(parents=True, exist_ok=True)
    engine = ""
    with tempfile.TemporaryDirectory(prefix="supreme-pptx-") as tmp:
        pdf = Path(tmp) / f"{pptx.stem}.pdf"
        if powerpoint_app() and which("osascript"):
            convert_with_powerpoint(pptx, pdf)
            engine = "Microsoft PowerPoint"
        elif which("soffice") or which("libreoffice"):
            convert_with_libreoffice(pptx, pdf)
            engine = "LibreOffice"
        else:
            die("No native slide engine. Install Microsoft PowerPoint or LibreOffice.")
        pages = normalize_names(pdf_to_pngs(pdf, Path(tmp), "page"), dest)
    hashes = []
    for page in pages:
        digest = hashlib.sha256(page.read_bytes()).hexdigest()
        hashes.append({"file": page.name, "sha256": digest, "bytes": page.stat().st_size})
    unique = {item["sha256"] for item in hashes}
    if len(pages) < 12:
        die(f"Expected 12 native slides, rendered {len(pages)}")
    reconstruction = "native"
    warning = ""
    if len(unique) < 8:
        reconstruction = "native-attempted"
        warning = f"{engine} produced {len(unique)} unique page images. Distinct Office rendering is still required on a capable engine."
        print(warning, file=sys.stderr)
    payload = {
        "engine": engine,
        "pptx": str(pptx),
        "pages": len(pages),
        "uniqueHashes": len(unique),
        "hashes": hashes,
        "reconstruction": reconstruction,
        "warning": warning,
    }
    (dest / "native-render.json").write_text(json.dumps(payload, indent=2))
    print(json.dumps({"engine": engine, "pages": len(pages), "uniqueHashes": len(unique)}, indent=2))
    return payload


def main() -> None:
    if len(sys.argv) < 3:
        die("Usage: render-pptx-native.py <deck.pptx> <output-dir>")
    render(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve())


if __name__ == "__main__":
    main()
