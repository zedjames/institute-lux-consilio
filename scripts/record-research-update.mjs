// CLI: generate a scientific history event ID after editing the direction record.
// This tool makes no claim of editorial approval and does not publish or merge anything.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {DIRECTION_EDITABLE_FIELDS,RESEARCH_HISTORY_EVENTS} from "./build-research-directions.mjs";

function requireArg(ok,message){if(!ok)throw Error("RDA-02: "+message);}
export function appendResearchEvent(direction,{date,kind,summary,affects=[]}){
 requireArg(direction&&/^[A-Z]{2,4}-D\d\d$/.test(direction.id||""),"valid direction ID required");
 requireArg(RESEARCH_HISTORY_EVENTS.includes(kind)&&kind!=="registered","use an accepted post-registration event type");
 requireArg(typeof date==="string"&&/^20\d{2}-\d{2}-\d{2}$/.test(date)&&
 !Number.isNaN(Date.parse(date+"T00:00:00Z")),"explicit valid YYYY-MM-DD date required");
 requireArg(typeof summary==="string"&&summary.trim().length>8&&summary.length<1600,
  "a meaningful public-safe summary is required");
 requireArg(Array.isArray(affects)&&new Set(affects).size===affects.length&&
  affects.every(x=>DIRECTION_EDITABLE_FIELDS.includes(x)),"affects must list valid unique fields");
 requireArg(direction.history?.length>=1,"direction registration history missing");
 requireArg(date>=direction.history.at(-1).date,"new history date precedes the previous event");
 const id=direction.id+"-H"+String(direction.history.length+1).padStart(4,"0");
 const event={id,date,event:kind,summary:summary.trim(),affects};
 return {...direction,history:[...direction.history,event]};
}
function argsOf(argv){
 const args={};
 for(let i=0;i<argv.length;i++){
  if(argv[i]==="--dry-run"){args.dryRun=true;continue;}
  if(!/^--[a-z-]+$/.test(argv[i])||!argv[i+1]||argv[i+1].startsWith("--"))
   throw Error("RDA-02: expected --option value");
  args[argv[i].slice(2)]=argv[++i];
 }
 const accepted=new Set(["id","date","kind","summary","affects","root","dryRun"]);
 for(const key of Object.keys(args))
  if(!accepted.has(key))throw Error("RDA-02: unknown option "+key);
 return args;
}
export function updateDirectionFile(root,options){
 const id=options.id;
 requireArg(/^[A-Z]{2,4}-D\d\d$/.test(id||""),"provide --id QG-D01 etc.");
 const file=path.join(root,"research","directions",id+".json");
 requireArg(fs.existsSync(file),"unknown direction record "+id);
 const d=JSON.parse(fs.readFileSync(file,"utf8"));
 const affected=options.affects?options.affects.split(",").map(x=>x.trim()).filter(Boolean):[];
 const next=appendResearchEvent(d,{date:options.date,kind:options.kind,summary:options.summary,affects:affected});
 if(!options.dryRun)fs.writeFileSync(file,JSON.stringify(next,null,2)+"\n");
 return {event:next.history.at(-1),file,dryRun:!!options.dryRun};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const options=argsOf(process.argv.slice(2));
 const root=path.resolve(options.root||process.cwd());
 const result=updateDirectionFile(root,options);
 console.log((result.dryRun?"DRY RUN ":"")+"Registered "+result.event.id+" in "+result.file);
 console.log("Next: run node scripts/review-research-directions.mjs --base-ref origin/main");
 console.log("The reviewer checks actual changed fields, evidence standing and disclosure; no publication occurs here.");
}
