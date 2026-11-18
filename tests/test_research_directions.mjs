import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {loadDirections,renderDirectionsOverview,renderProgramDirections} from "../scripts/build-research-directions.mjs";

const raw=fs.readFileSync("assets/data/research.js","utf8").trim();
const catalog=JSON.parse(raw.replace(/^window\.ILC_DATA=/,"").replace(/;\s*$/,""));
const originals=loadDirections(process.cwd(),catalog);
assert.equal(originals.length,5,"Expected five pilot directions");

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"ilc-rda-01-"));
const dir=path.join(temp,"research","directions");
fs.mkdirSync(dir,{recursive:true});
const files=fs.readdirSync("research/directions");
for(const file of files)fs.copyFileSync(path.join("research/directions",file),path.join(dir,file));
const get=id=>JSON.parse(fs.readFileSync(path.join(dir,id+".json"),"utf8"));
const put=d=>fs.writeFileSync(path.join(dir,d.id+".json"),JSON.stringify(d,null,2)+"\n");
const updateManifest=fn=>{
 const file=path.join(dir,"index.json"),m=JSON.parse(fs.readFileSync(file,"utf8"));
 fn(m);fs.writeFileSync(file,JSON.stringify(m,null,2)+"\n");
};
const restore=id=>fs.copyFileSync(path.join("research/directions",id+".json"),path.join(dir,id+".json"));

try{
 const sixth=structuredClone(get("QG-D02"));
 sixth.id="QG-D03";
 delete sixth.inquiries; // A hypothetical sixth direction must not claim the already-authored QG paths.
 sixth.history=sixth.history.map(h=>({...h,id:h.id.replace("QG-D02","QG-D03")}));
 sixth.title="Hypothetical Sixth Research Direction";
 sixth.display.order=6;
 sixth.claims=sixth.claims.map(c=>({...c,id:c.id.replace("QG-D02","QG-D03")}));
 sixth.obligations=sixth.obligations.map(o=>({...o,id:o.id.replace("QG-D02","QG-D03")}));
 sixth.obstructions=sixth.obstructions.map(o=>({...o,id:o.id.replace("QG-D02","QG-D03")}));
 sixth.relationships=[];
 put(sixth);
 updateManifest(m=>m.registered.push("QG-D03"));
 const expanded=loadDirections(temp,catalog);
 assert.equal(expanded.length,6,"Sixth record must be accepted from data only");
 assert.ok(renderDirectionsOverview(expanded,catalog).includes('data-direction-id="QG-D03"'),
  "New direction must appear without manually editing the Research HTML");
 assert.ok(renderProgramDirections(expanded,catalog,"qg").includes('data-direction-id="QG-D03"'),
  "New direction must appear on the relevant program without editing program HTML");

 // A non-published source cannot be promoted to publication authority.
 sixth.claims[0].evidence="published";delete sixth.claims[0].publication_id;put(sixth);
 assert.throws(()=>loadDirections(temp,catalog),/published claim lacks a real archived publication/);
 sixth.claims[0]=structuredClone(get("QG-D02").claims[0]);
 sixth.claims[0].id="QG-D03-C01";put(sixth);

 // Unapproved public records are not rendered, even though they remain registered.
 sixth.disclosure="withheld";put(sixth);
 const visible=loadDirections(temp,catalog);
 assert.equal(visible.length,5);
 assert.ok(!renderDirectionsOverview(visible,catalog).includes("QG-D03"));
 sixth.disclosure="public_summary";put(sixth);

 sixth.relationships=[{id:"QG-D03-R0001",kind:"requires",target:"QG-D99",summary:"A proposed link whose target does not exist in the public register.",standing:"research_question",scope:"The proposed connection is not an established mathematical or physical bridge.",basis_ids:["QG-D03-O01"]}];put(sixth);
 assert.throws(()=>loadDirections(temp,catalog),/unresolved direction link/);
 sixth.relationships=[];put(sixth);

 sixth.program_ids=["nonexistent"];put(sixth);
 assert.throws(()=>loadDirections(temp,catalog),/unknown program/);
 sixth.program_ids=["qg"];put(sixth);

 // A published claim must point to an actual recorded DOI, not a fictitious source.
 sixth.claims[0]={id:"QG-D03-C01",statement:"A fictitious formally published scientific result.",evidence:"published",publication_id:"not-real",scope:"This scope is intentionally invalid for the negative test."};put(sixth);
 assert.throws(()=>loadDirections(temp,catalog),/published claim lacks a real archived publication/);
}finally{
 fs.rmSync(temp,{recursive:true,force:true});
}
console.log("RDA-01 register tests passed: sixth direction, source authority, disclosure, relationships and program references.");
