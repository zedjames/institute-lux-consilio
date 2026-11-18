// ILC-RDA-03 — render qualified research relationships from existing direction records.
// No second scientific relationship registry; the direction source is authoritative.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {loadDirections,directionHref} from "./build-research-directions.mjs";

const esc=v=>String(v??"").replace(/[&<>"\']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const STATUS={
 research_question:"Research question · no formal cross-program bridge claimed",
 proposed_bridge:"Proposed mathematical bridge · proof obligations remain",
 formal_internal_bridge:"Source-identified internal formal bridge · independent inspection subject to access",
 published_bridge:"Published, source-specific mathematical bridge"
};
const KINDS={
 informs:"Motivates investigation",
 related_question:"Shared scientific question",
 requires:"Requires",
 extends:"Extends",
 tests:"Tests",
 obstructed_by:"Encountered obstruction"
};
const claimStatus={published:"Published scoped result",formal_internal:"Governed formal source",
 research_in_progress:"Work in development",hypothesis:"Unproved scientific hypothesis"};
export function enumerateResearchConnections(directions){
 const names=new Map(directions.map(d=>[d.id,d]));
 return directions.flatMap(source=>source.relationships.map(edge=>{
  const target=names.get(edge.target);
  if(!target)throw Error("RDA-03 missing publicly eligible target "+edge.target);
  return {source,target,edge};
 }));
}
function basisName(d,id){
 const c=d.claims.find(c=>c.id===id);
 if(c)return id+" · "+claimStatus[c.evidence];
 if(d.obligations.some(o=>o.id===id))return id+" · open mathematical obligation";
 if(d.obstructions.some(o=>o.id===id))return id+" · scoped obstruction";
 throw Error("RDA-03 unknown source record "+id);
}
export function renderRelationshipAtlas(directions,catalog){
 const edges=enumerateResearchConnections(directions);
 const nav=directions.map(d=>`<a href="/research/atlas/#source-${esc(d.id)}">${esc(d.title)}</a>`).join("\n");
 const groups=directions.map(source=>{
  const own=edges.filter(e=>e.source.id===source.id);
  const heading=`<div class="atlas-rel-heading"><p class="eyebrow">${esc(source.stream)} · ${esc(source.id)}</p><h2 id="source-${esc(source.id)}"><a href="${esc(directionHref(source,catalog))}">${esc(source.title)}</a></h2><p>${esc(source.question)}</p></div>`;
  const content=own.length?own.map(({target,edge})=>`<article class="atlas-rel-card" id="relation-${esc(edge.id)}" data-relation-standing="${esc(edge.standing)}" data-relation-id="${esc(edge.id)}">
  <p class="atlas-rel-type">${esc(KINDS[edge.kind])} · ${esc(STATUS[edge.standing])}</p>
  <h3><a href="${esc(directionHref(target,catalog))}">${esc(target.title)}</a></h3>
  <p class="atlas-rel-summary">${esc(edge.summary)}</p>
  <p><strong>Scientific scope:</strong> ${esc(edge.scope)}</p>
  <p><strong>Source-side basis:</strong> ${edge.basis_ids.map(id=>`<code>${esc(basisName(source,id))}</code>`).join(" · ")}</p>
  <p class="atlas-rel-navigation"><a href="${esc(directionHref(source,catalog))}">Source direction →</a> <a href="${esc(directionHref(target,catalog))}">Connected direction →</a></p>
  </article>`).join("\n"):`<p class="atlas-rel-empty">No public cross-direction relationship has been registered for this direction. This does not imply that the underlying research is unrelated to other programs.</p>`;
  return `<section class="atlas-rel-group" aria-labelledby="source-${esc(source.id)}">${heading}<div class="atlas-rel-cards">${content}</div></section>`;
 }).join("\n");
 return `<section class="section atlas-rel-intro" id="connections"><div class="wrap">
  <p class="eyebrow">Living Research Atlas · Scientific relationships</p>
  <h1>How research questions connect.</h1>
  <p class="atlas-rel-lede">A mathematical construction can motivate another investigation, expose a missing interface, or create a precise opportunity for further work. Each connection below carries a source-side basis and a declared evidentiary standing.</p>
  <p class="atlas-rel-warning"><strong>Scientific standing:</strong> A research-question connection is not an established mathematical bridge. Any formal or published bridge must identify its own source-specific evidentiary standing and scope; a theorem in one program does not automatically certify a cross-program interface. No private Concordia source is exposed through this page.</p>
  <p class="atlas-rel-count">${directions.length} research directions · ${edges.length} explicitly qualified connections</p>
  <nav class="atlas-rel-nav" aria-label="Choose a scientific direction">${nav}</nav>
 </div></section>
 <section class="section atlas-rel-body"><div class="wrap">${groups}
 <p class="atlas-afterword">Every relationship is maintained with its originating research direction and its dated development history. <a href="research.html#current-directions">Return to the Research Atlas →</a> · <a href="collaborate.html">Propose a scientific investigation →</a></p>
 </div></section>`;
}
export function replaceRelationshipAtlas(page,content){
 const begin="<!-- ILC_RELATIONSHIP_ATLAS_START -->",end="<!-- ILC_RELATIONSHIP_ATLAS_END -->";
 const a=page.indexOf(begin),b=page.indexOf(end,a+begin.length);
 if(a<0||b<=a)throw Error("RDA-03 atlas markers missing");
 return page.slice(0,a+begin.length)+"\n"+content+"\n"+page.slice(b);
}
export function updateRelationships(root=process.cwd()){
 const text=fs.readFileSync(path.join(root,"assets/data/research.js"),"utf8").trim();
 if(!text.startsWith("window.ILC_DATA="))throw Error("RDA-03 missing publication/program catalog");
 const catalog=JSON.parse(text.slice("window.ILC_DATA=".length).replace(/;\s*$/,""));
 const directions=loadDirections(root,catalog);
 const file=path.join(root,"research/atlas/index.html");
 const original=fs.readFileSync(file,"utf8");
 fs.writeFileSync(file,replaceRelationshipAtlas(original,renderRelationshipAtlas(directions,catalog)));
 console.log("Generated "+enumerateResearchConnections(directions).length+" qualified connections across "+directions.length+" research directions.");
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))updateRelationships();
