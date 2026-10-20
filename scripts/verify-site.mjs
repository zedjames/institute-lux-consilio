import fs from "node:fs";
import assert from "node:assert/strict";

const raw=fs.readFileSync("assets/data/research.js","utf8").trim();
assert.ok(raw.startsWith("window.ILC_DATA="),"Expected structured research data");
const data=JSON.parse(raw.replace(/^window\.ILC_DATA=/,"").replace(/;\s*$/,""));
const catalog=JSON.parse(fs.readFileSync("research/catalog.json","utf8"));
for(const key of ["programs","themes","questions","publications","notes"]){
 assert.deepStrictEqual(catalog[key],data[key],key+" differs from canonical ILC source");
}
const root=new Set(fs.readdirSync("."));
const navPages=[...root].filter(p=>p.endsWith(".html")&&!p.startsWith("preview-")).sort()
 .concat(["concordia/index.html","concordia/inventory/index.html","concordia/runtime/index.html"]);
for(const page of navPages){
 const html=fs.readFileSync(page,"utf8");
 const matches=[...html.matchAll(/<nav class="nav__links site-nav" aria-label="Main navigation">[\s\S]*?<\/nav>/g)];
 assert.equal(matches.length,1,"Missing unique static site navigation in "+page);
 assert.equal(matches[0][0],renderMainNav(activeForPage(page)),"Inconsistent site navigation / active section in "+page);
}
assert.ok(renderMainNav("concordia").includes('<a href="publications.html">Publications</a><a href="concordia/" aria-current="page">Concordia</a>'),
 "Concordia navigation must follow Publications and indicate its section.");

const aiDoc=fs.readFileSync("ai-scientific-continuity.html","utf8");
assert.ok(aiDoc.includes('href="https://instituteluxconsilio.org/ai-scientific-continuity.html"'),"AI disclosure missing canonical URL");
assert.ok(aiDoc.includes('"identifier":"ILC-AI-001"')&&aiDoc.includes('"version":"1.0"'),"AI disclosure version/identifier metadata missing");
for(const phrase of ["Scientific history and negative results","Scientific accountability remains with the human authors","Earlier publications retain their publication-specific disclosure histories","AI-generated explanations, reconstructions, and extensions","underlying materials remains subject","October 20, 2026"]){
 assert.ok(aiDoc.includes(phrase),"AI disclosure missing substantive or control language: "+phrase);
}
for(const linked of ["governance.html","methods.html","concordia/index.html","concordia/runtime/index.html"]){
 assert.ok(fs.readFileSync(linked,"utf8").includes('href="ai-scientific-continuity.html"'),"Institutional AI disclosure link missing from "+linked);
}
const concordia=fs.readFileSync("concordia/index.html","utf8");
const inv=JSON.parse(fs.readFileSync("concordia/inventory/snapshots.json","utf8"));
const snap=inv.snapshots.at(-1);
assert.deepStrictEqual({date:snap.date,commit:snap.commit,files:snap.files,lines:snap.lines,theorems:snap.theorems,lemmas:snap.lemmas,sha256:snap.recordSha256},
 {date:"2026-10-17",commit:"b0054d4773b4e76a6efce3e0b998494bb770678a",files:44808,lines:18935259,theorems:888350,lemmas:4718,sha256:"c9ebb23099ace4ddd9804797dd33dcf84d524d5cca3294836bdcdae44e8a262e"},
 "Concordia recorded inventory figures or provenance changed without review");
