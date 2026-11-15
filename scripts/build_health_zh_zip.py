#!/usr/bin/env python3
"""Build a version-specific, checksum-verified Simplified Chinese Health series ZIP.

The seven DOIs are taken from the author-supplied Chinese title pages.
The release is published only after all seven Zenodo records and original PDFs
pass identity, PDF byte and provider checksum checks.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import time
import urllib.request
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
FILENAME="ilc-health-formally-defined-zh-latest.zip"
API="https://zenodo.org/api/records/"
AGENT="InstituteLuxConsilio-VerifiedChineseEditions/1.0"

def download(url: str) -> bytes:
    last=None
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={"User-Agent":AGENT,"Accept":"application/json, application/pdf, */*"})
            with urllib.request.urlopen(req,timeout=45) as response:
                return response.read()
        except Exception as exc:
            last=exc
            if attempt<2: time.sleep(4*(attempt+1))
    raise RuntimeError(f"Unable to read original publication from {url}: {last}")

def original_pdf(p: dict) -> tuple[bytes,str,str]:
    doi=p["chineseDoi"]
    record_number=doi.rsplit(".",1)[-1]
    if not re.fullmatch(r"[0-9]+",record_number):
        raise ValueError("Invalid record number")
    record=json.loads(download(API+record_number))
    if record.get("doi")!=doi:
        raise ValueError(f"{p['id']}: Zenodo version DOI does not match Chinese manuscript")
    if record.get("status","published")!="published":
        raise ValueError(f"{p['id']}: Zenodo edition is not published")
    creators=(record.get("metadata") or {}).get("creators",[])
    if not any(("zed" in str(c.get("name","")).lower() and "james" in str(c.get("name","")).lower()) for c in creators):
        raise ValueError(f"{p['id']}: unexpected Zenodo author")
    files=[f for f in record.get("files",[]) if str(f.get("key") or f.get("filename") or "").lower().endswith(".pdf")]
    if len(files)!=1:
        raise ValueError(f"{p['id']}: expected exactly one original PDF, got {len(files)}")
    file=files[0]
    url=(file.get("links") or {}).get("content")
    if not isinstance(url,str) or not url.startswith("https://"):
        raise ValueError(f"{p['id']}: missing secure Zenodo PDF content link")
    payload=download(url)
    if not payload.startswith(b"%PDF-") or b"%%EOF" not in payload[-4096:]:
        raise ValueError(f"{p['id']}: incomplete PDF")
    if file.get("size") is not None and len(payload)!=int(file["size"]):
        raise ValueError(f"{p['id']}: PDF size differs from Zenodo record")
    checksum=file.get("checksum") or ""
    if checksum:
        algorithm,separator,digest=checksum.partition(":")
        if not separator or algorithm not in ("md5","sha256"):
            raise ValueError(f"{p['id']}: unsupported Zenodo checksum")
        if hashlib.new(algorithm,payload).hexdigest().lower()!=digest.lower():
            raise ValueError(f"{p['id']}: provider checksum mismatch")
    sha=hashlib.sha256(payload).hexdigest()
    return payload,sha,record.get("conceptdoi") or ""

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    data=json.loads((ROOT/"research/health-zh-editions.json").read_text(encoding="utf-8"))
    records=data["records"]
    if len(records)!=7 or [r["order"] for r in records]!=list(range(1,8)):
        raise ValueError("Expected exactly seven ordered Chinese editions")
    args.output.mkdir(parents=True,exist_ok=True)
    files=[]
    manifest=[]
    for p in records:
        raw,sha,concept=original_pdf(p)
        name=f"Paper-{p['order']:02d}-{p['id']}-zh-v{p['version']}.pdf"
        files.append((name,raw))
        manifest.append({"paper":p["order"],"id":p["id"],"chineseTitle":p["titleZh"],"filename":name,
            "language":"zh-Hans","chineseVersionDoi":p["chineseDoi"],"englishOriginalDoi":p["englishDoi"],
            "chinesePublicationDate":p["editionDate"],"version":p["version"],"sha256":sha,
            "verifiedZenodoConceptDoi":concept})
        print(f"VERIFIED_CHINESE_EDITION {p['id']} {p['chineseDoi']} sha256={sha}",flush=True)
    readme=("Institute Lux Consilio — 健康的形式化定义 / Health, Formally Defined\n"
            "Simplified Chinese scholarly editions — Papers I–VII\n"
            "Each Chinese DOI identifies a separate language edition of the corresponding numbered English paper.\n"
            "The publisher's PDF bytes were verified against Zenodo's file metadata.\n"
            "The record-specific source DOI and SHA-256 of each file appear in manifest.json.\n"
            "For original English papers, consult https://instituteluxconsilio.org/research-health-formally-defined.html\n"
            "For Chinese scholarly records, visit https://instituteluxconsilio.org/research-health-formally-defined-zh.html\n")
    zipfile_path=args.output/FILENAME
    with zipfile.ZipFile(zipfile_path,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
        z.writestr("README.txt",readme)
        z.writestr("manifest.json",json.dumps({"schema":"ilc-health-zh-bundle/v1","series":"健康的形式化定义",
            "language":"zh-Hans","count":len(manifest),"papers":manifest},ensure_ascii=False,indent=2)+"\n")
        for name,payload in files:z.writestr(name,payload)
    with zipfile.ZipFile(zipfile_path,"r") as z:
        if z.testzip() is not None: raise ValueError("Corrupt Chinese edition ZIP")
        bundled=json.loads(z.read("manifest.json"))
        for p in bundled["papers"]:
            if hashlib.sha256(z.read(p["filename"])).hexdigest()!=p["sha256"]:
                raise ValueError("Archive checksum mismatch")
    print(f"BUILT_CHINESE_SERIES {zipfile_path} 7 PDFs",flush=True)

if __name__=="__main__":main()
