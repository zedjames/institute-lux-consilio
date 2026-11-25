import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {loadDirections,renderDirectionEvidence,renderProgramDirections,renderDirectionsOverview} from "../scripts/build-research-directions.mjs";
import {checkDirectionRevision} from "../scripts/audit-research-directions.mjs";

const raw=fs.readFileSync("assets/data/research.js","utf8").trim();
const catalog=JSON.parse(raw.replace(/^window\.ILC_DATA=/,"").replace(/;\s*$/,""));
const directions=loadDirections(process.cwd(),catalog);
const ch=directions.find(d=>d.id==="CH-D01");
assert.ok(ch,"Missing registered CH research direction");
assert.equal(ch.program_relation,"adjacent_research_stream");
assert.deepStrictEqual(ch.program_ids,["celestial"]);
assert.equal(ch.publication_status,"unpublished_direction");
assert.equal(ch.source_access,"mixed");
assert.equal(ch.claims.length,5);
assert.ok(ch.claims.filter(c=>c.evidence==="formal_internal"&&!c.publication_id).length===4,
 "CH P9-SA11 wave/scattering claims must retain internal formal standing");
assert.ok(ch.claims.some(c=>c.id==="CH-D01-C05"&&c.evidence==="published"&&c.publication_id==="gps9"),
 "Published Paper IX must be represented as scoped nonlinear geometry, not scattering");
assert.equal(ch.obstructions.length,2);
assert.ok(ch.obstructions.every(o=>o.standing==="formal_internal"));
assert.equal(ch.obligations.length,4);
assert.equal(ch.history.at(-1).id,"CH-D01-H0004");
assert.equal(ch.history.at(-1).event,"publication");
assert.ok(ch.history.some(x=>x.id==="CH-D01-H0003"&&x.event==="finding"));
assert.deepStrictEqual([...ch.history.find(x=>x.id==="CH-D01-H0003").affects].sort(),
 ["overview","foundation","limits","next","claims","obligations","obstructions"].sort());
assert.ok(ch.limits.includes("original unit-coupling claim open")&&
 ch.limits.includes("physical S-matrix")&&
 ch.limits.includes("Paper IX proves source-specific nonlinear gravitational reconstruction"),
 "Kinematic, physical and publication boundaries must remain explicit");
assert.ok(ch.claims.find(c=>c.id==="CH-D01-C03").scope.includes("not certified to include unit coupling"));
assert.ok(ch.claims.find(c=>c.id==="CH-D01-C02").scope.includes("not a no-go theorem"));

const evidence=renderDirectionEvidence(ch,catalog);
assert.ok(evidence.startsWith('<details class="atlas-program-evidence"'));
assert.ok(evidence.includes("<summary>Examine the scientific basis and open questions</summary>"));
assert.equal((evidence.match(/class="atlas-evidence-type"/g)||[]).length,7,
 "Detailed CH disclosure must identify four internal claims, one published foundation and two obstructions");
assert.ok(evidence.includes("source-dependent")&&evidence.includes("released middle-face")&&
 evidence.includes("Cartan flux")&&evidence.includes("Internal formal research"));
assert.ok(evidence.includes("adjacent research stream"));
assert.ok(evidence.includes('href="publication-gps9.html"')&&evidence.includes("Published scholarly foundation"),
 "Published IX must be linked as a separate scholarly foundation");

const program=fs.readFileSync("research-gaussian-celestial.html","utf8");
assert.ok(program.includes(renderProgramDirections(directions,catalog,"celestial")),
 "CH research evidence must be generated from its canonical record, not duplicated editorial HTML");
assert.ok(program.includes('id="direction-CH-D01"'));
const research=fs.readFileSync("research.html","utf8");
assert.ok(research.includes(renderDirectionsOverview(directions,catalog)),
 "The research overview must reflect the qualified current CH development");

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"ilc-rda06-"));
try{
 const dir=path.join(temp,"research/directions");
 fs.mkdirSync(dir,{recursive:true});
 for(const name of fs.readdirSync("research/directions"))
  fs.copyFileSync(path.join("research/directions",name),path.join(dir,name));
 const dest=path.join(dir,"CH-D01.json");
 const put=d=>fs.writeFileSync(dest,JSON.stringify(d,null,2)+"\n");
 const clone=()=>structuredClone(ch);
 let changed=clone();
 changed.claims[2].evidence="published";
 put(changed);
 assert.throws(()=>loadDirections(temp,catalog),/published claim lacks a real archived publication/);
 changed=clone();
 changed.obstructions[0].standing="assumed";
 put(changed);
 assert.throws(()=>loadDirections(temp,catalog),/obstruction requires qualified standing/);
 changed=clone();
 changed.claims[2].scope="An unreviewed change would silently replace the proof scope of this research result.";
 assert.throws(()=>checkDirectionRevision(ch,changed),/scientific changes without an appended event/);
}finally{
 fs.rmSync(temp,{recursive:true,force:true});
}
console.log("RDA-06 CH scattering verified: source scope, original-coupling boundary, physical obstruction, public disclosure and generator reproducibility.");
