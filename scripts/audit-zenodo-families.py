#!/usr/bin/env python3
"""Read-only published Zenodo DOI-family diagnostics for ILC provenance audits."""
import json
import sys
import time
import urllib.request

# The Kinetic record blocks the entire updater; quantum-gravity titles may also
# have changed between v1 and v2. Read actual Zenodo provenance before pin edits.
RECORDS = [
    ("kinetic-version", "23405911"),
    ("kinetic-reported-concept", "23405912"),
    ("kinetic-paper-ii-first-doi", "23512024"),
    ("kinetic-paper-ii-second-doi", "23512025"),
    ("celestial-paper-vi-v2", "23509540"),
    ("celestial-paper-vii-v2", "23545548"),
    ("celestial-paper-viii-v1", "23651438"),
    ("kinetic-paper-iii-cited-doi", "23547074"),
    ("kinetic-paper-iii-neighbor", "23547073"),
    ("qg-paper-v-concept", "22846742"),
    ("qg-paper-vi-concept", "22859435"),
    ("qg-paper-vii-concept", "22904030"),
    ("qg-paper-viii-concept", "22939781"),
    ("qg-paper-ix-v1", "23604372"),
    ("kinetic-paper-iv-v1", "23604748"),
    ("kinetic-paper-v-v1", "23676336"),
]
# Check the immutable first-published versions against author-supplied PDFs.
# Existing record IDs are immutable, so later versions remain independently discoverable.
PDF_MD5 = {
    "23545548": "a2ead8799eb8454121aa091034aa32a1",
    "23651438": "81d5c976b82f79f319f7bba9dc1a6ab1",
    "23547074": "2cc2e7a07e3d554d9fbcde8030ba7463",
    "23604372": "ae730b9465a87ff166ae48579b3e8dde",
    "23604748": "6d520c35c71b0ecd2232a4aa23182eac",
    "23676336": "0230261f84ba89abdbf1ea96c08a016a",
}
for label, record_id in RECORDS:
    u = "https://zenodo.org/api/records/" + record_id
    doc = None
    for attempt in range(3):
        try:
            request=urllib.request.Request(u,headers={"User-Agent":"ILC-DOI-Family-Audit/1.0","Accept":"application/json"})
            with urllib.request.urlopen(request,timeout=25) as response:
                doc=json.load(response)
            break
        except Exception as exc:
            print("DIAGNOSTIC_RETRY",label,attempt+1,type(exc).__name__,str(exc),flush=True)
            if attempt < 2:
                time.sleep(2*(attempt+1))
    if doc is None:
        print("DIAGNOSTIC_UNAVAILABLE",label,record_id,flush=True)
        continue
    if record_id in PDF_MD5:
        pdfs=[p for p in doc.get("files", []) if str(p.get("key") or p.get("filename") or "").lower().endswith(".pdf")]
        if len(pdfs)!=1:
            raise ValueError("Expected one Zenodo PDF for "+label)
        actual=str(pdfs[0].get("checksum") or "").removeprefix("md5:").lower()
        if actual != PDF_MD5[record_id]:
            raise ValueError("Zenodo PDF checksum differs from author-uploaded file: "+label+" "+actual)
        print("ZENODO_PDF_MD5_MATCH",label,actual,flush=True)
    meta=doc.get("metadata") or {}
    if label == "celestial-paper-viii-v1":
        if (doc.get("doi") != "10.5281/zenodo.23651438"
                or doc.get("conceptdoi") != "10.5281/zenodo.23651437"
                or meta.get("title") != "Interaction Topologies of Celestial Radiative States"
                or meta.get("publication_date") != "2026-10-25"
                or str(meta.get("version") or "").lstrip("v") != "1.0"
                or str(doc.get("status") or "") != "published"):
            raise ValueError("Celestial VIII published Zenodo metadata differs from supplied manuscript")
        if [p.get("key") or p.get("filename") for p in doc.get("files", [])
                if str(p.get("key") or p.get("filename") or "").lower().endswith(".pdf")] != [
                "Interaction Topologies of Celestial Radiative States v1.0.pdf"]:
            raise ValueError("Celestial VIII deposited PDF filename changed")
    if label == "kinetic-paper-iv-v1":
        if (doc.get("doi") != "10.5281/zenodo.23604748"
                or doc.get("conceptdoi") != "10.5281/zenodo.23604747"
                or meta.get("title") != "Stationary Organization and Functional Persistence in Collective Kinetic Systems"
                or meta.get("publication_date") != "2026-10-23"
                or str(meta.get("version") or "").lstrip("v") != "1.0"
                or str(doc.get("status") or "") != "published"):
            raise ValueError("Kinetic IV published Zenodo metadata differs from author-supplied citation")
        if [p.get("key") or p.get("filename") for p in doc.get("files", [])
                if str(p.get("key") or p.get("filename") or "").lower().endswith(".pdf")] != [
                "Stationary Organization and Functional Persistence in Collective Kinetic Systems v1.0.pdf"]:
            raise ValueError("Kinetic IV PDF filename differs from the verified deposit")
    if label == "qg-paper-ix-v1":
        if (doc.get("doi") != "10.5281/zenodo.23604372"
                or doc.get("conceptdoi") != "10.5281/zenodo.23604371"
                or meta.get("title") != "Causal Exterior Ownership for a Moving Einstein–Scalar Quantum Sector"
                or meta.get("publication_date") != "2026-10-23"
                or str(meta.get("version") or "").lstrip("v") != "1.0"
                or str(doc.get("status") or "") != "published"):
            raise ValueError("Paper IX published Zenodo metadata differs from author citation")
        if [p.get("key") or p.get("filename") for p in doc.get("files", [])
                if str(p.get("key") or p.get("filename") or "").lower().endswith(".pdf")] != [
                "Causal Exterior Ownership for a Moving Einstein Scalar Quantum Sector.pdf"]:
            raise ValueError("Paper IX deposited PDF filename changed")
    result=dict(label=label,queried_record=record_id,record_id=doc.get("id"),
        doi=doc.get("doi"),conceptdoi=doc.get("conceptdoi"),conceptrecid=doc.get("conceptrecid"),
        parent=doc.get("parent"),title=meta.get("title"),
        version=meta.get("version"),publication_date=meta.get("publication_date"),
        creators=[p.get("name") for p in meta.get("creators",[])],
        status=doc.get("status"),
        pdf_names=[p.get("key") or p.get("filename") for p in doc.get("files",[])
            if str(p.get("key") or p.get("filename") or "").lower().endswith(".pdf")])
    print("ZENODO_FAMILY_AUDIT",json.dumps(result,ensure_ascii=False,default=str),flush=True)
