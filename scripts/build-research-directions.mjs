// ILC-RDA-01: Public scientific research directions. This module never reads Concordia private files.
// Direction records contain only public-summary text approved for editorial review.
import fs from "node:fs";
import path from "node:path";

const EVIDENCE=new Set(["published","formal_internal","research_in_progress","hypothesis"]);
const DISCLOSURE=new Set(["public_summary","withheld"]);
const PUBLICATIONS=new Set(["unpublished_direction","initiative","preprint","published"]);
const ACCESS=new Set(["public","public_summary","governed","mixed","restricted"]);
const RELATIONS=new Set(["informs","related_question","requires","extends","tests","obstructed_by"]);
const OBSTRUCTION_STANDING=new Set(["formal_internal","research_obligation","published"]);
export const DIRECTION_EDITABLE_FIELDS=["title","stream","program_ids","program_relation","landing_href",
 "overview","question","foundation","limits","next","claims","obligations","obstructions",
 "relationships","inquiries","publication_status","source_access","disclosure","display"];
export const RESEARCH_HISTORY_EVENTS=["registered","finding","obstruction","correction",
 "question","publication","scope_change","relationship","editorial_review","milestone"];
const FIELDS=new Set(["schema_version","id","title","stream","program_ids","program_relation","landing_href",
 "overview","question","foundation","limits","next","claims","obligations","obstructions",
 "relationships","inquiries","history","publication_status","source_access","disclosure","display"]);
