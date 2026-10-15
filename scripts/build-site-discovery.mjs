// Public ILC program and recent-publication discovery are prerendered from
// the canonical paper catalog. This avoids browser-cache-dependent new series.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
function escHtml(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function paperHref(p){return p.localPage||"publication-"+p.id+".html";}
function fmtDate(s){return new Date(s+"T12:00:00Z").toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"});}
function programCards(data){return data.programs.map((p,i)=>`<a class="orbit-program reveal" href="${escHtml(p.href||"program.html?id="+encodeURIComponent(p.id))}"><span class="orbit-program__n">${String(i+1).padStart(2,"0")}</span><span class="orbit-program__domain">${escHtml(p.domain)}</span><div><strong>${escHtml(p.title)}</strong><p>${escHtml(p.desc)}</p></div><span class="orbit-program__status">${escHtml(p.status)}</span></a>`).join("\n");}
function recentCards(data){
 const list=[...data.publications].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4);
 return list.map(p=>`<article class="archive-item"><div class="meta">${fmtDate(p.date)}</div><div><h3><a href="${escHtml(paperHref(p))}">${escHtml(p.title)}</a></h3><p>${escHtml(p.series)} · Paper ${escHtml(p.order)}</p><div class="archive-item__links"><a href="${escHtml(paperHref(p))}">Publication record →</a><a href="https://doi.org/${escHtml(p.doi)}" target="_blank" rel="noopener">Zenodo DOI ↗</a>${p.pdf?`<a href="${escHtml(p.pdf)}" target="_blank" rel="noopener">Read PDF ↗</a>`:""}</div></div><div class="archive-item__right">Paper ${escHtml(p.order)}<br>Preprint</div></article>`).join("\n");
}
function updateProgramBlock(html,items){
 const st="<!-- ILC_PROGRAM_INDEX_START -->",en="<!-- ILC_PROGRAM_INDEX_END -->";
 if(html.includes(st)&&html.includes(en)){
  let a=html.indexOf(st)+st.length,b=html.indexOf(en,a);
  return html.slice(0,a)+"\n"+items+"\n"+html.slice(b);
 }
 const target='<div id="program-list" class="program-list"></div>';
 if(html.split(target).length!==2)throw Error("No unique program list placeholder");
 return html.replace(target,`<div id="program-list" class="program-list" data-static="1">${st}\n${items}\n${en}</div>`);
}
function updateHomeRecent(html,items){
 const st="<!-- ILC_HOME_RECENT_START -->",en="<!-- ILC_HOME_RECENT_END -->";
 if(html.includes(st)&&html.includes(en)){
 const a=html.indexOf(st)+st.length,b=html.indexOf(en,a);
 return html.slice(0,a)+"\n"+items+"\n"+html.slice(b);
 }
 const open='<div id="publication-list" class="archive" data-limit="4">',after='<section class="section section--mist"><div class="wrap"><div class="heading-row"><div><p class="eyebrow">Explore more</p>';
 const a=html.indexOf(open),b=html.indexOf(after,a+open.length);
 if(a<0||b<0)throw Error("Home recent section changed");
 const closings='</div></div></section>';let k=html.lastIndexOf(closings,b);
 if(k<=a||b-k>80)throw Error("Could not isolate recent section");
 const body=html.slice(a+open.length,k);
 if(!body.includes("archive-item"))throw Error("Missing prior latest papers");
 return html.slice(0,a)+open.replace('data-limit="4"','data-limit="4" data-static="1"')+st+"\n"+items+"\n"+en+html.slice(k);
}
function healthFullText(data){
 const pages=["hfd4","hfd5","hfd6"].map(id=>data.publications.find(x=>x.id===id));
 if(pages.some(p=>!p||!p.localPage||!p.pdf||!p.pdf.startsWith("papers/")))throw Error("Missing mandatory ILC full-text record");
 return `<div class="card" style="margin-top:24px"><p class="eyebrow">On-site scholarly full texts</p><h3>Health, Formally Defined — Papers IV–VI</h3><p>${pages.map(p=>`Paper ${["I","II","III","IV","V","VI"][p.order-1]}: <a href="${p.localPage}">publication record</a> · <a href="${p.pdf}" target="_blank" rel="noopener">PDF ↗</a>`).join(" &nbsp; · &nbsp; ")}</p></div>`;
}
function updateHealthFullText(html,block){
 const start="<!-- ILC_HEALTH_FULLTEXT_START -->",end="<!-- ILC_HEALTH_FULLTEXT_END -->";
 if(html.includes(start)&&html.includes(end)){const a=html.indexOf(start)+start.length,b=html.indexOf(end,a);return html.slice(0,a)+"\n"+block+"\n"+html.slice(b);}
 const marker="<!-- ILC_HOME_RECENT_END --></div></div></section>";
 if(html.split(marker).length!==2)throw Error("Unknown homepage recent section structure");
 return html.replace(marker,`<!-- ILC_HOME_RECENT_END --></div>\n${start}\n${block}\n${end}\n</div></section>`);
}
function updateDiscovery(data,home,research){
 let newHome=updateProgramBlock(home,programCards(data));
 let newResearch=updateProgramBlock(research,programCards(data));
 newHome=updateHomeRecent(newHome,recentCards(data));
 newHome=updateHealthFullText(newHome,healthFullText(data));
 // The remaining themes and questions continue to use the browser-side catalog.
 // Version the asset URLs to avoid stale scripts overwriting or hiding new content.
 for(const [o,n] of [
  ["assets/data/research.js?v=20261011-hfd6","assets/data/research.js?v=20261016-kinetic"],
  ["assets/js/site.js?v=20261009-hfd5","assets/js/site.js?v=20261016-discovery"]])newHome=newHome.replace(o,n);
 for(const [o,n] of [
  ["assets/data/research.js?v=20261011-hfd6","assets/data/research.js?v=20261016-kinetic"],
  ["assets/js/site.js?v=20261008-rmmo3","assets/js/site.js?v=20261016-discovery"]])newResearch=newResearch.replace(o,n);
 if(!newHome.includes("Kinetic Organization and Biological Function")||!newHome.includes("From Kinetic Movement to Biological Function")||!newResearch.includes("Kinetic Organization and Biological Function"))throw Error("Site discovery build missing new series/paper");
 return {home:newHome,research:newResearch};
}
export {programCards,recentCards,healthFullText,updateDiscovery};
export function updateSite(root=process.cwd()){
 const raw=fs.readFileSync(path.join(root,"assets/data/research.js"),"utf8").trim();
 if(!raw.startsWith("window.ILC_DATA="))throw Error("Unrecognized ILC catalog");
 const data=JSON.parse(raw.slice("window.ILC_DATA=".length).replace(/;\s*$/,""));
 const homePath=path.join(root,"index.html"),researchPath=path.join(root,"research.html");
 const output=updateDiscovery(data,fs.readFileSync(homePath,"utf8"),fs.readFileSync(researchPath,"utf8"));
 fs.writeFileSync(homePath,output.home);fs.writeFileSync(researchPath,output.research);
 console.log("Refreshed "+data.programs.length+" static research programs and four recent paper records.");
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))updateSite();
