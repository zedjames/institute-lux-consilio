#!/usr/bin/env python3
"""Build verified latest-edition ZIP archives for ILC's published research series.

The archives are published as GitHub Release assets rather than committing large
binary artifacts to the GitHub Pages source tree. An index containing the exact
version DOIs and verified PDF SHA-256s determines which series need rebuilding.
The script only builds files; the release upload is handled by GitHub Actions.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
import zipfile
from pathlib import Path
from urllib.parse import quote

from zenodo_latest_sync import API, get, identifier, normalize, pdf_file, verified_pdf

ROOT = Path(__file__).resolve().parents[1]
RELEASE_TAG = "series-latest"
RELEASE_BASE = "https://github.com/zedjames/institute-lux-consilio/releases/download/" + RELEASE_TAG + "/"
INDEX_NAME = "series-index.json"


def safe_slug(value: str) -> str:
    value = unicodedata.normalize("NFKD", str(value))
    value = value.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    if not slug:
        raise ValueError("Empty archive slug")
    return slug[:85].rstrip("-")


def series_groups(data: dict) -> dict[str, list[dict]]:
    result = {}
    for prog in data["programs"]:
        ident = prog["id"]
        items = [p for p in data["publications"]
                 if p["program"] == ident and (ident != "rmmo" or p["seriesId"] == "rmmo")]
        if not items:
            continue
        ids = {p["seriesId"] for p in items}
        if len(ids) != 1:
            raise ValueError(f"Program {ident} contains multiple paper sequences: {ids}")
        items.sort(key=lambda p: p["order"])
        if [p["order"] for p in items] != list(range(1, len(items) + 1)):
            raise ValueError(f"Nonconsecutive paper sequence: {ident}")
        result[ident] = items
    return result


def archive_name(program_id: str, papers: list[dict]) -> str:
    return f"ilc-{safe_slug(papers[0]['seriesId'])}-latest.zip"


def pdf_sha(pub: dict, local_manifest: dict) -> str:
    sha = pub.get("pdfSha256") or local_manifest.get(pub.get("pdf", ""), "")
    if not re.fullmatch(r"[0-9a-f]{64}", sha):
        # The archive still verifies the complete Zenodo checksum; when the
        # catalog never pinned a SHA, the release builder learns it from bytes.
        return ""
    return sha


def archive_index(data: dict, local_manifest: dict) -> dict:
    groups = series_groups(data)
    result = {"schema": 1, "releaseTag": RELEASE_TAG, "series": {}}
    for program, papers in sorted(groups.items()):
        result["series"][program] = {
            "filename": archive_name(program, papers),
            "seriesId": papers[0]["seriesId"],
            "title": papers[0]["series"],
            "count": len(papers),
            "papers": [
                {"id": p["id"], "order": p["order"], "title": p["title"],
                 "doi": p["doi"], "conceptDoi": p.get("conceptDoi"),
                 "version": p.get("version"), "date": p.get("date"),
                 "pdfSha256": pdf_sha(p, local_manifest)}
                for p in papers
            ],
        }
    return result


def read_json(filename: Path) -> dict:
    return json.loads(filename.read_text(encoding="utf-8"))


def verified_zenodo_pdf(pub: dict, pin: dict, expected_hash: str) -> tuple[bytes, str]:
    record = get(API + identifier(pub["doi"]))
    if record.get("doi") != pub["doi"]:
        raise ValueError(f"{pub['id']}: Zenodo version DOI mismatch")
    if record.get("conceptdoi") != pin["concept_doi"]:
        raise ValueError(f"{pub['id']}: Zenodo concept DOI mismatch")
    if pub.get("conceptDoi") != pin["concept_doi"]:
        raise ValueError(f"{pub['id']}: local concept DOI differs from audited pin")
    if record.get("status") not in ("published", None):
        raise ValueError(f"{pub['id']}: unpublished record")
    creator_names = {normalize(x.get("name")) for x in (record.get("metadata") or {}).get("creators", [])}
    if normalize(pin["author"]) not in creator_names:
        raise ValueError(f"{pub['id']}: unexpected Zenodo author")
    # Reuse the synchronizer's strict verified bytes/checksum protocol.
    payload, source = verified_pdf(record)
    actual = hashlib.sha256(payload).hexdigest()
    if expected_hash and actual != expected_hash:
        raise ValueError(f"{pub['id']}: published PDF SHA-256 differs from catalog")
    return payload, actual


def write_archive(destination: Path, program: str, papers: list[dict],
                  pins: dict, local_manifest: dict) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    paper_manifest = []
    files = []
    for pub in papers:
        data, digest = verified_zenodo_pdf(pub, pins[pub["id"]],
                                            pdf_sha(pub, local_manifest))
        version = str(pub.get("version") or "published").lstrip("v")
        filename = f"Paper-{pub['order']:02d}__{safe_slug(pub['title'])}__v{version}.pdf"
        if any(n == filename for n, _ in files):
            raise ValueError("Duplicate generated PDF filename")
        files.append((filename, data))
        paper_manifest.append({
            "paper": pub["order"], "title": pub["title"], "filename": filename,
            "doi": pub["doi"], "conceptDoi": pub.get("conceptDoi"),
            "version": pub.get("version"), "publicationDate": pub.get("date"),
            "sha256": digest,
            "ilcPage": "https://instituteluxconsilio.org/publication-" + pub["id"] + ".html",
        })
        print(f"VERIFIED_SERIES_PDF {program} {pub['id']} {pub['doi']} sha256={digest}", flush=True)
    heading = papers[0]["series"]
    readme = (
        "Institute Lux Consilio — Complete published research series\n"
        f"{heading}\n\n"
        f"Published papers: {len(papers)}\n"
        "This archive contains the published versions verified against their Zenodo records.\n"
        "Individual publication DOIs and SHA-256 checksums are in manifest.json.\n"
        "Please consult each manuscript for its own copyright and license.\n"
        "Institutional research: https://instituteluxconsilio.org/research.html\n\n"
        + "\n".join(f"Paper {p['paper']:02d} — {p['title']}\n  DOI: https://doi.org/{p['doi']}"
                    for p in paper_manifest) + "\n"
    )
    content = json.dumps({"schema": 1, "series": heading, "program": program,
                          "papers": paper_manifest}, ensure_ascii=False, indent=2) + "\n"
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED,
                         compresslevel=6, allowZip64=True) as z:
        z.writestr("README.txt", readme)
        z.writestr("manifest.json", content)
        for name, raw in files:
            z.writestr(name, raw)
    with zipfile.ZipFile(destination, "r") as z:
        if z.testzip() is not None:
            raise ValueError(f"ZIP integrity test failed: {destination}")
    print(f"BUILT_SERIES_ZIP {program} {destination.name} {len(papers)} PDFs", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--previous-index", type=Path)
    parser.add_argument("--available-assets", type=Path)
    parser.add_argument("--program", help="Only create this series ZIP (for targeted testing)")
    parser.add_argument("--index-only", action="store_true")
    args = parser.parse_args()
    catalog = read_json(ROOT / "research/catalog.json")
    pins = read_json(ROOT / "research/zenodo-concepts.json")["papers"]
    manifest = read_json(ROOT / "research/site-pdfs.json")
    local_manifest = {x["pdf"]: x["sha256"] for x in manifest["papers"]}
    groups = series_groups(catalog)
    if args.program and args.program not in groups:
        raise ValueError("Unknown or empty program: " + args.program)
    expected = {p["id"] for papers in groups.values() for p in papers}
    if not expected.issubset(pins.keys()):
        raise ValueError("Unpinned publications: " + str(expected - pins.keys()))
    index = archive_index(catalog, local_manifest)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / INDEX_NAME).write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.index_only:
        print(f"SERIES_INDEX {len(groups)} series", flush=True)
        return
    old = read_json(args.previous_index) if args.previous_index and args.previous_index.is_file() else {}
    assets = set(args.available_assets.read_text(encoding="utf-8").splitlines()) if (
        args.available_assets and args.available_assets.is_file()) else set()
    for program, papers in groups.items():
        if args.program and program != args.program:
            continue
        info = index["series"][program]
        present = not args.available_assets or info["filename"] in assets
        if not args.program and present and old.get("series", {}).get(program) == info:
            print(f"UNCHANGED_SERIES_ZIP {program}", flush=True)
            continue
        write_archive(args.output / info["filename"], program, papers, pins, local_manifest)


if __name__ == "__main__":
    main()
