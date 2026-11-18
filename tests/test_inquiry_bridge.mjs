import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {loadDirections,renderProgramDirections} from "../scripts/build-research-directions.mjs";
import {buildPublicInquiryIndex,renderInquiryProvenance,replaceInquiryProvenance} from "../scripts/build-inquiry-bridge.mjs";
import {checkDirectionRevision} from "../scripts/audit-research-directions.mjs";

const raw=fs.readFileSync("assets/data/research.js","utf8").trim();
const catalog=JSON.parse(raw.replace(/^window\.ILC_DATA=/,"").replace(/;\s*$/,""));
const dirs=loadDirections(process.cwd(),catalog),index=buildPublicInquiryIndex(dirs,catalog);
assert.deepStrictEqual(index.paths.map(p=>[p.path,p.direction_id]),
 [["history","QG-D02"],["identity","QG-D02"],["scale","EPC-D01"]]);
assert.equal(index.kind,"public_curated_inquiry_index");
assert.equal(index.runtime_status,"in_development_not_publicly_available");
assert.equal(index.live_formal_verification,false);
assert.equal(index.ai_generated_responses,false);
for(const p of index.paths){
 assert.ok(p.url.includes("?path="+p.path+"&depth=idea#inquiry"));
 assert.ok(p.direction_href.includes("#direction-"+p.direction_id));
 assert.ok(p.scope.length>40&&p.limits.length>40);
 assert.ok(p.basis.length>=1);
 assert.ok(p.basis.every(b=>b.statement&&["published","formal_internal","research_in_progress","hypothesis","obligation","obstruction"].includes(b.standing)));
}
const history=index.paths[0],identity=index.paths[1],scale=index.paths[2];
assert.ok(history.basis.some(x=>x.publication_id==="sqg10"&&x.doi&&x.publication_page==="publication-sqg10.html"));
assert.ok(identity.basis.every(x=>!x.publication_id),"Hypothesis cannot inherit the published Paper X authority");
assert.ok(scale.basis.every(x=>!x.publication_id),"The across-scale hypothesis cannot claim a published QG theorem");
const exhibit=fs.readFileSync("research/quantum-gravity-formal-lineage/index.html","utf8");
assert.equal(replaceInquiryProvenance(exhibit,renderInquiryProvenance(index)),exhibit,
 "Source cards must reproduce exactly from approved direction records");
assert.ok(exhibit.includes('qg-inquiry.js?v=2')&&exhibit.includes('qg-exhibit.css?v=4'));
for(const p of index.paths){
 assert.ok(exhibit.includes('data-inquiry-source-for="'+p.path+'"'));
 assert.ok(exhibit.includes('data-inquiry-direction-id="'+p.direction_id+'"'));
 assert.ok(exhibit.includes('data-inquiry-path-select="'+p.path+'"'));
 const owner=dirs.find(d=>d.id===p.direction_id);
 const program=owner.landing_href||owner.program_ids[0];
 assert.ok(renderProgramDirections(dirs,catalog,program).includes('path='+p.path+'&amp;depth=idea#inquiry'),
  "Research direction must link to its authored inquiry view");
}
const manifest=fs.readFileSync("research/atlas/inquiry-index.json","utf8");
assert.equal(manifest,JSON.stringify(index,null,2)+"\n","Public read-only index must match canonical register");
assert.ok(!manifest.includes("github.com/zedjames/qpci-planetary")&&!manifest.includes("private source paths"));
const js=fs.readFileSync("assets/js/qg-inquiry.js","utf8");
assert.ok(js.includes('new URLSearchParams(window.location.search)')&&js.includes('window.history.replaceState'));
assert.ok(js.includes("hasProvenance")&&js.includes("data-inquiry-source-for"));
assert.ok(!/\bfetch\s*\(|\bXMLHttpRequest\b/.test(js),"Public inquiry must make no background requests");
assert.ok(exhibit.includes("not a live formal proof check")&&exhibit.includes("Stage 2 · In development"));

const root=fs.mkdtempSync(path.join(os.tmpdir(),"ilc-rda04-"));
try{
 const dir=path.join(root,"research/directions");fs.mkdirSync(dir,{recursive:true});
 for(const name of fs.readdirSync("research/directions"))fs.copyFileSync(path.join("research/directions",name),path.join(dir,name));
 const file=path.join(dir,"QG-D02.json"),d=JSON.parse(fs.readFileSync(file,"utf8"));
 const clone=()=>structuredClone(d);
 const update=(fn,pattern)=>{
  const n=clone();fn(n);fs.writeFileSync(file,JSON.stringify(n,null,2)+"\n");
  assert.throws(()=>loadDirections(root,catalog),pattern);
 };
 update(n=>{n.inquiries[0].basis_ids=["QG-D02-C99"];},/inquiry basis is not an established claim/);
 update(n=>{n.inquiries[0].path="unknown";},/unknown authored inquiry path/);
 update(n=>{n.inquiries[1].path="history";},/inquiry paths must be unique/);
 update(n=>{n.inquiries[0].basis_ids=[];},/inquiry must identify scoped scientific evidence/);
 const modified=clone();modified.inquiries[0].scope+=" This is a new scope statement requiring human review.";
 assert.throws(()=>checkDirectionRevision(d,modified),/scientific changes without an appended event/);
}finally{fs.rmSync(root,{recursive:true,force:true});}
assert.throws(()=>buildPublicInquiryIndex(dirs.filter(d=>d.id!=="EPC-D01"),catalog),
 /exactly one public direction/,"Missing authored path must block publication");
console.log("RDA-04 tests passed: authored pathway ownership, source bounds, citations, reproducible HTML/index and negative controls.");