for(const [route,description] of [["inventory","formal source inventory"],["runtime","governed inquiry"]]){
 const p=fs.readFileSync("concordia/"+route+"/index.html","utf8");
 assert.ok(p.includes('<base href="/">'),"Concordia nested page missing base: "+route);
 assert.ok(p.includes('<link rel="canonical" href="https://instituteluxconsilio.org/concordia/'+route+'/">'),"Concordia nested page missing canonical: "+route);
 assert.ok(p.includes('href="concordia/"'),"Concordia nested page missing standing disclosure link: "+route);
 assert.ok(!p.includes('src="assets/data/research.js'),"Concordia science must not depend on JavaScript catalogs");
}
const inventoryHtml=fs.readFileSync("concordia/inventory/index.html","utf8");
for(const number of ["44,808","18,935,259","888,350","4,718",snap.commit,snap.recordSha256]) assert.ok(inventoryHtml.includes(number),"Concordia inventory missing "+number);
assert.ok(inventoryHtml.includes("No full Lean build"),"Concordia inventory missing build qualification");
const runtimeHtml=fs.readFileSync("concordia/runtime/index.html","utf8");
const signupName="institute-lux-consilio";
const buttondownEndpoint="https://buttondown.com/api/emails/embed-subscribe/"+signupName;
for(const [where,html] of [["overview",concordia],["runtime",runtimeHtml]]){
 assert.equal((html.match(/<form class="concordia-subscribe-form"/g)||[]).length,1,"Must publish one native HTML signup on "+where);
 assert.ok(html.includes('action="'+buttondownEndpoint+'" method="post"'),"Buttondown native POST endpoint missing on "+where);
 assert.ok(html.includes('type="email" name="email"')&&html.includes('name="embed" value="1"'),"Buttondown email/form fields missing on "+where);
 assert.ok(html.includes('type="checkbox"')&&html.includes('name="tag" value="sub_tag_1wmcktkxm58d2sdeaj4z1cfvkf"'),"Explicit opt-in tagging missing on "+where);
 assert.ok(html.includes('href="https://buttondown.com/'+signupName+'"'),"Hosted signup fallback missing on "+where);
 assert.ok(html.includes("Q2 2027")&&html.includes("Alpha Testing"),"Alpha/beta timing not stated on "+where);
 assert.ok(html.includes("not a beta invitation"),"Do not imply beta inclusion on "+where);
}
const betaCollaboration=fs.readFileSync("collaborate.html","utf8");
assert.ok(betaCollaboration.includes('href="concordia/runtime/#beta-interest"'),"Collaboration page omitted beta-interest route");
assert.ok(fs.readFileSync("concordia/inventory/index.html","utf8").includes('href="concordia/runtime/#beta-interest"'),"Inventory omitted beta-interest route");

assert.ok(runtimeHtml.includes("Cognition and scientific authority remain distinct")&&runtimeHtml.includes("Research collaboration by arrangement"),"Runtime scientific authority or scholarly access missing");
assert.ok(data.programDetails.formal.artifacts.some(x=>x.href==="concordia/inventory/"),"Formal program missing institutional source inventory");
assert.ok(!data.programDetails.formal.artifacts.some(x=>x.href.includes("fieldfluxbiosystems.com/lean-inventory")), "Outdated FFB inventory owner link remains");
assert.ok(concordia.includes('href="concordia/inventory/"')&&concordia.includes('href="concordia/runtime/"'),"Standing disclosure missing inventory/runtime navigation");
assert.ok(concordia.includes("Owner and steward")&&concordia.includes("ILC-CRD-001"),"Concordia provenance and ownership missing");

assert.ok(concordia.includes("ILC-CRD-001"),"Missing Concordia institutional disclosure identity");
assert.ok(concordia.includes('<link rel="canonical" href="https://instituteluxconsilio.org/concordia/">'),"Missing permanent Concordia canonical URL");
assert.ok(concordia.includes("<base href=\"/\">"),"Nested Concordia route must resolve root assets and links");
for(const file of ["index.html","institute.html","governance.html","methods.html"]){
 const linked=fs.readFileSync(file,"utf8");
 assert.ok(linked.includes('href="concordia/"'),file+" must link to the standing Concordia disclosure");
}
for(const id of PROGRAM_IDS){
 const program=data.programs.find(x=>x.id===id);
 assert.ok(program && program.href, "Unknown program: "+id);
 const html=fs.readFileSync(program.href,"utf8");
 assert.ok(!html.includes('id="program-detail"'),"Program page still relies on JavaScript: "+id);
 assert.ok(!html.includes('src="assets/data/research.js'),"Program page still needs client catalog: "+id);
 const start="<!-- ILC_PROGRAM_START -->", end="<!-- ILC_PROGRAM_END -->";
 const a=html.indexOf(start), b=html.indexOf(end,a+start.length);
 assert.ok(a>=0 && b>a,"Static program record missing: "+id);
 assert.equal(html.slice(a+start.length,b),renderProgramContent(data,id),"Static program page out of sync: "+id);
}

