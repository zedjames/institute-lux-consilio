#!/usr/bin/env python3
"""Publish complete series ZIP assets to one stable, public GitHub Release.

Archives are rebuilt only when a published paper's catalog signature changes,
or when an expected release asset is missing. GitHub Releases hosts the ZIPs
outside the GitHub Pages repository, avoiding PDF duplication in Git history.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import tempfile

from build_series_archives import (
    TAG, archive_index, build_archive, read_catalog, series_groups,
)

REPO = "zedjames/institute-lux-consilio"


def gh(*args, check=True):
    completed = subprocess.run(
        ["gh", *args, "--repo", REPO],
        text=True, capture_output=True, check=False,
    )
    if check and completed.returncode:
        raise RuntimeError(
            "gh " + " ".join(args) + " failed: " + completed.stderr.strip()
        )
    return completed


def main():
    if os.environ.get("GITHUB_REPOSITORY") != REPO:
        raise RuntimeError("Series publication is restricted to the ILC repository")
    if not os.environ.get("GH_TOKEN"):
        raise RuntimeError("GH_TOKEN required to publish the series ZIP archives")
    catalog, pins = read_catalog()
    current = archive_index(catalog, pins)
    groups = series_groups(catalog)

    preview = gh("release", "view", TAG, "--json", "assets", check=False)
    if preview.returncode:
        print("CREATING_SERIES_RELEASE", TAG, flush=True)
        gh("release", "create", TAG,
           "--title", "ILC Research Series — Current Published Editions",
           "--notes",
           "Downloadable ZIP collections of the latest verified published "
           "Zenodo PDFs for each Institute Lux Consilio research series. "
           "Each ZIP includes a README and machine-readable DOI/checksum manifest. "
           "The assets are updated after the ILC scholarly catalog is synchronized.")
        existing = set()
    else:
        existing = {
            item["name"] for item in json.loads(preview.stdout)["assets"]
        }

    with tempfile.TemporaryDirectory(prefix="ilc-series-") as temp:
        outdir = Path(temp)
        previous = {}
        if "series-versions.json" in existing:
            downloaded = gh(
                "release", "download", TAG, "--pattern",
                "series-versions.json", "--dir", str(outdir), check=False
            )
            if downloaded.returncode:
                raise RuntimeError("Could not read existing release version manifest")
            prior = json.loads((outdir / "series-versions.json").read_text("utf-8"))
            if prior.get("schema") == current["schema"]:
                previous = prior.get("series") or {}

        changed = [
            sid for sid, item in current["series"].items()
            if sid not in previous
            or previous[sid].get("fingerprint") != item["fingerprint"]
            or item["archive"] not in existing
        ]
        if not changed:
            print("SERIES_ARCHIVES_CURRENT", len(groups), flush=True)
            return

        print("SERIES_ARCHIVES_REFRESH", changed, flush=True)
        # Complete and independently verify all changed bundles before
        # replacing *any* of the published release assets.
        bundles = [
            build_archive(sid, *groups[sid], pins, outdir) for sid in changed
        ]
        for item in bundles:
            gh("release", "upload", TAG, str(item), "--clobber")
            print("PUBLISHED_SERIES_ARCHIVE", item.name, flush=True)

        # Commit the asset index last. If upload fails mid-transaction, a
        # subsequent run retries all incomplete or mismatched bundles.
        index_path = outdir / "series-versions.json"
        index_path.write_text(
            json.dumps(current, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8"
        )
        gh("release", "upload", TAG, str(index_path), "--clobber")
        print("PUBLISHED_SERIES_MANIFEST", len(groups), flush=True)


if __name__ == "__main__":
    main()
