import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {loadDirections,directionHref,renderProgramDirections} from "../scripts/build-research-directions.mjs";
import {enumerateResearchConnections,renderRelationshipAtlas,replaceRelationshipAtlas} from "../scripts/build-research-relationships.mjs";
import {checkDirectionRevision} from "../scripts/audit-research-directions.mjs";
const raw=fs.readFileSync("assets/data/research.js","utf8").trim();
const catalog=JSON.parse(raw.replace(/^window\.ILC_DATA=/,"").replace(/;\s*$/,""));
const directions=loadDirections(process.cwd(),catalog);
const links=enumerateResearchConnections(directions);
assert.equal(directions.length,5);
assert.equal(links.length,4);
assert.deepStrictEqual(links.map(x=>x.edge.id).sort(),
 ["CH-D01-R0001","EPC-D01-R0001","QG-D01-R0001","QG-D02-R0001"]);
assert.ok(links.every(x=>x.edge.standing==="research_question"),
 "Pilot relationships must not silently assert a mathematical bridge");
for(const x of links){
 assert.ok(x.source.relationships.includes(x.edge),"Relationship must retain its original scientific owner");
 assert.ok(x.edge.basis_ids.every(id=>[...x.source.claims,...x.source.obligations,...x.source.obstructions].some(c=>c.id===id)),
  "Each connection needs a known scientific source record");
}
const html=renderRelationshipAtlas(directions,catalog);
assert.equal((html.match(/class="atlas-rel-card"/g)||[]).length,4);
assert.equal((html.match(/class="atlas-rel-group"/g)||[]).length,5);
assert.ok(html.includes("No public cross-direction relationship has been registered"),
 "Directions without declared connections need a truthful representation");
assert.ok(html.includes("No private Concordia source is exposed through this page"));
assert.ok(!html.includes("physical scattering S-matrix has been proved"));
for(const d of directions){
 assert.ok(html.includes('id="source-'+d.id+'"'));
 assert.ok(html.includes('href="/research/atlas/#source-'+d.id+'"'),
  "Atlas own anchors must remain local even with base href=/");
 assert.ok(renderProgramDirections(directions,catalog,d.landing_href||d.program_ids[0])
  .includes('id="direction-'+d.id+'"'));
 assert.ok(directionHref(d,catalog).endsWith("#direction-"+d.id),
  "Links must land on the exact research direction, not only a broad program section");
}
const route=fs.readFileSync("research/atlas/index.html","utf8");
assert.ok(route.includes('<base href="/">')&&route.includes('<link rel="canonical" href="https://instituteluxconsilio.org/research/atlas/">'));
assert.ok(route.includes('<a class="skip" href="/research/atlas/#main">'));
assert.equal(replaceRelationshipAtlas(route,html),route,"Standalone relationship page is not regenerable");

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"ilc-rda03-"));
try{
 const dir=path.join(temp,"research/directions");fs.mkdirSync(dir,{recursive:true});
 for(const name of fs.readdirSync("research/directions"))fs.copyFileSync(path.join("research/directions",name),path.join(dir,name));
 const file=path.join(dir,"QG-D01.json");
 const current=JSON.parse(fs.readFileSync(file,"utf8"));
 const clone=()=>structuredClone(current);
 const change=(fn,pattern)=>{
  const d=clone();fn(d);fs.writeFileSync(file,JSON.stringify(d,null,2)+"\n");
  assert.throws(()=>loadDirections(temp,catalog),pattern);
 };
 change(d=>{d.relationships[0].target="QG-D99";},/unresolved direction link/);
 change(d=>{d.relationships[0].basis_ids=["QG-D01-C99"];},/unknown source claim/);
 change(d=>{d.relationships[0].standing="published_bridge";},/published bridge requires a cited published claim/);
 change(d=>{d.relationships[0].standing="formal_internal_bridge";},/formal bridge requires a separately scoped formal claim/);
 change(d=>{d.relationships[0].id="QG-D01-R9999";},/relationship identity\/sequence invalid/);
 change(d=>{d.relationships[0].target="QG-D01";},/self-link must be an obligation/);
 // Future added links require valid source basis, a target and a history event.
 const extra=clone();
 extra.relationships.push({...extra.relationships[0],id:"QG-D01-R0002",target:"EPC-D01",scope:"A proposed additional research question has no verified cross-program bridge."});
 fs.writeFileSync(file,JSON.stringify(extra,null,2)+"\n");
 assert.equal(loadDirections(temp,catalog).length,5);
 const edited=clone();edited.relationships.push(extra.relationships[1]);
 assert.throws(()=>checkDirectionRevision(current,edited),/scientific changes without an appended event/);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log("RDA-03 checks passed: four evidence-scoped relationships, source IDs, local routing and adversarial qualifications.");
