// Render scientific program landing pages directly in HTML, from the same
// versioned research catalog as the permanent publication records.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
function htmlSafe(t){return String(t??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function pubPath(x){return x.localPage || "publication-"+x.id+".html";}
function usDate(s){return new Date(s+"T12:00:00Z").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});}
function renderProgramContent(d,id){
 const p=d.programs.find(x=>x.id===id);if(!p)throw Error("Unknown program: "+id);
 const detail=(d.programDetails||{})[id]||{};
 const all=(d.publications||[]).filter(x=>x.program===id);
 const pubs=(id==="rmmo"?all.filter(x=>x.seriesId==="rmmo"):all).sort((a,b)=>(a.order||0)-(b.order||0));
 const related=id==="rmmo"?all.filter(x=>x.seriesId!=="rmmo"):[];
 const seriesIds=[...new Set(pubs.map(x=>x.seriesId))], series=(d.series||[]).filter(s=>seriesIds.includes(s.id));
 const metrics=(detail.metrics||[]).map(m=>`<div><strong>${htmlSafe(m.value)}</strong><span>${htmlSafe(m.label)}</span></div>`).join("");
 const artifacts=(detail.artifacts||[]).map(a=>`<a class="artifact-row" href="${htmlSafe(a.href)}"><span class="artifact-row__kind">${htmlSafe(a.kind)}</span><strong>${htmlSafe(a.label)}</strong><span class="artifact-row__arrow">↗</span></a>`).join("");
 const questions=(detail.openQuestions||[]).map((q,i)=>`<li><span>${String(i+1).padStart(2,"0")}</span><p>${htmlSafe(q)}</p></li>`).join("");
 const narrative=(detail.narrative||[]).map(t=>`<p>${htmlSafe(t)}</p>`).join("");
 const methods=(detail.methods||[]).map(t=>`<li>${htmlSafe(t)}</li>`).join("");
 const paperCard=(x,i)=>`<article class="paper-stage"><div class="paper-stage__num">${String(x.order||i+1).padStart(2,"0")}</div><div><p class="meta">${htmlSafe(usDate(x.date))}${x.version?" · v"+htmlSafe(String(x.version).replace(/^v/,"")):""}</p><h3><a href="${htmlSafe(pubPath(x))}">${htmlSafe(x.title)}</a></h3>${x.subtitle?`<p class="paper-stage__subtitle">${htmlSafe(x.subtitle)}</p>`:""}<p>${htmlSafe(x.summary)}</p><div class="archive-item__links"><a href="${htmlSafe(pubPath(x))}">ILC record →</a>${x.doi?`<a href="https://doi.org/${encodeURIComponent(x.doi)}" target="_blank" rel="noopener">DOI ↗</a>`:""}</div></div></article>`;
 const status=series.length?htmlSafe(series.map(s=>s.status).join(" · ")):"The public sequence is maintained as part of ILC’s scholarly archive.";
 return `
<section class="program-hero"><div class="wrap"><p class="eyebrow">${htmlSafe(p.domain)} · ${htmlSafe(p.status)}</p><h1>${htmlSafe(p.title)}</h1><p class="lede">${htmlSafe(p.desc)}</p>${detail.question?`<div class="program-question"><span>Guiding question</span><p>${htmlSafe(detail.question)}</p></div>`:""}</div></section>
<section class="section"><div class="wrap program-layout"><article class="program-main"><p class="eyebrow">Program</p><h2>Research trajectory</h2><div class="program-narrative">${narrative||"<p>Public research program details are being consolidated.</p>"}</div></article><aside class="program-aside"><p class="eyebrow">Methods</p><ul class="method-list">${methods}</ul></aside></div></section>
${metrics?`<section class="section section--tight section--alt"><div class="wrap"><div class="program-metrics">${metrics}</div></div></section>`:""}
<section class="section section--alt"><div class="wrap"><div class="sec-head"><div><p class="eyebrow">Paper sequence</p><h2>Published stages of the program.</h2></div><p>${status}</p></div><div class="paper-sequence">${pubs.length?pubs.map(paperCard).join(""):'<p class="muted">No public papers are attached to this program yet.</p>'}</div></div></section>
${related.length?`<section class="section section--tight"><div class="wrap"><div class="sec-head"><div><p class="eyebrow">Related scientific work</p><h2>Adjacent research</h2></div></div><div class="paper-sequence">${related.map((x,i)=>paperCard(x,i)).join("")}</div></div></section>`:""}
<section class="section"><div class="wrap program-layout"><article class="program-main"><p class="eyebrow">Current frontier</p><h2>What the public record hands forward.</h2><p class="frontier-copy">${htmlSafe(detail.frontier||"The program remains active and will be updated as additional public results are released.")}</p></article><aside class="program-aside"><p class="eyebrow">Open questions</p><ol class="open-question-list">${questions}</ol></aside></div></section>
${artifacts?`<section class="section section--deep"><div class="wrap"><div class="sec-head"><div><p class="eyebrow" style="color:#c8ae83">Artifacts</p><h2>Research objects and verification surfaces.</h2></div><p style="color:#c7cfca">Papers and reproducible research records make the program inspectable.</p></div><div class="artifact-list">${artifacts}</div></div></section>`:""}
<section class="section section--tight"><div class="wrap"><a class="link-arrow" href="research.html">← Return to all research programs</a></div></section>
`;
}
const PROGRAM_IDS=["formal","celestial","ns","rmmo","qg","kinetic"];
function rewriteProgramPage(html, d, programId){
 const start='<main id="main">',end='</main>',a=html.indexOf(start),b=html.indexOf(end,a+start.length);
 if(a<0||b<a||html.indexOf(start,a+start.length)!==-1)throw Error("Unexpected research page main");
 const inner=renderProgramContent(d,programId);
 let out=html.slice(0,a)+start+'\n<!-- ILC_PROGRAM_START -->'+inner+'<!-- ILC_PROGRAM_END -->\n'+html.slice(b);
 const matcher=/<script src="assets\/data\/research\.js(?:\?[^"]*)?"><\/script>/g;
 if((out.match(matcher)||[]).length!==1)throw Error("Program page missing original catalog script");
 out=out.replace(matcher,"");
 return out;
}
export {PROGRAM_IDS, renderProgramContent};
export function updateFiles(root=process.cwd()){
 const raw=fs.readFileSync(path.join(root,"assets/data/research.js"),"utf8").trim();
 if(!raw.startsWith("window.ILC_DATA="))throw Error("Unknown catalog format");
 const data=JSON.parse(raw.slice("window.ILC_DATA=".length).replace(/;\s*$/,""));
 for(const id of PROGRAM_IDS){
  const program=data.programs.find(x=>x.id===id);
  if(!program||!program.href)throw Error("Unknown program "+id);
  const file=path.join(root,program.href), html=fs.readFileSync(file,"utf8");
  // Future updates replace only the main section; script removal is idempotent.
  const start='<main id="main">',end='</main>',a=html.indexOf(start),b=html.indexOf(end,a+start.length);
  if(a<0||b<a)throw Error("Malformed static program page "+program.href);
  const markerStart="<!-- ILC_PROGRAM_START -->",markerEnd="<!-- ILC_PROGRAM_END -->";
  let output=html.slice(0,a)+start+"\n"+markerStart+renderProgramContent(data,id)+markerEnd+"\n"+html.slice(b);
  output=output.replace(/<script src="assets\/data\/research\.js(?:\?[^"]*)?"><\/script>/g,"");
  if(output.includes('id="program-detail"'))throw Error("Client-side program route remains");
  fs.writeFileSync(file,output);
 }
 console.log("Updated "+PROGRAM_IDS.length+" static scientific program pages.");
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))updateFiles();