const qgPapersV2=data.publications.filter(x=>x.program==="qg");
assert.equal(qgPapersV2.length,8,"QG must retain the eight-paper sequence");
for(const id of ["sqg3","sqg4","sqg5","sqg6","sqg7"])assert.equal(qgPapersV2.find(p=>p.id===id)?.version,"2.0","QG v2 published edition marker missing: "+id);
assert.ok(data.programDetails.qg.narrative.some(s=>s.startsWith("Paper VIII v2.0 classifies")),"Paper VIII v2.0 scientific result is missing");
const qgVIII=qgPapersV2.find(p=>p.id==="sqg8");
assert.equal(qgVIII?.conceptDoi,"10.5281/zenodo.22939781","Paper VIII concept DOI family changed");
assert.ok(Number.parseFloat(String(qgVIII?.version||"").replace(/^v/,""))>=2,"Paper VIII must display the published v2.0 edition or later");
assert.notEqual(qgVIII?.doi,"10.5281/zenodo.22939782","Paper VIII reverted to its earlier Zenodo edition");
assert.ok(qgVIII?.pdf?.startsWith("https://zenodo.org/"),"Paper VIII must link a Zenodo-verifiable PDF");
assert.ok(!data.programDetails.qg.editionNotice,"Published v2.0 must not retain a stale manuscript/deposit warning");
const qgCurrentPage=fs.readFileSync("research-relational-quantum-gravity.html","utf8");
assert.ok(!qgCurrentPage.includes("earlier version-specific Zenodo DOI"),"Stale Paper VIII publication warning remains");
assert.ok(qgCurrentPage.includes("Paper VIII v2.0 classifies"),"Paper VIII v2.0 scientific conclusion must be explicit");
const qgSequenceDescription="A quantum scalar excitation is followed through a hierarchy of increasingly demanding mathematical and physical constraints, with each stage establishing what survives, what changes, what becomes identifiable, and what encounters an obstruction.";
const qgSeries=data.series.find(x=>x.id==="schwarzschild-qg");
assert.ok(qgSeries?.description.startsWith(qgSequenceDescription),
 "QG series description must retain its through-line about the quantum scalar excitation");
assert.equal(data.programDetails.qg?.narrative?.[0],qgSequenceDescription,
 "QG landing page must open with the exact scientific series framing");
const qgPage=fs.readFileSync("research-relational-quantum-gravity.html","utf8");
assert.ok(qgPage.includes("<p>"+qgSequenceDescription+"</p>"),
 "QG series statement must be present in rendered HTML, independently of JavaScript");
assert.ok(qgPage.includes('name="description" content="'+qgSequenceDescription+'"'),
 "QG search description must match its current series framing");
const kineticSeries=data.series.find(x=>x.id==="kinetic-organization-biological-function");
const kineticPaper=data.publications.find(x=>x.id==="kobf1");
assert.equal(kineticSeries?.publishedCount,2,"Kinetic Papers I–II registration missing");
const kineticII=data.publications.find(x=>x.id==="kobf2");
assert.equal(kineticII?.doi,"10.5281/zenodo.23512025","Kinetic Paper II published version DOI mismatch");
assert.equal(kineticII?.conceptDoi,"10.5281/zenodo.23512024","Kinetic Paper II all-version DOI mismatch");
assert.equal(kineticII?.seriesId,kineticPaper.seriesId);
assert.equal(kineticII?.order,2);
assert.ok(data.programDetails.kinetic.narrative.join(" ").includes("Paper II"),"Kinetic Paper II trajectory not updated");
const celestialVI=data.publications.find(x=>x.id==="gps6");
assert.equal(celestialVI?.doi,"10.5281/zenodo.23509540","Celestial Paper VI v2.0 DOI mismatch");
assert.equal(celestialVI?.conceptDoi,"10.5281/zenodo.23108945","Celestial Paper VI family DOI mismatch");
assert.equal(celestialVI?.version,"2.0","Celestial Paper VI must show revision v2.0");
assert.ok(celestialVI.summary.includes("disproving"),"Celestial VI bounded-completion no-go missing");
assert.ok(data.programDetails.celestial.frontier.includes("fails"),"Celestial series frontier must acknowledge completion obstruction");
assert.ok(data.programDetails.celestial.narrative.join(" ").includes("conditional"),"Paper VII condition should not disappear");
assert.equal(kineticPaper?.conceptDoi,"10.5281/zenodo.23405911","Kinetic Paper I Zenodo family changed");
assert.equal(kineticPaper?.program,"kinetic","Kinetic Paper I program link missing");
assert.equal(kineticPaper?.doi,"10.5281/zenodo.23405912","Kinetic Paper I version DOI mismatch");
assert.equal(data.publications.find(x=>x.id==="sqg7")?.title,"Finite Palatini BV Regulators for a Self-Consistent Einstein–Scalar Sector","QG Paper VII version title mismatch");
assert.ok(data.programDetails.kinetic?.artifacts?.some(x=>x.href==="publication-kobf1.html"),"Kinetic series artifact missing");
for(const htmlFile of ["index.html","research.html"]){
 const html=fs.readFileSync(htmlFile,"utf8");
 assert.ok(html.includes('data-static="1"'),"Missing crawlable program index in "+htmlFile);
 assert.ok(html.includes("<!-- ILC_PROGRAM_INDEX_START -->\n"+programCards(data)+"\n<!-- ILC_PROGRAM_INDEX_END -->"),"Stale research-program list in "+htmlFile);
}
const researchPage=fs.readFileSync("research.html","utf8");
assert.ok(researchPage.includes("<!-- ILC_QUESTION_INDEX_START -->\n"+questionCards(data)+"\n<!-- ILC_QUESTION_INDEX_END -->"),"Research questions must be present in static HTML");
assert.ok(researchPage.includes("<!-- ILC_THEME_INDEX_START -->\n"+themeCards(data)+"\n<!-- ILC_THEME_INDEX_END -->"),"Research themes must be present in static HTML");
assert.ok(researchPage.includes('id="question-grid" data-static="1"')&&researchPage.includes('id="theme-grid" class="theme-grid" data-static="1"'),"Research static visibility controls missing");
const home=fs.readFileSync("index.html","utf8");
assert.ok(home.includes("<!-- ILC_HOME_RECENT_START -->\n"+recentCards(data)+"\n<!-- ILC_HOME_RECENT_END -->"),"Stale homepage recent-publications list");
assert.ok(home.includes('data-limit="4" data-static="1"'),"Homepage client script may overwrite current research");
assert.ok(home.includes("<!-- ILC_HEALTH_FULLTEXT_START -->\n"+healthFullText(data)+"\n<!-- ILC_HEALTH_FULLTEXT_END -->"),"Homepage locally hosted Health PDFs missing or stale");
const generated=makeArtifacts(data);
assert.equal(Object.keys(generated.pages).length, data.publications.length-3,
 "Every catalog publication without an existing dedicated page must have a generated static record");
