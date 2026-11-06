"""Offline integrity checks for complete scholarly-series ZIP inventory."""
import hashlib
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_series_archives import (
    TAG, RELEASE_BASE, SCHEMA, archive_index, archive_name,
    fingerprint, read_catalog, series_groups, slug,
)


class SeriesArchiveTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog, cls.pins = read_catalog()
        cls.groups = series_groups(cls.catalog)
        cls.index = archive_index(cls.catalog, cls.pins)

    def test_all_public_papers_are_allocated_once(self):
        self.assertGreaterEqual(len(self.groups), 1)
        all_ids = [p["id"] for _, papers in self.groups.values() for p in papers]
        self.assertEqual(len(all_ids), len(self.catalog["publications"]))
        self.assertEqual(set(all_ids), {p["id"] for p in self.catalog["publications"]})
        self.assertEqual(len(all_ids), len(set(all_ids)))

    def test_all_registered_series_have_public_download_urls(self):
        self.assertEqual(self.index["schema"], SCHEMA)
        self.assertEqual(set(self.index["series"]), set(self.groups))
        for sid, item in self.index["series"].items():
            _, papers = self.groups[sid]
            self.assertEqual(item["paperCount"], len(papers))
            self.assertEqual(item["url"], RELEASE_BASE + archive_name(sid))
            self.assertTrue(item["url"].startswith("https://github.com/"))
            self.assertRegex(item["fingerprint"], r"^[a-f0-9]{64}$")

    def test_inventory_is_in_publication_order(self):
        for sid, (_, papers) in self.groups.items():
            orders = [p["order"] for p in papers]
            self.assertEqual(orders, sorted(orders), sid)

    def test_release_fingerprints_change_with_editions(self):
        sid = "schwarzschild-qg"
        title, papers = self.groups[sid]
        current = fingerprint(title, papers, self.pins)
        clone = [dict(p) for p in papers]
        clone[-1]["doi"] = "10.5281/zenodo.999999999"
        self.assertNotEqual(current, fingerprint(title, clone, self.pins))

    def test_safe_pdf_filenames(self):
        self.assertEqual(slug("Einstein–Scalar / Quantum Matter"), "einstein-scalar-quantum-matter")
        self.assertEqual(archive_name("schwarzschild-qg"), "ilc-series-schwarzschild-qg.zip")
        with self.assertRaises(ValueError):
            archive_name("../somewhere")


if __name__ == "__main__":
    unittest.main()