const textSafe=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
function requireThat(ok,message){if(!ok)throw Error("RDA-01: "+message);}
const validDate=v=>typeof v==="string"&&/^20\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(v)&&!Number.isNaN(Date.parse(v+"T00:00:00Z"));
const nonempty=v=>typeof v==="string"&&v.trim().length>8&&v.length<1600;
const uniq=items=>new Set(items).size===items.length;
const localHref=v=>typeof v==="string"&&/^[a-z0-9/-]+\.html(?:#[a-z0-9-]+)?$/.test(v)&&!v.includes("..");
function assertKeys(o,fields,context){
 requireThat(o&&typeof o==="object"&&!Array.isArray(o),context+" must be an object");
 for(const k of Object.keys(o))requireThat(fields.has(k),context+" has unexpected field "+k);
}
function validateOne(d,catalog){
 assertKeys(d,FIELDS,d?.id||"direction");
 requireThat(d.schema_version===1,"schema version unsupported");
 requireThat(/^([A-Z]{2,4})-D\d\d$/.test(d.id||""),"invalid direction identity");
 for(const k of ["title","stream","overview","question","foundation","limits","next"])
  requireThat(nonempty(d[k]),d.id+" missing meaningful "+k);
 requireThat(Array.isArray(d.program_ids)&&uniq(d.program_ids),d.id+" program IDs invalid");
 for(const id of d.program_ids)
  requireThat(catalog.programs.some(p=>p.id===id),d.id+" unknown program "+id);
 if(!d.program_ids.length)requireThat(localHref(d.landing_href),d.id+" needs a standalone emerging-program route");
 if(d.landing_href)requireThat(localHref(d.landing_href),d.id+" invalid landing URL");
 if(d.program_relation)requireThat(d.program_relation==="adjacent_research_stream",d.id+" unknown program relation");
 requireThat(PUBLICATIONS.has(d.publication_status),d.id+" invalid publication standing");
 requireThat(ACCESS.has(d.source_access),d.id+" invalid access standing");
 requireThat(DISCLOSURE.has(d.disclosure),d.id+" invalid disclosure");
 requireThat(d.display&&typeof d.display.featured==="boolean"&&
  Number.isInteger(d.display.order)&&d.display.order>0,d.id+" invalid display selection");
 requireThat(Array.isArray(d.claims)&&d.claims.length>0,d.id+" needs scoped claims");
 const claimIds=[];
 for(const c of d.claims){
  assertKeys(c,new Set(["id","statement","evidence","publication_id","scope"]),d.id+" claim");
  requireThat(typeof c.id==="string"&&c.id.startsWith(d.id+"-C"),d.id+" claim ID malformed");
  requireThat(nonempty(c.statement)&&nonempty(c.scope),d.id+" claim lacks scope");
  requireThat(EVIDENCE.has(c.evidence),d.id+" unknown evidence class");
  if(c.evidence==="published"){
   requireThat(typeof c.publication_id==="string"&&
    catalog.publications.some(p=>p.id===c.publication_id&&p.doi),
    d.id+" published claim lacks a real archived publication");
  }else requireThat(!c.publication_id,d.id+" unpublished claim may not borrow publication authority");
  claimIds.push(c.id);
 }
 requireThat(uniq(claimIds),d.id+" duplicate claim identity");
 requireThat(Array.isArray(d.obligations)&&d.obligations.length>0,d.id+" needs open obligations");
 const obligationIds=[];
 for(const o of d.obligations){
  assertKeys(o,new Set(["id","question"]),d.id+" obligation");
  requireThat(o.id?.startsWith(d.id+"-O")&&nonempty(o.question),d.id+" obligation invalid");
  obligationIds.push(o.id);
 }
 requireThat(uniq(obligationIds),d.id+" duplicate obligation");
 requireThat(Array.isArray(d.obstructions),d.id+" obstruction list missing");
 const obstructions=[];
 for(const o of d.obstructions){
  assertKeys(o,new Set(["id","summary","standing"]),d.id+" obstruction");
  requireThat(o.id?.startsWith(d.id+"-X")&&nonempty(o.summary)&&
    OBSTRUCTION_STANDING.has(o.standing),d.id+" obstruction requires qualified standing");
  obstructions.push(o.id);
 }
 requireThat(uniq(obstructions),d.id+" duplicate obstruction");
 requireThat(Array.isArray(d.relationships),d.id+" relationships missing");
 const relIds=[];
 for(const [index,r] of d.relationships.entries()){
  assertKeys(r,new Set(["id","kind","target","summary","standing","scope","basis_ids"]),d.id+" relationship");
  requireThat(r.id===d.id+"-R"+String(index+1).padStart(4,"0"),
   d.id+" relationship identity/sequence invalid");
  requireThat(RELATIONS.has(r.kind)&&/^([A-Z]{2,4})-D\d\d$/.test(r.target||"")&&
   nonempty(r.summary)&&nonempty(r.scope),d.id+" relationship malformed");
  requireThat(r.target!==d.id,d.id+" self-link must be an obligation, not a direction relation");
  requireThat(["research_question","proposed_bridge","formal_internal_bridge","published_bridge"].includes(r.standing),
   d.id+" relationship standing invalid");
  requireThat(Array.isArray(r.basis_ids)&&r.basis_ids.length>0&&uniq(r.basis_ids),
   d.id+" relationship requires a distinct source-side scientific basis");
  const accepted=[...d.claims.map(x=>x.id),...d.obligations.map(x=>x.id),...d.obstructions.map(x=>x.id)];
  requireThat(r.basis_ids.every(id=>accepted.includes(id)),
   d.id+" relationship references an unknown source claim, obligation, or obstruction");
  if(r.standing==="formal_internal_bridge"){
   requireThat(r.basis_ids.some(id=>d.claims.some(c=>c.id===id&&c.evidence==="formal_internal")),
    d.id+" formal bridge requires a separately scoped formal claim as its basis");
  }
  if(r.standing==="published_bridge"){
   requireThat(r.basis_ids.some(id=>d.claims.some(c=>c.id===id&&c.evidence==="published"&&c.publication_id)),
    d.id+" published bridge requires a cited published claim");
  }
  relIds.push(r.id);
 }
 requireThat(uniq(relIds),d.id+" duplicated relationship ID");
 if(d.inquiries!==undefined){
  requireThat(Array.isArray(d.inquiries)&&uniq(d.inquiries.map(x=>x.path)),
   d.id+" inquiry paths must be unique");
  for(const entry of d.inquiries){
   assertKeys(entry,new Set(["path","label","scope","basis_ids"]),d.id+" inquiry");
   requireThat(["history","identity","scale","observation"].includes(entry.path),
    d.id+" references an unknown authored inquiry path");
   requireThat(nonempty(entry.label)&&nonempty(entry.scope),
    d.id+" inquiry missing explanatory content");
   requireThat(Array.isArray(entry.basis_ids)&&entry.basis_ids.length>0&&uniq(entry.basis_ids),
    d.id+" inquiry must identify scoped scientific evidence or an open obligation");
   const ids=[...d.claims.map(x=>x.id),...d.obligations.map(x=>x.id),...d.obstructions.map(x=>x.id)];
   requireThat(entry.basis_ids.every(id=>ids.includes(id)),
    d.id+" inquiry basis is not an established claim, obstruction or obligation in its direction");
  }
 }
 requireThat(Array.isArray(d.history)&&d.history.length>0,d.id+" needs immutable first history entry");
 requireThat(d.history[0].event==="registered",d.id+" first event must register the direction");
 let last="";
 const historyTypes=new Set(RESEARCH_HISTORY_EVENTS);
 const editable=new Set(DIRECTION_EDITABLE_FIELDS);
 for(const [i,h] of d.history.entries()){
  assertKeys(h,new Set(["id","date","event","summary","affects"]),d.id+" history");
  requireThat(h.id===d.id+"-H"+String(i+1).padStart(4,"0"),
   d.id+" history event ID or sequence invalid");
  requireThat(validDate(h.date)&&h.date>=last&&nonempty(h.summary)&&historyTypes.has(h.event),
   d.id+" invalid chronological research event");
  requireThat(Array.isArray(h.affects)&&uniq(h.affects)&&h.affects.every(k=>editable.has(k)),
   d.id+" history affects must identify valid unique scientific record fields");
  requireThat((i===0)===(h.event==="registered"),d.id+" registration must occur exactly once, at the beginning");
  requireThat(i!==0||h.affects.length===0,d.id+" registration has no previous revision to compare");
  last=h.date;
 }
}
export function loadDirections(root=process.cwd(),catalog){
 requireThat(catalog?.programs?.length&&catalog?.publications?.length,"missing public scholarly catalog");
 const dir=path.join(root,"research/directions");
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,"index.json"),"utf8"));
 requireThat(manifest.schema_version===1&&Array.isArray(manifest.registered)&&
   uniq(manifest.registered)&&manifest.registered.every(id=>/^[A-Z]{2,4}-D\d\d$/.test(id)),"invalid direction manifest");
 const recorded=fs.readdirSync(dir).filter(n=>/\.json$/.test(n)&&!["index.json","schema.json"].includes(n)).sort();
 const expected=manifest.registered.map(id=>id+".json").sort();
 requireThat(JSON.stringify(recorded)===JSON.stringify(expected),
  "manifest and direction files differ; every direction requires an explicit identity");
 const all=manifest.registered.map(id=>{
  const d=JSON.parse(fs.readFileSync(path.join(dir,id+".json"),"utf8"));
  requireThat(d.id===id,"direction file identity mismatch: "+id);
  validateOne(d,catalog);return d;
 });
 requireThat(uniq(all.map(d=>d.display.order)),"duplicate featured order");
 for(const d of all)for(const r of d.relationships){
  const target=all.find(x=>x.id===r.target);
  requireThat(!!target,d.id+" unresolved direction link "+r.target);
  requireThat(target.disclosure==="public_summary"||d.disclosure!=="public_summary",
   d.id+" publicly visible relationship cannot expose a withheld direction "+r.target);
 }
 const existingInquiryPaths=all.filter(d=>d.disclosure==="public_summary")
  .flatMap(d=>(d.inquiries||[]).map(x=>x.path));
 requireThat(uniq(existingInquiryPaths),"an authored inquiry path has multiple public scientific owners");
 for(const d of all)for(const c of d.claims)if(c.publication_id){
  const p=catalog.publications.find(x=>x.id===c.publication_id);
  requireThat(localHref(p.localPage||"publication-"+p.id+".html"),d.id+" cannot link to publication "+c.publication_id);
 }
 return all.filter(d=>d.disclosure==="public_summary").sort((a,b)=>a.display.order-b.display.order);
}
export function directionHref(d,catalog){
 const base=d.landing_href||catalog.programs.find(p=>p.id===d.program_ids[0]).href;
 return base+"#direction-"+d.id;
}
function standing(d){
 if(d.publication_status==="initiative")return "Emerging initiative";
 if(d.claims.some(c=>c.evidence==="formal_internal"))return "Formal research in development";
 return "Continuing scientific investigation";
}
export function renderDirectionsOverview(directions,catalog){
 return directions.filter(d=>d.display.featured).map((d,i)=>`<article class="atlas-direction" data-direction-id="${textSafe(d.id)}">
  <p class="atlas-direction__kicker"><span>${String(i+1).padStart(2,"0")}</span> ${textSafe(d.stream)} · ${textSafe(standing(d))}</p>
  <h3><a href="${textSafe(directionHref(d,catalog))}">${textSafe(d.title)}</a></h3>
  <p class="atlas-direction__question">${textSafe(d.question)}</p>
  <p class="atlas-direction__scope"><strong>Evidence boundary:</strong> ${textSafe(d.limits)}</p>
  <p class="atlas-direction__next"><strong>Next:</strong> ${textSafe(d.next)}</p>
  <a class="arrow-link" href="${textSafe(directionHref(d,catalog))}">Explore this direction →</a>
 </article>`).join("\n");
}
// RDA-06: Detailed science is available on demand from existing vetted claim and
// obligation records. Native HTML disclosure keeps every statement readable without JS.
const DIRECTION_EVIDENCE_LABELS={
 published:"Published scholarly foundation",
 formal_internal:"Internal formal research",
 research_in_progress:"Developing investigation",
 hypothesis:"Scientific hypothesis",
 research_obligation:"Unresolved mathematical requirement"
};
export function renderDirectionEvidence(d,catalog){
 const claims=d.claims.map(c=>{
  const p=c.publication_id?catalog.publications.find(x=>x.id===c.publication_id):null;
  const cite=p?` <a href="${textSafe(p.localPage||"publication-"+p.id+".html")}">Published record →</a>`:"";
  return `<li><strong>${textSafe(c.statement)}</strong><span class="atlas-evidence-type">${textSafe(DIRECTION_EVIDENCE_LABELS[c.evidence])}</span><p><strong>Scope:</strong> ${textSafe(c.scope)}${cite}</p></li>`;
 }).join("");
 const obstructions=(d.obstructions||[]).map(x=>
  `<li><strong>${textSafe(x.summary)}</strong><span class="atlas-evidence-type">${textSafe(DIRECTION_EVIDENCE_LABELS[x.standing])}</span></li>`
 ).join("");
 const open=d.obligations.map(x=>`<li>${textSafe(x.question)}</li>`).join("");
 const adjacent=d.program_relation==="adjacent_research_stream"?
  '<p class="atlas-evidence-caveat">This is an adjacent research stream presented here for discovery; its scientific identity and source obligations remain distinct from the host research program.</p>':"";
 return `<details class="atlas-program-evidence" aria-label="Scientific basis and open work for ${textSafe(d.title)}">
 <summary>Examine the scientific basis and open questions</summary>
 <div class="atlas-program-evidence__body">
 <p class="atlas-evidence-intro">These claims retain their individual evidence classes and mathematical scope. Internal formal research is not a published paper or a live proof check.</p>
 <h4>Established foundations and developing results</h4><ol>${claims}</ol>
 ${obstructions?`<h4>Scoped obstructions</h4><ol>${obstructions}</ol>`:""}
 <h4>What remains to be demonstrated</h4><ol>${open}</ol>
 ${adjacent}
 </div></details>`;
}
export function renderProgramDirections(directions,catalog,programId){
 const selected=directions.filter(d=>d.program_ids.includes(programId)||d.landing_href===programId);
 if(!selected.length)return "";
 const cards=selected.map(d=>{
  const pub=d.claims.find(c=>c.evidence==="published");
  const p=pub?catalog.publications.find(x=>x.id===pub.publication_id):null;
  const reference=p?`<a href="${textSafe(p.localPage||"publication-"+p.id+".html")}">Related published foundation →</a>`:
     `<span>Underlying formal work and ongoing research are not presented here as a published paper.</span>`;
  const links=d.relationships.map(rel=>{
   const other=directions.find(x=>x.id===rel.target);
   if(!other)return "";
   return `<a href="${textSafe(directionHref(other,catalog))}">${textSafe(other.title)}</a>`;
  }).filter(Boolean).join(" · ");
  return `<article class="atlas-program-direction" id="direction-${textSafe(d.id)}" data-direction-id="${textSafe(d.id)}">
  <p class="eyebrow">${textSafe(d.stream)} · ${textSafe(standing(d))}</p>
  <h3>${textSafe(d.title)}</h3>
  <p>${textSafe(d.overview)}</p>
  <p><strong>Scientific limit:</strong> ${textSafe(d.limits)}</p>
  <p><strong>Next question:</strong> ${textSafe(d.obligations[0].question)}</p>
  <p class="atlas-program-reference">${reference}</p>
  ${renderDirectionEvidence(d,catalog)}
${d.inquiries?.length?`  <p class="atlas-program-relations"><strong>Curated investigation:</strong> ${d.inquiries.map(i=>`<a href="research/quantum-gravity-formal-lineage/?path=${encodeURIComponent(i.path)}&amp;depth=idea#inquiry">${textSafe(i.label)}</a>`).join(" · ")} <span>(authored, source-scoped)</span></p>\n`:""}  ${links?`<p class="atlas-program-relations"><strong>Related inquiry:</strong> ${links} · <a href="research/atlas/#connections">Explore the relationship →</a></p>`:""}
  </article>`;
 }).join("\n");
 return `<section class="section section--mist" id="research-directions" aria-labelledby="program-atlas-heading">
 <div class="wrap"><div class="heading-row"><div><p class="eyebrow">Living Research Atlas · Curated directions</p><h2 id="program-atlas-heading">Questions taking shape.</h2></div></div>
 <p class="atlas-intro">These directions distinguish published foundations, developing research and open mathematical obligations. A public summary is not independent verification of governed research sources.</p>
 <div class="atlas-program-grid">${cards}</div>
 <p><a class="arrow-link" href="research.html#current-directions">Explore the Institute's research directions →</a></p></div></section>\n`;
}
export function renderDirectionsSection(directions,catalog){
 return `<section class="section atlas-section" id="current-directions" aria-labelledby="atlas-section-heading">
 <div class="wrap"><div class="heading-row"><div><p class="eyebrow">Living Research Atlas · Current directions</p><h2 id="atlas-section-heading">Questions now emerging from the research.</h2></div></div>
 <p class="atlas-intro">New mathematical constructions can reveal fresh research questions, qualified relationships and genuine obstructions. The selections below distinguish established published foundations from continuing investigations. Claims about private formal sources remain scoped, and future results are not presented as completed publications.</p>
 <div id="direction-grid" class="atlas-directions" data-static="1"><!-- ILC_DIRECTION_INDEX_START -->
${renderDirectionsOverview(directions,catalog)}
<!-- ILC_DIRECTION_INDEX_END --></div>
 <p class="atlas-afterword">The Atlas preserves each direction's identity, history and qualified links to other investigations. <a href="research/atlas/">Explore relationships between directions →</a> · <a href="collaborate.html">Investigate with ILC →</a></p>
 </div></section>`;
}
