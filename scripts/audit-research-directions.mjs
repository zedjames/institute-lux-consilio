// ILC-RDA-02: Compare public scientific direction revisions against the actual base revision.
// CI reports a reviewer-facing change packet; it does not authorize publication or private access.
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {DIRECTION_EDITABLE_FIELDS,loadDirections} from "./build-research-directions.mjs";

function enforce(test,message){if(!test)throw Error("RDA-02: "+message);}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const ID=/^[A-Z]{2,4}-D\d\d$/;
const pubRoute=id=>"research/directions/"+id+".json";
function gitText(root,ref,file){
 try{
  return execFileSync("git",["-C",root,"show",ref+":"+file],
   {encoding:"utf8",maxBuffer:16*1024*1024,stdio:["ignore","pipe","pipe"]});
 }catch(e){throw Error("RDA-02: could not read "+file+" from "+ref+
   "; fetch the base ref locally or provide a valid --base-ref");}
}
export function checkDirectionRevision(before,after){
 enforce(before.id===after.id,"direction identity changed: "+before.id);
 enforce(before.schema_version===after.schema_version,"schema version changed: "+before.id);
 const count=before.history.length;
 enforce(after.history.length>=count,"research history was truncated: "+before.id);
 enforce(equal(before.history,after.history.slice(0,count)),
  "research history was rewritten or reordered: "+before.id);
 const appended=after.history.slice(count);
 const changed=DIRECTION_EDITABLE_FIELDS.filter(key=>!equal(before[key],after[key]));
 enforce(!changed.length||appended.length>0,
  "scientific changes without an appended event: "+before.id+" ("+changed.join(", ")+")");
 const declared=[...new Set(appended.flatMap(h=>h.affects))].sort();
 const actual=[...changed].sort();
 enforce(equal(declared,actual),
  "history affected-fields disagree with scientific changes: "+before.id+
  "; changed="+actual.join(",")+"; recorded="+declared.join(","));
 return {id:before.id,changed,appended,kind:"updated"};
}
export function checkRegisterRevisions(baseManifest,nowManifest,baseline,after){
 enforce(equal(baseManifest.registered,nowManifest.registered.slice(0,baseManifest.registered.length)),
  "registered direction identities were removed, reordered, or replaced");
 const oldIds=new Set(baseManifest.registered);
 const changes=[];
 for(const id of baseManifest.registered){
  enforce(baseline.has(id)&&after.has(id),"previously registered direction lost: "+id);
  const result=checkDirectionRevision(baseline.get(id),after.get(id));
  if(result.changed.length||result.appended.length)changes.push(result);
 }
 for(const id of nowManifest.registered.slice(baseManifest.registered.length)){
  enforce(ID.test(id)&&!oldIds.has(id)&&after.has(id),"new direction identity invalid: "+id);
  const d=after.get(id);
  enforce(d.history.length===1&&d.history[0].event==="registered",
   "new direction must begin with exactly one registration event: "+id);
  changes.push({id,changed:["new direction"],appended:d.history,kind:"new"});
 }
 return changes;
}
function markdown(changes){
 const heading="## ILC-RDA-02 · Scientific editorial review packet\n";
 if(!changes.length)return heading+"\nNo scientific direction changes in this revision.\n";
 const intro="\nThe changes below are proposed public summaries. This report is **not a scientific certification, editorial approval, or permission to disclose private material**. Review the source scope, public release permission, affected claims and unresolved obligations before merging.\n";
 const body=changes.map(c=>{
  const fields=c.changed.map(f=>"`"+f+"`").join(", ");
  const eventLines=c.appended.map(h=>
   "- **"+h.id+"** ("+h.date+"; "+h.event+"): "+h.summary+
   (h.affects.length?"  [fields: "+h.affects.join(", ")+"]":"")).join("\n");
  return "### "+c.id+" — "+c.kind+"\n\nChanged scientific fields: "+
    (fields||"none (history-only milestone)")+"\n\n"+eventLines;
 }).join("\n\n");
 return heading+intro+"\n"+body+"\n\n### Human editorial checkpoints\n"+
 "- [ ] Every public claim has an attributable evidence basis and accurate theorem/domain scope\n"+
 "- [ ] Any corrected or withdrawn claim is reflected in the historical event and current text\n"+
 "- [ ] Unpublished formal work is not described as a publication or physically validated result\n"+
 "- [ ] No confidential Concordia content or private source path was copied into the public register\n"+
 "- [ ] Publication IDs, accessibility and source obligations remain accurate\n";
}
export function auditResearchDirections({root=process.cwd(),baseRef="origin/main",catalog}={}){
 enforce(catalog?.programs?.length,"scholarly catalog required");
 // Run semantic and disclosure checks on ALL present records, including withheld summaries.
 loadDirections(root,catalog);
 const dir=path.join(root,"research/directions");
 const nowManifest=JSON.parse(fs.readFileSync(path.join(dir,"index.json"),"utf8"));
 const baseManifest=JSON.parse(gitText(root,baseRef,"research/directions/index.json"));
 const baseline=new Map(baseManifest.registered.map(id=>
  [id,JSON.parse(gitText(root,baseRef,pubRoute(id)))]));
 const after=new Map(nowManifest.registered.map(id=>
  [id,JSON.parse(fs.readFileSync(path.join(dir,id+".json"),"utf8"))]));
 const changes=checkRegisterRevisions(baseManifest,nowManifest,baseline,after);
 return {changes,report:markdown(changes)};
}
export function writeReviewPacket(result,{out=process.stdout}={}){
 out.write(result.report);
 if(process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,result.report+"\n");
}
