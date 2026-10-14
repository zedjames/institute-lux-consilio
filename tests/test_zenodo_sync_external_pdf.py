"""Offline regression tests for the ILC versioned Zenodo PDF synchronizer."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / "scripts" / "zenodo_latest_sync.py"
spec = importlib.util.spec_from_file_location("zenodo_latest_sync", SOURCE)
syncer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(syncer)

OLD_PDF = "https://fieldfluxbiosystems.com/research-friedrichs-selected-schwarzschild-quantum-matter.pdf"
NEW_PDF = "https://zenodo.org/api/records/23390000/files/Friedrichs-v2.pdf/content"
OLD_DOI = "10.5281/zenodo.22819417"
NEW_DOI = "10.5281/zenodo.23390000"
CONCEPT_DOI = "10.5281/zenodo.22819416"


class ExternalPdfUpdateTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "research").mkdir()
        (self.root / "assets" / "data").mkdir(parents=True)
        self.paper = {
            "id": "sqg3",
            "title": "Friedrichs-Selected Schwarzschild Quantum Matter",
            "doi": OLD_DOI,
            "conceptDoi": CONCEPT_DOI,
            "date": "2026-09-17",
            "pdf": OLD_PDF,
        }
        (self.root / "research" / "catalog.json").write_text(
            json.dumps({"publications": [self.paper]}), encoding="utf-8"
        )
        (self.root / "research" / "zenodo-concepts.json").write_text(
            json.dumps({"papers": {"sqg3": {"concept_doi": CONCEPT_DOI}}}),
            encoding="utf-8",
        )
        (self.root / "research" / "site-pdfs.json").write_text(
            json.dumps({"papers": []}), encoding="utf-8"
        )
        (self.root / "assets" / "data" / "research.js").write_text(
            "window.ILC_DATA=" + json.dumps({"publications": [self.paper]}) + ";\n",
            encoding="utf-8",
        )

    def read_paper(self, path):
        return json.loads(path.read_text(encoding="utf-8"))["publications"][0]

    def exercise(self, version):
        fake_doc = {
            "doi": version,
            "metadata": {"publication_date": "2026-10-14"},
        }
        fake_pdf = b"%PDF-1.7\nverified revised manuscript\n%%EOF"
        with (
            patch.object(syncer, "ROOT", self.root),
            patch.object(syncer, "published_record", return_value=fake_doc),
            patch.object(syncer, "verified_pdf", return_value=(fake_pdf, NEW_PDF)) as verify,
        ):
            changed = syncer.sync("ilc")
        return changed, verify, fake_pdf

    def test_new_version_replaces_stale_external_pdf_link(self):
        changed, verify, content = self.exercise(NEW_DOI)
        self.assertTrue(changed)
        verify.assert_called_once()
        expected_hash = hashlib.sha256(content).hexdigest()
        catalog = self.read_paper(self.root / "research" / "catalog.json")
        browser_text = (self.root / "assets" / "data" / "research.js").read_text(
            encoding="utf-8"
        )
        browser = json.loads(browser_text.removeprefix("window.ILC_DATA=").rstrip(";\n"))["publications"][0]
        for p in (catalog, browser):
            self.assertEqual(p["doi"], NEW_DOI)
            self.assertEqual(p["conceptDoi"], CONCEPT_DOI)
            self.assertEqual(p["pdf"], NEW_PDF)
            self.assertEqual(p["pdfSha256"], expected_hash)
            self.assertEqual(p["date"], "2026-10-14")

    def test_unchanged_version_does_not_repoint_external_pdf(self):
        changed, verify, _ = self.exercise(OLD_DOI)
        self.assertFalse(changed)
        verify.assert_not_called()
        catalog = self.read_paper(self.root / "research" / "catalog.json")
        self.assertEqual(catalog["pdf"], OLD_PDF)
        self.assertEqual(catalog["doi"], OLD_DOI)


if __name__ == "__main__":
    unittest.main()
