#!/usr/bin/env python3
"""Prepare individually verifiable, complete PDF ZIPs for the ILC paper series.

The canonical ILC catalog determines which *published* edition belongs in each
series. The stable Zenodo concept DOI identifies the version family. Every
included PDF is independently retrieved and checksum-verified against Zenodo.
An unpublished or mismatched record aborts archive creation.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import io
import json
import re
import unicodedata
import zipfile
from pathlib import Path

from zenodo_latest_sync import published_record, verified_pdf

ROOT = Path(__file__).resolve().parents[1]
TAG = "ilc-series-current"
RELEASE_BASE = (
    "https://github.com/zedjames/institute-lux-consilio/releases/download/"
    + TAG + "/"
)
SCHEMA = "ilc-series-archive-v1"


def slug(value: str, maximum: int = 75) -> str:
    plain = unicodedata.normalize("NFKD", str(value or "").replace("–", "-").replace("—", "-").replace("−", "-"))
    plain = plain.encode("ascii", "ignore").decode("ascii").lower()
    out = re.sub(r"[^a-z0-9]+", "-", plain).strip("-")
    return out[:maximum].rstrip("-") or "untitled"


def read_catalog():
    catalog = json.loads((ROOT / "research/catalog.json").read_text(encoding="utf-8"))
    pins = json.loads((ROOT / "research/zenodo-concepts.json").read_text(encoding="utf-8"))["papers"]
    pubs = catalog["publications"]
    if {p["id"] for p in pubs} != set(pins):
        raise ValueError("Publication registry differs from audited Zenodo concept families")
    return catalog, pins


def series_groups(catalog):
    titles = {s["id"]: s["label"] for s in json.loads(
        (ROOT / "assets/data/research.js").read_text(encoding="utf-8")
            .removeprefix("window.ILC_DATA=").rstrip().removesuffix(";")
    )["series"]}
    groups = {}
    for p in catalog["publications"]:
        sid = p.get("seriesId")
        if not sid or not p.get("doi"):
            continue
        groups.setdefault(sid, []).append(p)
    for sid, papers in groups.items():
        papers.sort(key=lambda p: (int(p.get("order") or 0), p["id"]))
        orders = [p.get("order") for p in papers]
        if len(set(orders)) != len(orders) or len(orders) < 1:
            raise ValueError("Invalid or duplicate series order: " + sid)
        if sid not in titles:
            raise ValueError("Unregistered public research series: " + sid)
    return {sid: (titles[sid], papers) for sid, papers in sorted(groups.items())}


def archive_name(sid):
    if not re.fullmatch(r"[a-z0-9-]+", sid):
        raise ValueError("Unsafe series ID")
    return "ilc-series-" + sid + ".zip"


def fingerprint(title, papers, pins):
    items = [
        {
            "id": p["id"], "order": p["order"], "title": p["title"],
            "doi": p["doi"], "concept": pins[p["id"]]["concept_doi"],
            "version": p.get("version"), "date": p.get("date"),
            "pdf": p.get("pdf"), "sha256": p.get("pdfSha256"),
        }
        for p in papers
    ]
    payload = json.dumps([title, items], ensure_ascii=False,
                         sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def archive_index(catalog, pins):
    result = {}
    for sid, (title, papers) in series_groups(catalog).items():
        result[sid] = {
            "title": title,
            "paperCount": len(papers),
            "archive": archive_name(sid),
            "url": RELEASE_BASE + archive_name(sid),
            "fingerprint": fingerprint(title, papers, pins),
        }
    return {"schema": SCHEMA, "series": result}


def _zip_write(zf, filename, payload):
    info = zipfile.ZipInfo(filename, date_time=(2026, 1, 1, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o644 << 16
    zf.writestr(info, payload, compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)


def build_archive(sid, title, papers, pins, outdir):
    entries = []
    documents = []
    for p in papers:
        pin = pins[p["id"]]
        doc = published_record(p, pin)
        if doc["doi"] != p["doi"]:
            raise ValueError(
                f"{p['id']}: catalog not yet synchronized: "
                f"stored={p['doi']}, latest={doc['doi']}"
            )
        payload, source = verified_pdf(doc)
        sha256 = hashlib.sha256(payload).hexdigest()
        # A Zenodo-linked ILC PDF must be identical to the remote published file.
        if str(p.get("pdf", "")).startswith("https://zenodo.org/"):
            if p.get("pdfSha256") and p["pdfSha256"] != sha256:
                raise ValueError(f"{p['id']}: catalog checksum differs from Zenodo PDF")
        version = str(p.get("version") or "published").removeprefix("v")
        filename = (
            f"Paper-{int(p['order']):02d}-{slug(p['title'], 63)}"
            f"-v{slug(version, 15)}.pdf"
        )
        if filename in {name for name, _ in documents}:
            raise ValueError("Archive filename collision: " + filename)
        documents.append((filename, payload))
        entries.append({
            "paper": int(p["order"]),
            "title": p["title"],
            "version": p.get("version"),
            "published": p.get("date"),
            "versionDOI": p["doi"],
            "conceptDOI": pin["concept_doi"],
            "file": filename,
            "sourcePDF": source,
            "sha256": sha256,
            "bytes": len(payload),
        })
        print("VERIFIED_SERIES_PDF", sid, p["id"], p["doi"], sha256, flush=True)

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    manifest = {
        "schema": SCHEMA,
        "seriesId": sid,
        "seriesTitle": title,
        "generatedUTC": now,
        "institution": "Institute Lux Consilio",
        "source": "https://instituteluxconsilio.org/",
        "papers": entries,
    }
    lines = [
        "# " + title,
        "",
        "Institute Lux Consilio — complete published paper series",
        "Archive assembled (UTC): " + now,
        "",
        "These are the latest published Zenodo PDFs verified when this",
        "archive was assembled. For newer editions and corrections,",
        "return to the Institute Lux Consilio scholarly series page.",
        "Every file retains its original version DOI and stable concept",
        "DOI in MANIFEST.json. The publications retain their licenses.",
        "",
        "## Contents (publication sequence)",
        "",
    ]
    for p in entries:
        lines += [
            f"{p['paper']:02d}. {p['title']} (v{p['version'] or 'published'})",
            f"    Version DOI: https://doi.org/{p['versionDOI']}",
            f"    All versions: https://doi.org/{p['conceptDOI']}",
            f"    File: {p['file']}",
            "",
        ]
    dest = outdir / archive_name(sid)
    outdir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(dest, "w", allowZip64=True) as zf:
        _zip_write(zf, "README.txt", "\n".join(lines).encode("utf-8"))
        _zip_write(zf, "MANIFEST.json", (
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
        ).encode("utf-8"))
        for name, raw in documents:
            _zip_write(zf, name, raw)
    # Verify ZIP integrity and ensure exactly one PDF per registered paper.
    with zipfile.ZipFile(dest) as zf:
        bad = zf.testzip()
        if bad:
            raise ValueError("Corrupt ZIP member: " + bad)
        if sum(x.endswith(".pdf") for x in zf.namelist()) != len(papers):
            raise ValueError("ZIP is missing a paper")
    print("CREATED_SERIES_ARCHIVE", dest, len(papers), dest.stat().st_size, flush=True)
    return dest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output-dir", default="dist/series-archives")
    ap.add_argument("--series", action="append", default=[])
    ap.add_argument("--manifest-only", action="store_true",
                    help="Validate catalog and archive inventory without network downloads")
    args = ap.parse_args()
    catalog, pins = read_catalog()
    groups = series_groups(catalog)
    names = args.series or list(groups)
    if len(set(names)) != len(names) or any(x not in groups for x in names):
        ap.error("Unknown or repeated series ID")
    outdir = Path(args.output_dir)
    outdir.mkdir(parents=True, exist_ok=True)
    index = archive_index(catalog, pins)
    (outdir / "series-versions.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    for sid in names:
        print("SERIES_ARCHIVE_INDEX", sid, index["series"][sid], flush=True)
    if not args.manifest_only:
        for sid in names:
            title, papers = groups[sid]
            build_archive(sid, title, papers, pins, outdir)


if __name__ == "__main__":
    main()
