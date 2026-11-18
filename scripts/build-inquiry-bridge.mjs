// ILC-RDA-04: curated inquiry provenance, compiled exclusively from approved public direction records.
// No live source access, AI service, or delegated verification is implemented by this generator.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {loadDirections,directionHref} from "./build-research-directions.mjs";

const EXHIBIT="research/quantum-gravity-formal-lineage/";
const PATHS=["history","identity","scale","observation"];
const html=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const publicationPage=p=>p.localPage||"publication-"+p.id+".html";
const evidenceLabel={
 published:"Published research foundation",
 formal_internal:"Governed formal work; not a public paper",
 research_in_progress:"Developing research; not a published result",
 hypothesis:"Research hypothesis; not an established theorem",
 obligation:"Open mathematical obligation",
 obstruction:"Scoped obstruction or unresolved boundary"
};
function identifyBasis(d,id,catalog){
 const c=d.claims.find(x=>x.id===id);
 if(c){
  const published=c.evidence==="published"?catalog.publications.find(p=>p.id===c.publication_id):null;
  if(c.evidence==="published"&&!published)throw Error("RDA-04 missing published scholarly source "+id);
  return {id,standing:c.evidence,label:evidenceLabel[c.evidence],statement:c.statement,
   scope:c.scope,...(published?{publication_id:published.id,publication_page:publicationPage(published),doi:published.doi}:{})};
 }
 const o=d.obligations.find(x=>x.id===id);
 if(o)return {id,standing:"obligation",label:evidenceLabel.obligation,statement:o.question};
 const x=d.obstructions.find(x=>x.id===id);
 if(x)return {id,standing:"obstruction",label:evidenceLabel.obstruction,statement:x.summary};
 throw Error("RDA-04 missing scoped scientific basis "+id);
}
export function buildPublicInquiryIndex(directions,catalog){
 const views=directions.flatMap(d=>(d.inquiries||[]).map(q=>({
  path:q.path,label:q.label,direction_id:d.id,direction_title:d.title,
  direction_href:directionHref(d,catalog),
  question:d.question,scope:q.scope,limits:d.limits,
  basis:q.basis_ids.map(id=>identifyBasis(d,id,catalog)),
  url:EXHIBIT+"?path="+encodeURIComponent(q.path)+"&depth=idea#inquiry",
  interface_kind:"authored_curated_source_scoped"
 })));
 for(const id of PATHS)if(views.filter(x=>x.path===id).length!==1)
  throw Error("RDA-04 requires exactly one public direction per authored QG inquiry path: "+id);
 return {schema_version:1,kind:"public_curated_inquiry_index",
  generated_from:"approved research/directions public summaries",
  public_source_scope:"Each view retains authored prose; this index supplies only scoped public provenance.",
  runtime_status:"in_development_not_publicly_available",
  live_formal_verification:false,ai_generated_responses:false,
  paths:PATHS.map(id=>views.find(x=>x.path===id))};
}
export function renderInquiryProvenance(index){
 const cards=index.paths.map(view=>{
  const evidence=view.basis.map(b=>`<li><code>${html(b.id)}</code> <strong>${html(b.label)}</strong> — ${html(b.statement)}${b.publication_page?` <a href="${html(b.publication_page)}">Publication record →</a>`:""}</li>`).join("");
  return `<article class="qx-inquiry-origin" data-inquiry-source-for="${html(view.path)}" data-inquiry-direction-id="${html(view.direction_id)}">
  <p class="qx-inquiry-label">${html(view.label)} · Atlas provenance</p>
  <h3><a href="${html(view.direction_href)}">${html(view.direction_title)}</a></h3>
  <p><strong>Research scope:</strong> ${html(view.scope)}</p>
  <p><strong>Evidence boundary:</strong> ${html(view.limits)}</p>
  <ul class="qx-inquiry-basis">${evidence}</ul>
  <p><a href="${html(view.direction_href)}">Examine the research-direction record →</a></p>
  </article>`;
 }).join("\n");
 return `<section class="qx-inquiry-origins" aria-labelledby="qx-inquiry-origins-title">
  <p class="eyebrow">Scientific provenance · Public research record</p>
  <h3 id="qx-inquiry-origins-title">The sources behind this inquiry.</h3>
  <p>Each authored inquiry is linked to an approved Research Atlas direction, its declared evidence and what remains open. These references do not imply a live Concordia proof replay, an AI response, or publication of internal source material.</p>
  <div class="qx-inquiry-origin-panels" id="qx-inquiry-origin-panels">${cards}</div>
  <p class="qx-inquiry-origin-note"><a href="research/atlas/">Explore how the scientific directions relate →</a> · <a href="concordia/runtime/">Concordia Runtime — in development →</a></p>
 </section>`;
}
export function replaceInquiryProvenance(page,content){
 const start="<!-- ILC_INQUIRY_PROVENANCE_START -->",end="<!-- ILC_INQUIRY_PROVENANCE_END -->";
 const a=page.indexOf(start),b=page.indexOf(end,a+start.length);
 if(a<0||b<=a)throw Error("RDA-04 provenance markers missing from QG exhibit");
 return page.slice(0,a+start.length)+"\n"+content+"\n"+page.slice(b);
}
export function updateInquiryBridge(root=process.cwd()){
 const raw=fs.readFileSync(path.join(root,"assets/data/research.js"),"utf8").trim();
 if(!raw.startsWith("window.ILC_DATA="))throw Error("RDA-04 missing scholarly catalog");
 const catalog=JSON.parse(raw.slice("window.ILC_DATA=".length).replace(/;\s*$/,""));
 const index=buildPublicInquiryIndex(loadDirections(root,catalog),catalog);
 const file=path.join(root,EXHIBIT,"index.html");
 const page=fs.readFileSync(file,"utf8");
 fs.writeFileSync(file,replaceInquiryProvenance(page,renderInquiryProvenance(index)));
 const manifest=path.join(root,"research/atlas/inquiry-index.json");
 fs.writeFileSync(manifest,JSON.stringify(index,null,2)+"\n");
 console.log("Generated "+index.paths.length+" source-grounded authored inquiry links and public-read-only provenance index.");
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))updateInquiryBridge();
