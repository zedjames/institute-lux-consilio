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
assert.equal(ch.source_access,"governed");
assert.equal(ch.claims.length,4);
assert.ok(ch.claims.every(c=>c.evidence==="formal_internal"&&!c.publication_id),
 "CH P9-SA11 research must remain internal formal work, not a published paper");
assert.equal(ch.obstructions.length,2);
assert.ok(ch.obstructions.every(o=>o.standing==="formal_internal"));
assert.equal(ch.obligations.length,4);
assert.equal(ch.history.at(-1).id,"CH-D01-H0003");
assert.equal(ch.history.at(-1).event,"finding");
assert.deepStrictEqual([...ch.history.at(-1).affects].sort(),
 ["overview","foundation","limits","next","claims","obligations","obstructions"].sort());
assert.ok(ch.limits.includes("original unit coupling remains open")&&
 ch.limits.includes("physical gravitational S-matrix")&&
 ch.limits.includes("not a published CH Paper IX"),
 "Kinematic, physical and publication boundaries must remain explicit");
assert.ok(ch.claims.find(c=>c.id==="CH-D01-C03").scope.includes("not certified to include unit coupling"));
assert.ok(ch.claims.find(c=>c.id==="CH-D01-C02").scope.includes("not a no-go theorem"));

const evidence=renderDirectionEvidence(ch,catalog);
assert.ok(evidence.startsWith('<details class="atlas-program-evidence"'));
assert.ok(evidence.includes("<summary>Examine the scientific basis and open questions</summary>"));
assert.equal((evidence.match(/class="atlas-evidence-type"/g)||[]).length,6,
 "Detailed CH disclosure must identify four claims and two qualified obstructions");
assert.ok(evidence.includes("source-dependent")&&evidence.includes("released middle-face")&&
 evidence.includes("Cartan flux")&&evidence.includes("Internal formal research"));
assert.ok(evidence.includes("adjacent research stream"));
assert.ok(!evidence.includes("Published record →"),
 "CH formal work must not be rendered as a published paper");

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
