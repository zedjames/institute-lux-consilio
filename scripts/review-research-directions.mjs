// Prints the RDA-02 editorial review packet and verifies append-only history against a Git base.
import fs from "node:fs";
import path from "node:path";
import {auditResearchDirections,writeReviewPacket} from "./audit-research-directions.mjs";
function getRef(argv){
 if(argv.length===0)return "origin/main";
 if(argv.length!==2||argv[0]!=="--base-ref"||!/^[A-Za-z0-9._/-]+$/.test(argv[1]))
  throw Error("Usage: node scripts/review-research-directions.mjs [--base-ref origin/main]");
 return argv[1];
}
const root=process.cwd();
const raw=fs.readFileSync(path.join(root,"assets/data/research.js"),"utf8").trim();
if(!raw.startsWith("window.ILC_DATA="))throw Error("Missing public scholarly catalog");
const catalog=JSON.parse(raw.replace(/^window\.ILC_DATA=/,"").replace(/;\s*$/,""));
writeReviewPacket(auditResearchDirections({root,baseRef:getRef(process.argv.slice(2)),catalog}));
