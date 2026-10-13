import fs from "node:fs";
import assert from "node:assert/strict";

const raw=fs.readFileSync("assets/data/research.js","utf8").trim();
assert.ok(raw.startsWith("window.ILC_DATA="),"Expected structured research data");
const data=JSON.parse(raw.replace(/^window\.ILC_DATA=/,"").replace(/;\s*$/,""));
const catalog=JSON.parse(fs.readFileSync("research/catalog.json","utf8"));
for(const key of ["programs","themes","questions","publications","notes"]){
 assert.deepStrictEqual(catalog[key],data[key],key+" differs from canonical ILC source");
}
const root=new Set(fs.readdirSync("."));
const generated=makeArtifacts(data);
assert.equal(Object.keys(generated.pages).length, data.publications.length-3,
 "Every catalog publication without an existing dedicated page must have a generated static record");
for(const p of data.publications){
 const page=publicationPath(p);
 assert.ok(root.has(page),"No directly crawlable HTML record for "+p.id);
 const html=fs.readFileSync(page,"utf8");
 assert.ok(html.includes('href="https://instituteluxconsilio.org/'+page+'"'),"Missing canonical for "+p.id);
 assert.ok(html.includes('name="citation_doi" content="'+p.doi+'"'),"Missing DOI citation for "+p.id);
 assert.ok(html.includes('name="citation_title"'),"Missing scholarly title citation for "+p.id);
 if(!p.localPage) assert.equal(html,generated.pages[page],"Generated publication record is out of sync: "+p.id);
}
assert.equal(fs.readFileSync("sitemap.xml","utf8"),generated.sitemap,"Generated sitemap is out of sync");
const archive=fs.readFileSync("publications.html","utf8"),start='<div id="publication-list" class="archive">',end='</div></div></section></main>';
const ia=archive.indexOf(start),ib=archive.indexOf(end,ia+start.length);
assert.ok(ia>=0&&ib>ia,"Archive markup missing");
assert.equal(archive.slice(ia+start.length,ib),"\n"+generated.archive+"\n","Crawlable archive index is out of sync");
for(const p of data.publications){
 assert.ok(archive.includes('href="'+publicationPath(p)+'"'),"Static archive missing "+p.id);
}

import crypto from "node:crypto";
import {makeArtifacts, publicationPath} from "./build-publication-pages.mjs";
const pdfManifest=JSON.parse(fs.readFileSync("research/site-pdfs.json","utf8"));
const requiredPDFs=Object.fromEntries(pdfManifest.papers.map(p=>[
  p.recordPage.replace(/^publication-(hfd[0-9]+)\.html$/, "$1"),
  {page:p.recordPage,pdf:p.pdf,hash:p.sha256,doi:p.doi}
]));
assert.deepStrictEqual(Object.keys(requiredPDFs).sort(),["hfd4","hfd5","hfd6"]);
for(const p of data.publications){
 if(!["hfd4","hfd5","hfd6"].includes(p.id)) continue; // Dedicated on-site scholarly pages and PDFs are mandatory for these three locally archived papers; other programs legitimately link to FFB or verified Zenodo PDFs.
 assert.ok(p.pdf && p.localPage,"New public papers must have a site-hosted PDF and static scholarly record: "+p.id);
 const bytes=fs.readFileSync(p.pdf);
 assert.ok(bytes.subarray(0,5).equals(Buffer.from("%PDF-")),"Invalid PDF bytes for "+p.id);
 const html=fs.readFileSync(p.localPage,"utf8");
 assert.ok(html.includes('name="citation_pdf_url"') && html.includes(p.pdf),"Google Scholar full-text metadata missing for "+p.id);
 assert.ok(html.includes('name="citation_doi"'),"Publication DOI citation missing "+p.id);
}
for(const [id,w] of Object.entries(requiredPDFs)){
 const p=data.publications.find(x=>x.id===id);
 assert.equal(p?.localPage,w.page); assert.equal(p?.pdf,w.pdf);
 assert.equal(crypto.createHash("sha256").update(fs.readFileSync(w.pdf)).digest("hex"),w.hash,"On-site PDF differs from author-supplied bytes "+id);
 for(const file of ["publications.html","research-health-formally-defined.html","index.html"]){
  const html=fs.readFileSync(file,"utf8");
  assert.ok(html.includes(w.page)&&html.includes(w.pdf),"Publication or full-text link missing from "+file);
 }
}

