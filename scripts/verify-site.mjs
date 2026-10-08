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
const ids=(records,label)=>{
 const seen=new Set();
 for(const r of records){
  assert.ok(r.id,"Missing "+label+" ID");
  assert.ok(!seen.has(r.id),"Duplicate "+label+" ID: "+r.id);
  seen.add(r.id);
 }
};
ids(data.programs,"program");ids(data.publications,"publication");ids(data.notes,"note");
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