for(const p of data.publications){
 const page=publicationPath(p);
 assert.ok(root.has(page),"No directly crawlable HTML record for "+p.id);
 const html=fs.readFileSync(page,"utf8");
 assert.ok(html.includes('href="https://instituteluxconsilio.org/'+page+'"'),"Missing canonical for "+p.id);
 assert.ok(html.includes('name="citation_doi" content="'+p.doi+'"'),"Missing DOI citation for "+p.id);
 assert.ok(html.includes('name="citation_title"'),"Missing scholarly title citation for "+p.id);
 if(!p.localPage) assert.equal(html,generated.pages[page],"Generated publication record is out of sync: "+p.id);
}
assert.equal(fs.readFileSync("sitemap.xml","utf8"),generated.sitemap,"Generated sitemap is out of sync");
assert.ok(generated.locs.includes("concordia/"),"Concordia URL must persist in regenerated sitemap");
for(const route of ["concordia/inventory/","concordia/runtime/"])assert.ok(generated.locs.includes(route),"Missing Concordia sitemap entry "+route);
const archive=fs.readFileSync("publications.html","utf8"),start='<div id="publication-list" class="archive" data-static="1">',end='</div></div></section></main>';
const ia=archive.indexOf(start),ib=archive.indexOf(end,ia+start.length);
assert.ok(ia>=0&&ib>ia,"Archive markup missing");
assert.equal(archive.slice(ia+start.length,ib),"\n"+generated.archive+"\n","Crawlable archive index is out of sync");
assert.ok(archive.includes('data-filter="kinetic"'),"Kinetic program filter missing");
assert.equal((archive.match(/class="archive-item" data-program=/g)||[]).length,data.publications.length,"Publication list must expose all papers without JavaScript");
for(const p of data.publications){
 assert.ok(archive.includes('href="'+publicationPath(p)+'"'),"Static archive missing "+p.id);
}

