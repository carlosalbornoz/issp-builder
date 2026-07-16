#!/usr/bin/env python3
"""
Zero-dependency DOCX → Markdown extractor for the docx-to-issp skill.

A .docx is a ZIP archive. This script:
  1. Reads word/document.xml and reconstructs the text + TABLE structure as
     Markdown (the DICT ISSP template is almost entirely tables, so preserving
     them is essential for field mapping).
  2. Extracts every image under word/media/ into a manifest JSON, each as a
     base64 data URL with its mime, byte size, and an `embeddable` flag (the
     ISSP Builder only accepts png/jpeg/webp/svg — emf/wmf are flagged false).

Only the Python standard library is used (zipfile + xml.etree + base64).
Run:  python3 extract_docx.py <input.docx> [output_dir]

Outputs (written next to the docx, or in output_dir):
  <basename>.extracted.md     — Markdown of the document body
  <basename>.images.json      — [{path, mime, dataUrl, bytes, embeddable}, ...]
Stdout: a one-line summary.
"""

import sys
import os
import json
import base64
import zipfile
import xml.etree.ElementTree as ET

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _q(tag):
    return f"{{{W}}}{tag}"


def local(tag):
    """Strip XML namespace: '{ns}tag' → 'tag'."""
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def para_text(p):
    """Concatenate all <w:t> text in a paragraph; treat tab/br as spaces."""
    parts = []
    for node in p.iter():
        t = local(node.tag)
        if t == "t":
            parts.append(node.text or "")
        elif t in ("tab", "br"):
            parts.append(" ")
    return "".join(parts).strip()


def para_heading_level(p):
    """Return 1-6 if the paragraph is a heading, else 0."""
    ppr = p.find(_q("pPr"))
    if ppr is None:
        return 0
    style = ppr.find(_q("pStyle"))
    if style is None:
        return 0
    val = (style.get(_q("val")) or "").lower()
    # Handles 'Heading1', 'heading 2', 'Titre3', etc.
    for prefix in ("heading", "titre", "uberschrift"):
        if prefix in val:
            digits = "".join(c for c in val if c.isdigit())
            if digits:
                lvl = int(digits)
                if 1 <= lvl <= 6:
                    return lvl
    if val == "title":
        return 1
    return 0


def cell_text(tc):
    """Join all paragraph text in a table cell with ' / '."""
    texts = []
    for p in tc.iter(_q("p")):
        t = para_text(p)
        if t:
            texts.append(t)
    return " / ".join(texts).replace("|", "\\|").strip()


def iter_blocks(parent):
    """Yield ('p', elem) or ('tbl', elem) for direct block children, recursing
    past grouping elements like <w:body> wrappers if present."""
    for child in parent:
        t = local(child.tag)
        if t == "p":
            yield ("p", child)
        elif t == "tbl":
            yield ("tbl", child)


def render_table(tbl):
    """Render a <w:tbl> as a GitHub-flavored Markdown table."""
    rows = []
    for tr in tbl.iter(_q("tr")):
        cells = [cell_text(tc) for tc in tr.findall(_q("tc"))]
        # Skip fully empty rows
        if any(c for c in cells):
            rows.append(cells)
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    header = rows[0]
    sep = ["---"] * width
    body = rows[1:] if len(rows) > 1 else []
    lines = ["| " + " | ".join(header) + " |",
             "| " + " | ".join(sep) + " |"]
    for r in body:
        lines.append("| " + " | ".join(r) + " |")
    return "\n".join(lines)


def render_body(root):
    """Walk <w:document><w:body> and produce Markdown text."""
    out = []
    body = root.find(_q("body"))
    if body is None:
        return ""
    for kind, elem in iter_blocks(body):
        if kind == "p":
            lvl = para_heading_level(elem)
            txt = para_text(elem)
            if not txt:
                continue
            if lvl:
                out.append(f"{'#' * lvl} {txt}")
            else:
                out.append(txt)
        elif kind == "tbl":
            rendered = render_table(elem)
            if rendered:
                out.append(rendered)
            out.append("")  # blank line around tables
    # Collapse 3+ blank lines to one
    text = "\n\n".join(block.strip("\n") for block in "\n".join(out).split("\n\n"))
    return text.strip() + "\n"


# ── Image extraction ────────────────────────────────────────────────────────

# The ISSP Builder accepts exactly these mimes (see validateImageDataUrl).
ACCEPTED = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "svg": "image/svg+xml",
}
# Seen in Word docs but NOT accepted by the app — flag for manual handling.
REJECTED = {"emf", "wmf", "gif", "bmp", "tiff", "tif"}


def image_manifest(zf):
    """List every word/media/* file as a data-URL manifest entry."""
    manifest = []
    for name in sorted(zf.namelist()):
        if not name.startswith("word/media/"):
            continue
        ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
        data = zf.read(name)
        mime = ACCEPTED.get(ext)
        embeddable = mime is not None
        if mime is None:
            mime = f"image/{ext}" if ext else "application/octet-stream"
        data_url = f"data:{mime};base64," + base64.b64encode(data).decode("ascii")
        entry = {
            "path": name,
            "mime": mime,
            "bytes": len(data),
            "embeddable": embeddable,
            "dataUrl": data_url if embeddable else None,
        }
        if ext in REJECTED:
            entry["warning"] = (
                f".{ext} is not accepted by the app (png/jpg/webp/svg only). "
                "Skip it, or convert it and re-run."
            )
        manifest.append(entry)
    return manifest


def main(argv):
    if len(argv) < 2:
        print("usage: extract_docx.py <input.docx> [output_dir]", file=sys.stderr)
        return 2
    docx_path = argv[1]
    out_dir = argv[2] if len(argv) > 2 else os.path.dirname(os.path.abspath(docx_path))
    base = os.path.splitext(os.path.basename(docx_path))[0]

    if not zipfile.is_zipfile(docx_path):
        print(f"ERROR: not a valid .docx (zip) file: {docx_path}", file=sys.stderr)
        return 1

    zf = zipfile.ZipFile(docx_path)
    try:
        try:
            xml_bytes = zf.read("word/document.xml")
        except KeyError:
            print("ERROR: docx has no word/document.xml", file=sys.stderr)
            return 1
        root = ET.fromstring(xml_bytes)
        md = render_body(root)
        manifest = image_manifest(zf)
    finally:
        zf.close()

    os.makedirs(out_dir, exist_ok=True)
    md_path = os.path.join(out_dir, f"{base}.extracted.md")
    img_path = os.path.join(out_dir, f"{base}.images.json")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md)
    with open(img_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)

    embeddable = [m for m in manifest if m["embeddable"]]
    rejected = [m for m in manifest if not m["embeddable"]]
    print(
        f"OK  markdown → {md_path} ({len(md):,} chars)  |  "
        f"images → {img_path} "
        f"({len(embeddable)} embeddable, {len(rejected)} unsupported)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
