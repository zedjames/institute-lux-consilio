import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {checkDirectionRevision,checkRegisterRevisions} from "../scripts/audit-research-directions.mjs";
import {appendResearchEvent,updateDirectionFile} from "../scripts/record-research-update.mjs";
const d=JSON.parse(fs.readFileSync("research/directions/QG-D01.json","utf8"));
const copy=x=>structuredClone(x);
const eventArgs={date:"2026-11-19",kind:"question",
 summary:"A test-only research question requiring additional, explicitly stated conditions.",
 affects:["next"]};
const next={...copy(d),next:"Which scientifically specified future observations should be tested?"};
next.history=appendResearchEvent(d,eventArgs).history;
const ok=checkDirectionRevision(d,next);
assert.deepStrictEqual(ok.changed,["next"]);
assert.equal(ok.appended.length,1);
assert.equal(ok.appended[0].id,"QG-D01-H"+String(d.history.length+1).padStart(4,"0"));

assert.throws(()=>checkDirectionRevision(d,{...copy(d),next:next.next}),
 /scientific changes without an appended event/);
const overwritten=copy(next);
overwritten.history[0].summary="The research history was silently rewritten.";
assert.throws(()=>checkDirectionRevision(d,overwritten),/research history was rewritten/);
const misreported=copy(next);
misreported.history.at(-1).affects=["claims"];
assert.throws(()=>checkDirectionRevision(d,misreported),/affected-fields disagree/);
const omitted=copy(next);
omitted.history.at(-1).affects=[];
assert.throws(()=>checkDirectionRevision(d,omitted),/affected-fields disagree/);
const second=copy(next);
second.history=appendResearchEvent(second,{date:"2026-11-20",kind:"milestone",
 summary:"A test-only review milestone that changes no scientific claim.",affects:[]}).history;
assert.equal(checkDirectionRevision(d,second).appended.length,2);

// One-time migration of the RDA-01 registration may add its deterministic ID and empty affects;
// the original date, event and summary must be unchanged.
const legacy=copy(d);
legacy.history[0]={date:d.history[0].date,event:d.history[0].event,
 summary:d.history[0].summary};
assert.deepStrictEqual(checkDirectionRevision(legacy,d).changed,[]);
const changedLegacy=copy(d);
changedLegacy.history[0].summary="Different historical claim.";
assert.throws(()=>checkDirectionRevision(legacy,changedLegacy),/research history was rewritten/);

const manifest={registered:["QG-D01"]};
const afterMap=new Map([["QG-D01",next]]);
const baseMap=new Map([["QG-D01",d]]);
assert.equal(checkRegisterRevisions(manifest,manifest,baseMap,afterMap).length,1);
assert.throws(()=>checkRegisterRevisions(manifest,{registered:[]},baseMap,new Map()),/removed, reordered, or replaced/);

assert.throws(()=>appendResearchEvent(d,{...eventArgs,kind:"registered"}),/accepted post-registration/);
assert.throws(()=>appendResearchEvent(d,{...eventArgs,date:"2020-01-01"}),/precedes the previous event/);
assert.throws(()=>appendResearchEvent(d,{...eventArgs,affects:["secret_file"]}),/valid unique fields/);

// Validate the actual command's data-only update in an isolated workspace.
const root=fs.mkdtempSync(path.join(os.tmpdir(),"ilc-rda02-"));
try{
 const dir=path.join(root,"research","directions");fs.mkdirSync(dir,{recursive:true});
 const file=path.join(dir,"QG-D01.json");
 fs.writeFileSync(file,JSON.stringify(d,null,2)+"\n");
 const preview=updateDirectionFile(root,{id:"QG-D01",...eventArgs,dryRun:true});
 assert.equal(preview.event.id,"QG-D01-H"+String(d.history.length+1).padStart(4,"0"));
 assert.equal(JSON.parse(fs.readFileSync(file,"utf8")).history.length,d.history.length);
 const result=updateDirectionFile(root,{id:"QG-D01",...eventArgs});
 assert.equal(result.event.id,"QG-D01-H"+String(d.history.length+1).padStart(4,"0"));
 assert.equal(JSON.parse(fs.readFileSync(file,"utf8")).history.length,d.history.length+1);
}finally{fs.rmSync(root,{recursive:true,force:true});}
console.log("RDA-02 history tests passed: immutable prefix, scope annotation, chronological event IDs, migration, review and intake.");