import crypto from "node:crypto";
import {makeArtifacts, publicationPath} from "./build-publication-pages.mjs";
import {activeForPage,renderMainNav} from "./build-main-navigation.mjs";
import {renderProgramContent, PROGRAM_IDS} from "./build-program-pages.mjs";
import {programCards, recentCards, healthFullText, questionCards, themeCards} from "./build-site-discovery.mjs";
const pdfManifest=JSON.parse(fs.readFileSync("research/site-pdfs.json","utf8"));
const requiredPDFs=Object.fromEntries(pdfManifest.papers.map(p=>[
  p.recordPage.replace(/^publication-(hfd[0-9]+)\.html$/, "$1"),
  {page:p.recordPage,pdf:p.pdf,hash:p.sha256,doi:p.doi}
]));
assert.deepStrictEqual(Object.keys(requiredPDFs).sort(),["hfd4","hfd5","hfd6"]);
for(const p of data.publications){
 if(!["hfd4","hfd5","hfd6"].includes(p.id)) continue; // Dedicated on-site scholarly pages and PDFs are mandatory for these three locally archived papers; other programs legitimately link to FFB or verified Zenodo PDFs.
 assert.ok(p.pdf && p.localPage,"New public papers must have a site-hosted PDF and static scholarly record: "+p.id);
 const bytes=fs.readFileSync(p.pdf);
 assert.ok(bytes.subarray(0,5).equals(Buffer.from("%PDF-")),"Invalid PDF bytes for "+p.id);
 const html=fs.readFileSync(p.localPage,"utf8");
 assert.ok(html.includes('name="citation_pdf_url"') && html.includes(p.pdf),"Google Scholar full-text metadata missing for "+p.id);
 assert.ok(html.includes('name="citation_doi"'),"Publication DOI citation missing "+p.id);
}
for(const [id,w] of Object.entries(requiredPDFs)){
 const p=data.publications.find(x=>x.id===id);
 assert.equal(p?.localPage,w.page); assert.equal(p?.pdf,w.pdf);
 assert.equal(crypto.createHash("sha256").update(fs.readFileSync(w.pdf)).digest("hex"),w.hash,"On-site PDF differs from author-supplied bytes "+id);
 for(const file of ["publications.html","research-health-formally-defined.html","index.html"]){
  const html=fs.readFileSync(file,"utf8");
  assert.ok(html.includes(w.page)&&html.includes(w.pdf),"Publication or full-text link missing from "+file);
 }
}

const ids=(records,label)=>{
 const seen=new Set();
 for(const r of records){
  assert.ok(r.id,"Missing "+label+" ID");
  assert.ok(!seen.has(r.id),"Duplicate "+label+" ID: "+r.id);
  seen.add(r.id);
 }
};
ids(data.programs,"program");ids(data.publications,"publication");ids(data.notes,"note");
const healthPapers=data.publications.filter(p=>p.seriesId==="health-formally-defined").sort((a,b)=>a.order-b.order);
assert.deepStrictEqual(healthPapers.map(p=>p.order),[1,2,3,4,5,6],"Health series sequence I–VI");
assert.equal(data.series.find(s=>s.id==="health-formally-defined")?.publishedCount,6);
for (const [id,conceptDoi] of [
  ["hfd4","10.5281/zenodo.23268802"],
  ["hfd5","10.5281/zenodo.23268986"],
  ["hfd6","10.5281/zenodo.23301732"]
]) {
 const p=healthPapers.find(p=>p.id===id);
 assert.ok(p,"Missing new Health paper "+id);
 assert.ok(/^10[.]5281[/]zenodo[.][0-9]+$/.test(p.doi),"Invalid version DOI");
 // Four paper records may still have the precisely known legacy DOI inversion
 // until the initial verified Zenodo mirror transaction runs.
 const legacyVersion={hfd4:"10.5281/zenodo.23268803",hfd6:"10.5281/zenodo.23301733"};
 const legacy=p.doi===conceptDoi && p.conceptDoi===legacyVersion[id];
 assert.ok(p.conceptDoi===conceptDoi || legacy,"Incorrect all-versions DOI family");
 assert.equal(requiredPDFs[id].doi,p.doi,"Manifest version DOI differs from scholarly catalog");
 assert.equal(p.program,"health");
}

