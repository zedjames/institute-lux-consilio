"""Offline regression tests for public one-click ILC research series archives."""
import importlib
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_series_downloads as archives


class SeriesDownloadsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads((ROOT / "research/catalog.json").read_text(encoding="utf-8"))
        cls.groups = archives.series_groups(cls.catalog)

    def test_six_published_sequences(self):
        self.assertEqual(set(self.groups), {"health", "kinetic", "rmmo", "celestial", "qg", "ns"})
        for program, pubs in self.groups.items():
            self.assertGreater(len(pubs), 0, program)
            self.assertEqual([p["order"] for p in pubs], list(range(1, len(pubs) + 1)))
            self.assertEqual(len({p["seriesId"] for p in pubs}), 1)

    def test_filenames_match_public_download_contract(self):
        expected = {
            "health": "ilc-health-formally-defined-latest.zip",
            "kinetic": "ilc-kinetic-organization-biological-function-latest.zip",
            "rmmo": "ilc-rmmo-latest.zip",
            "celestial": "ilc-gaussian-latest.zip",
            "qg": "ilc-schwarzschild-qg-latest.zip",
            "ns": "ilc-navier-stokes-latest.zip",
        }
        for program, pubs in self.groups.items():
            self.assertEqual(archives.archive_name(program, pubs), expected[program])

    def test_index_uses_same_source_as_public_pages(self):
        manifest = json.loads((ROOT / "research/site-pdfs.json").read_text(encoding="utf-8"))
        local = {x["pdf"]: x["sha256"] for x in manifest["papers"]}
        index = archives.archive_index(self.catalog, local)
        self.assertEqual(index["schema"], 1)
        self.assertEqual(len(index["series"]), 6)
        for program, group in self.groups.items():
            info = index["series"][program]
            self.assertEqual(info["count"], len(group))
            self.assertEqual([x["doi"] for x in info["papers"]], [p["doi"] for p in group])
            self.assertEqual(info["filename"], archives.archive_name(program, group))

    def test_actual_zip_contains_edition_manifest_and_all_papers(self):
        pubs = self.groups["rmmo"]
        fake = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n"
        fake_hash = archives.hashlib.sha256(fake).hexdigest()
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "test.zip"
            with patch.object(archives, "verified_zenodo_pdf", return_value=(fake, fake_hash)):
                archives.write_archive(path, "rmmo", pubs, {p["id"]: {} for p in pubs}, {})
            with zipfile.ZipFile(path) as z:
                self.assertIsNone(z.testzip())
                pdfs = [n for n in z.namelist() if n.endswith(".pdf")]
                self.assertEqual(len(pdfs), len(pubs))
                self.assertEqual(len(set(pdfs)), len(pubs))
                self.assertIn("README.txt", z.namelist())
                info = json.loads(z.read("manifest.json"))
                self.assertEqual(len(info["papers"]), len(pubs))
                self.assertTrue(all(p["sha256"] == fake_hash for p in info["papers"]))
                self.assertTrue(all(p["filename"] in pdfs for p in info["papers"]))


if __name__ == "__main__":
    unittest.main()