const ids=(records,label)=>{
 const seen=new Set();
 for(const r of records){
  assert.ok(r.id,"Missing "+label+" ID");
  assert.ok(!seen.has(r.id),"Duplicate "+label+" ID: "+r.id);
  seen.add(r.id);
 }
};
ids(data.programs,"program");ids(data.publications,"publication");ids(data.notes,"note");
const healthPapers=data.publications.filter(p=>p.seriesId==="health-formally-defined").sort((a,b)=>a.order-b.order);
assert.deepStrictEqual(healthPapers.map(p=>p.order),[1,2,3,4,5,6],"Health series sequence I–VI");
assert.equal(data.series.find(s=>s.id==="health-formally-defined")?.publishedCount,6);
for (const [id,conceptDoi] of [
  ["hfd4","10.5281/zenodo.23268802"],
  ["hfd5","10.5281/zenodo.23268986"],
  ["hfd6","10.5281/zenodo.23301732"]
]) {
 const p=healthPapers.find(p=>p.id===id);
 assert.ok(p,"Missing new Health paper "+id);
 assert.ok(/^10[.]5281[/]zenodo[.][0-9]+$/.test(p.doi),"Invalid version DOI");
 // Four paper records may still have the precisely known legacy DOI inversion
 // until the initial verified Zenodo mirror transaction runs.
 const legacyVersion={hfd4:"10.5281/zenodo.23268803",hfd6:"10.5281/zenodo.23301733"};
 const legacy=p.doi===conceptDoi && p.conceptDoi===legacyVersion[id];
 assert.ok(p.conceptDoi===conceptDoi || legacy,"Incorrect all-versions DOI family");
 assert.equal(requiredPDFs[id].doi,p.doi,"Manifest version DOI differs from scholarly catalog");
 assert.equal(p.program,"health");
}

for(const p of data.programs){assert.ok(root.has(p.href),"Missing research program: "+p.href);}
for(const p of data.publications){assert.match(p.doi,/^10\.\d+\//,"Invalid DOI: "+p.id);}
// Paper VII: sequence, version DOI, all-versions DOI and scientific program.
const gaussianPapers=data.publications.filter(p=>p.seriesId==="gaussian").sort((a,b)=>a.order-b.order);
assert.deepStrictEqual(gaussianPapers.map(p=>p.order),[1,2,3,4,5,6,7],"Gaussian/Celestial sequence must contain Papers I–VII");
const pins=JSON.parse(fs.readFileSync("research/zenodo-concepts.json","utf8")).papers;
assert.deepStrictEqual(Object.keys(pins).sort(),data.publications.map(p=>p.id).sort(),"All ILC publications must be backed by audited Zenodo families");
for(const pub of data.publications){
 const pin=pins[pub.id];
 assert.ok(/^10[.]5281[/]zenodo[.][0-9]+$/.test(pub.doi),"Invalid version DOI "+pub.id);
 assert.ok(pin.concept_doi.startsWith("10.5281/zenodo."),"Missing verified concept family "+pub.id);
 if(pub.conceptDoi && pub.conceptDoi!==pin.concept_doi){
  // Preexisting inverse DOI pair allowed only until the first auto-sync.
  assert.equal(pub.doi,pin.concept_doi,"Concept DOI mismatch "+pub.id);
 }
 if(pub.pdf && pub.pdf.startsWith("https://zenodo.org/api/records/")){
  assert.match(pub.pdf,/[/]files[/].+[/]content$/,"Invalid pinned Zenodo PDF URL");
  assert.match(pub.pdfSha256||"",/^[0-9a-f]{64}$/,"Missing checksum for Zenodo-hosted publication "+pub.id);
 }
}
const paper7=gaussianPapers[6];
assert.equal(paper7.id,"gps7");
assert.ok(/^10[.]5281[/]zenodo[.][0-9]+$/.test(paper7.doi),"Missing valid Paper VII version DOI");
assert.ok(paper7.conceptDoi==="10.5281/zenodo.23246259" ||
 (paper7.doi==="10.5281/zenodo.23246259" && paper7.conceptDoi==="10.5281/zenodo.23246260"),
 "Paper VII concept/version mapping must match Zenodo or exact pre-migration pair");
assert.equal(paper7.program,"celestial");
assert.equal(data.series.find(s=>s.id==="gaussian")?.publishedCount,gaussianPapers.length);
for(const p of data.questions){assert.ok(p.href&&(root.has(p.href.split("#")[0])),"Question route unavailable: "+p.id);}
for(const file of ["index.html","research.html","publications.html","notes.html","note.html","publication.html","methods.html","institute.html","translation.html"]){
 const html=fs.readFileSync(file,"utf8");
 assert.ok(html.includes("Foundational Science &amp; Discovery")||html.includes("Foundational Science & Discovery"),"Wrong ILC identity in "+file);
 assert.ok(html.includes("assets/css/institute.css"),"Missing current stylesheet in "+file);
}
// The historical notes remain in the scholarly catalog but are not a current ILC
// public-facing section. Keep their records, while preventing navigation regressions.
assert.ok(data.notes.length>0,"Historical note records should remain preserved");
for(const page of fs.readdirSync(".").filter(name=>name.endsWith(".html")&&!["notes.html","note.html"].includes(name))){
 const html=fs.readFileSync(page,"utf8");
 assert.ok(!/href=["'](?:notes|note)\.html(?:\?|["'])/.test(html),"Paused note route unexpectedly exposed from "+page);
}
for(const page of ["notes.html","note.html"]){
 const html=fs.readFileSync(page,"utf8");
 assert.match(html,/<meta name="robots" content="noindex,follow">/,"Missing noindex on "+page);
 assert.ok(!/id="note-(?:list|detail)"/.test(html),"Paused note records re-exposed on "+page);
}
const sitemap=fs.readFileSync("sitemap.xml","utf8");
assert.ok(!/\/(?:notes|note)\.html/.test(sitemap),"Paused note routes unexpectedly present in sitemap");
console.log("ILC research integrity checks passed: "+data.programs.length+" programs, "+data.publications.length+" papers, "+data.notes.length+" notes.");