for(const p of data.programs){assert.ok(root.has(p.href),"Missing research program: "+p.href);}
for(const p of data.publications){assert.match(p.doi,/^10\.\d+\//,"Invalid DOI: "+p.id);}
// Paper VII: sequence, version DOI, all-versions DOI and scientific program.
const nsPublished=data.publications.filter(p=>p.seriesId==="navier-stokes").sort((a,b)=>a.order-b.order);
assert.deepStrictEqual(nsPublished.map(p=>p.order),nsPublished.map((_,i)=>i+1),"Navier-Stokes sequence must be consecutive");
assert.equal(data.series.find(s=>s.id==="navier-stokes")?.publishedCount,nsPublished.length);
const nsIV=nsPublished.find(p=>p.id==="ns4");
assert.equal(nsIV?.title,"Faithful Terminal Descent of Autonomous Histories in Periodic Navier–Stokes Flow");
assert.equal(nsIV?.conceptDoi,"10.5281/zenodo.23378028");
assert.equal(nsIV?.program,"ns");
const gaussianPapers=data.publications.filter(p=>p.seriesId==="gaussian").sort((a,b)=>a.order-b.order);
assert.deepStrictEqual(gaussianPapers.map(p=>p.order),[1,2,3,4,5,6,7],"Gaussian/Celestial sequence must contain Papers I–VII");
const pins=JSON.parse(fs.readFileSync("research/zenodo-concepts.json","utf8")).papers;
assert.deepStrictEqual(Object.keys(pins).sort(),data.publications.map(p=>p.id).sort(),"All ILC publications must be backed by audited Zenodo families");
for(const pub of data.publications){
 const pin=pins[pub.id];
 assert.ok(/^10[.]5281[/]zenodo[.][0-9]+$/.test(pub.doi),"Invalid version DOI "+pub.id);
 assert.ok(pin.concept_doi.startsWith("10.5281/zenodo."),"Missing verified concept family "+pub.id);
 if(pub.conceptDoi && pub.conceptDoi!==pin.concept_doi){
  // Preexisting inverse DOI pair allowed only until the first auto-sync.
  assert.equal(pub.doi,pin.concept_doi,"Concept DOI mismatch "+pub.id);
 }
 if(pub.pdf && pub.pdf.startsWith("https://zenodo.org/api/records/")){
  assert.match(pub.pdf,/[/]files[/].+[/]content$/,"Invalid pinned Zenodo PDF URL");
  assert.match(pub.pdfSha256||"",/^[0-9a-f]{64}$/,"Missing checksum for Zenodo-hosted publication "+pub.id);
 }
}
const paper7=gaussianPapers[6];
assert.equal(paper7.id,"gps7");
assert.ok(/^10[.]5281[/]zenodo[.][0-9]+$/.test(paper7.doi),"Missing valid Paper VII version DOI");
assert.ok(paper7.conceptDoi==="10.5281/zenodo.23246259" ||
 (paper7.doi==="10.5281/zenodo.23246259" && paper7.conceptDoi==="10.5281/zenodo.23246260"),
 "Paper VII concept/version mapping must match Zenodo or exact pre-migration pair");
assert.equal(paper7.program,"celestial");
assert.equal(data.series.find(s=>s.id==="gaussian")?.publishedCount,gaussianPapers.length);
for(const p of data.questions){assert.ok(p.href&&(root.has(p.href.split("#")[0])),"Question route unavailable: "+p.id);}
for(const file of ["index.html","research.html","publications.html","notes.html","note.html","publication.html","methods.html","institute.html","translation.html"]){
 const html=fs.readFileSync(file,"utf8");
 assert.ok(html.includes("Foundational Science &amp; Discovery")||html.includes("Foundational Science & Discovery"),"Wrong ILC identity in "+file);
 assert.ok(html.includes("assets/css/institute.css"),"Missing current stylesheet in "+file);
}
// The historical notes remain in the scholarly catalog but are not a current ILC
// public-facing section. Keep their records, while preventing navigation regressions.
assert.ok(data.notes.length>0,"Historical note records should remain preserved");
for(const page of fs.readdirSync(".").filter(name=>name.endsWith(".html")&&!["notes.html","note.html"].includes(name))){
 const html=fs.readFileSync(page,"utf8");
 assert.ok(!/href=["'](?:notes|note)\.html(?:\?|["'])/.test(html),"Paused note route unexpectedly exposed from "+page);
}
for(const page of ["notes.html","note.html"]){
 const html=fs.readFileSync(page,"utf8");
 assert.match(html,/<meta name="robots" content="noindex,follow">/,"Missing noindex on "+page);
 assert.ok(!/id="note-(?:list|detail)"/.test(html),"Paused note records re-exposed on "+page);
}
const sitemap=fs.readFileSync("sitemap.xml","utf8");
assert.ok(!/\/(?:notes|note)\.html/.test(sitemap),"Paused note routes unexpectedly present in sitemap");
console.log("ILC research integrity checks passed: "+data.programs.length+" programs, "+data.publications.length+" papers, "+data.notes.length+" notes.");
