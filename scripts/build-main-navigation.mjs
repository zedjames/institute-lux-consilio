// Central static header navigation: browser JavaScript is not required.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
export const MAIN_NAV = Object.freeze([
 {id:"research",label:"Research",href:"research.html"},
 {id:"publications",label:"Publications",href:"publications.html"},
 {id:"concordia",label:"Concordia",href:"concordia/"},
 {id:"methods",label:"Methods",href:"methods.html"},
 {id:"about",label:"About",href:"institute.html"},
 {id:"collaborate",label:"Collaborate",href:"collaborate.html"}
]);
export function activeForPage(p) {
 p=String(p).replaceAll("\\","/");
 if(p.startsWith("concordia/"))return "concordia";
 if(p==="publications.html"||p==="publication.html"||/^publication-[a-z0-9-]+\.html$/.test(p))return "publications";
 if(p==="research.html"||p==="program.html"||/^research-[a-z0-9-]+\.html$/.test(p))return "research";
 if(p==="methods.html")return "methods";
 if(p==="institute.html"||p==="governance.html")return "about";
 if(p==="collaborate.html"||p==="contact.html")return "collaborate";
 return null;
}
export function renderMainNav(active=null){
 return '<nav class="nav__links site-nav" aria-label="Main navigation">'+
  MAIN_NAV.map(x=>'<a href="'+x.href+'"'+(active===x.id?' aria-current="page"':'')+'>'+x.label+'</a>').join("")+'</nav>';
}
export function rewriteMainNav(html,p){
 const re=/<nav class="nav__links site-nav" aria-label="Main navigation">[\s\S]*?<\/nav>/g;
 if([...html.matchAll(re)].length!==1)throw Error("Expected one main navigation: "+p);
 return html.replace(re,renderMainNav(activeForPage(p)));
}
export function updateFiles(root=process.cwd()){
 const pages=fs.readdirSync(root).filter(p=>p.endsWith(".html")&&!p.startsWith("preview-"))
  .concat(["concordia/index.html","concordia/inventory/index.html","concordia/runtime/index.html"]);
 for(const p of pages){const filepath=path.join(root,p),old=fs.readFileSync(filepath,"utf8"),next=rewriteMainNav(old,p);
  if(old!==next)fs.writeFileSync(filepath,next);}
 console.log("Refreshed the canonical static main navigation on "+pages.length+" pages.");
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))updateFiles();
