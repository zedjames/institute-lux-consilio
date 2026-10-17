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
    ("qg-paper-v-concept", "22846742"),
    ("qg-paper-vi-concept", "22859435"),
    ("qg-paper-vii-concept", "22904030"),
    ("qg-paper-viii-concept", "22939781"),
]
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
    meta=doc.get("metadata") or {}
    result=dict(label=label,queried_record=record_id,record_id=doc.get("id"),
        doi=doc.get("doi"),conceptdoi=doc.get("conceptdoi"),conceptrecid=doc.get("conceptrecid"),
        parent=doc.get("parent"),title=meta.get("title"),
        version=meta.get("version"),publication_date=meta.get("publication_date"),
        creators=[p.get("name") for p in meta.get("creators",[])],
        status=doc.get("status"),
        pdf_names=[p.get("key") or p.get("filename") for p in doc.get("files",[])
            if str(p.get("key") or p.get("filename") or "").lower().endswith(".pdf")])
    print("ZENODO_FAMILY_AUDIT",json.dumps(result,ensure_ascii=False,default=str),flush=True)
