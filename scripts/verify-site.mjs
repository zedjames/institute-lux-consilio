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
import crypto from "node:crypto";
const requiredPDFs = {
 hfd4: {page:"publication-hfd4.html",pdf:"papers/health-formally-defined-paper-iv.pdf",hash:"81153d49ccd804de4c49ce9372891bf6896207c32d6abf40649c69431b44f033"},
 hfd5: {page:"publication-hfd5.html",pdf:"papers/health-formally-defined-paper-v.pdf",hash:"702fd63ae70487d565e92292608a20febeab202defc515559aff411581e1d112"}
};
for(const p of data.publications){
 if(p.date < "2026-10-09") continue; // Existing pre-migration records remain readable through their archival DOI.
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
assert.deepStrictEqual(healthPapers.map(p=>p.order),[1,2,3,4,5],"Health series sequence I–V");
assert.equal(data.series.find(s=>s.id==="health-formally-defined")?.publishedCount,5);
for (const [id,doi,conceptDoi] of [
  ["hfd4","10.5281/zenodo.23268802","10.5281/zenodo.23268803"],
  ["hfd5","10.5281/zenodo.23268987","10.5281/zenodo.23268986"]
]) {
 const p=healthPapers.find(p=>p.id===id);
 assert.ok(p,"Missing new Health paper "+id);
 assert.equal(p.doi,doi); assert.equal(p.conceptDoi,conceptDoi);
 assert.equal(p.program,"health");
}

for(const p of data.programs){assert.ok(root.has(p.href),"Missing research program: "+p.href);}
for(const p of data.publications){assert.match(p.doi,/^10\.\d+\//,"Invalid DOI: "+p.id);}
// Paper VII: sequence, version DOI, all-versions DOI and scientific program.
const gaussianPapers=data.publications.filter(p=>p.seriesId==="gaussian").sort((a,b)=>a.order-b.order);
assert.deepStrictEqual(gaussianPapers.map(p=>p.order),[1,2,3,4,5,6,7],"Gaussian/Celestial sequence must contain Papers I–VII");
const paper7=gaussianPapers[6];
assert.equal(paper7.id,"gps7");
assert.equal(paper7.doi,"10.5281/zenodo.23246259");
assert.equal(paper7.conceptDoi,"10.5281/zenodo.23246260");
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
