#!/usr/bin/env python3
"""Mirror exact user-verified PDFs from the public research publisher.

Every publication must be associated with a pinned SHA-256 and a human-readable
on-site record. Unknown bytes are never committed or substituted silently.
"""
from __future__ import annotations
import hashlib
import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "research" / "site-pdfs.json"

def download(url: str) -> bytes:
    last = None
    for attempt in range(4):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "ILCScholarlyMirror/1.0"})
            with urllib.request.urlopen(request, timeout=90) as response:
                return response.read()
        except Exception as exc:
            last = exc
            if attempt < 3:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"Unable to mirror PDF from {url}: {last}")

def main() -> None:
    data = json.loads(MANIFEST.read_text())
    for paper in data["papers"]:
        target = ROOT / paper["pdf"]
        expected = paper["sha256"]
        if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == expected:
            print(f"{target}: existing bytes are verified")
            continue
        payload = download(paper["source"])
        actual = hashlib.sha256(payload).hexdigest()
        if not payload.startswith(b"%PDF-") or actual != expected:
            raise RuntimeError(f"PDF integrity failure for {paper['doi']}: expected {expected}; received {actual}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)
        print(f"Verified {target}: {len(payload)} bytes, SHA-256 {actual}")

if __name__ == "__main__":
    main()
