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
const FIELDS=new Set(["schema_version","id","title","stream","program_ids","program_relation","landing_href",
 "overview","question","foundation","limits","next","claims","obligations","obstructions",
 "relationships","history","publication_status","source_access","disclosure","display"]);
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
 for(const r of d.relationships){
  assertKeys(r,new Set(["kind","target","summary"]),d.id+" relationship");
  requireThat(RELATIONS.has(r.kind)&&/^([A-Z]{2,4})-D\d\d$/.test(r.target||"")&&nonempty(r.summary),
   d.id+" relationship malformed");
  requireThat(r.target!==d.id,d.id+" self-link must be documented as an obligation, not a direction relation");
 }
 requireThat(Array.isArray(d.history)&&d.history.length>0,d.id+" needs immutable first history entry");
 requireThat(d.history[0].event==="registered",d.id+" first event must register the direction");
 let last="";
 for(const h of d.history){
  assertKeys(h,new Set(["date","event","summary"]),d.id+" history");
  requireThat(validDate(h.date)&&h.date>=last&&nonempty(h.summary)&&nonempty(h.event),
   d.id+" invalid chronological history");
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
 for(const d of all)for(const r of d.relationships)
  requireThat(all.some(x=>x.id===r.target),d.id+" unresolved direction link "+r.target);
 for(const d of all)for(const c of d.claims)if(c.publication_id){
  const p=catalog.publications.find(x=>x.id===c.publication_id);
  requireThat(localHref(p.localPage||"publication-"+p.id+".html"),d.id+" cannot link to publication "+c.publication_id);
 }
 return all.filter(d=>d.disclosure==="public_summary").sort((a,b)=>a.display.order-b.display.order);
}
export function directionHref(d,catalog){
 if(d.landing_href)return d.landing_href;
 const p=catalog.programs.find(p=>p.id===d.program_ids[0]);
 return p.href+"#research-directions";
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
export function renderProgramDirections(directions,catalog,programId){
 const selected=directions.filter(d=>d.program_ids.includes(programId)||d.landing_href===programId);
 if(!selected.length)return "";
 const cards=selected.map(d=>{
  const pub=d.claims.find(c=>c.evidence==="published");
  const p=pub?catalog.publications.find(x=>x.id===pub.publication_id):null;
  const reference=p?`<a href="${textSafe(p.localPage||"publication-"+p.id+".html")}">Related published foundation →</a>`:
     `<span>Underlying formal work and ongoing research are not presented here as a published paper.</span>`;
  return `<article class="atlas-program-direction" data-direction-id="${textSafe(d.id)}">
  <p class="eyebrow">${textSafe(d.stream)} · ${textSafe(standing(d))}</p>
  <h3>${textSafe(d.title)}</h3>
  <p>${textSafe(d.overview)}</p>
  <p><strong>Scientific limit:</strong> ${textSafe(d.limits)}</p>
  <p><strong>Next question:</strong> ${textSafe(d.obligations[0].question)}</p>
  <p class="atlas-program-reference">${reference}</p>
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
 <p class="atlas-afterword">The Atlas preserves a direction's identity and history as its science develops. <a href="collaborate.html">Investigate with ILC →</a></p>
 </div></section>`;
}
