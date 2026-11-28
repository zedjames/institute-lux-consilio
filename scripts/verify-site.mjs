import fs from "node:fs";
import assert from "node:assert/strict";
import {renderEssencePublications} from "./build-essence-publications.mjs";
import {CLOUDFLARE_WEB_ANALYTICS_BEACON} from "./cloudflare-analytics.mjs";
import {enumerateResearchConnections,renderRelationshipAtlas,replaceRelationshipAtlas} from "./build-research-relationships.mjs";

const raw=fs.readFileSync("assets/data/research.js","utf8").trim();
assert.ok(raw.startsWith("window.ILC_DATA="),"Expected structured research data");
const data=JSON.parse(raw.replace(/^window\.ILC_DATA=/,"").replace(/;\s*$/,""));
function assertVersionedPublication(p,{concept,minRecord,minDate,minVersion}){
 assert.ok(p&&p.id,"Missing source publication");
 assert.equal(p.conceptDoi,concept,"Stable Zenodo concept DOI changed: "+p.id);
 const m=/^10[.]5281\/zenodo[.]([0-9]+)$/.exec(p.doi||"");
 assert.ok(m,"Malformed version DOI: "+p.id);
 assert.ok(Number(m[1])>=minRecord,"Older Zenodo edition restored: "+p.id);
 assert.match(p.date||"",/^20[0-9]{2}-[01][0-9]-[0-3][0-9]$/,"Malformed publication date: "+p.id);
 assert.ok(p.date>=minDate,"Earlier publication date restored: "+p.id);
 if(minVersion){
  const parts=x=>String(x||"").replace(/^v/,"").split(".").map(Number);
  const cv=parts(p.version),mv=parts(minVersion);
  assert.ok(cv.length&&cv.every(Number.isInteger)&&cv.every(x=>x>=0),"Invalid edition number: "+p.id);
  let cmp=0;
  for(let i=0;i<Math.max(cv.length,mv.length);i++){let a=cv[i]||0,b=mv[i]||0;if(a!==b){cmp=a>b?1:-1;break;}}
  assert.ok(cmp>=0,"Older publication version restored: "+p.id);
 }
 if(p.pdf?.startsWith("https://zenodo.org/api/records/")){
  assert.ok(p.pdf.startsWith("https://zenodo.org/api/records/"+m[1]+"/files/"),"PDF points to a different version record: "+p.id);
  assert.ok(p.pdf.endsWith("/content"),"Zenodo PDF URL malformed: "+p.id);
  assert.match(p.pdfSha256||"",/^[0-9a-f]{64}$/,"Missing published PDF SHA-256: "+p.id);
 }
 const html=fs.readFileSync("publication-"+p.id+".html","utf8");
 assert.ok(html.includes('name="citation_doi" content="'+p.doi+'"'),"Static publication DOI differs from catalog: "+p.id);
 if(p.pdf)assert.ok(html.includes(p.pdf),"Static publication PDF differs from catalog: "+p.id);
}

const catalog=JSON.parse(fs.readFileSync("research/catalog.json","utf8"));
for(const key of ["programs","emergingPrograms","themes","questions","publications","notes"]){
 assert.deepStrictEqual(catalog[key],data[key],key+" differs from canonical ILC source");
}
const root=new Set(fs.readdirSync("."));
const navPages=[...root].filter(p=>p.endsWith(".html")&&!p.startsWith("preview-")).sort()
 .concat(["concordia/index.html","concordia/inventory/index.html","concordia/runtime/index.html","research/atlas/index.html","research/quantum-gravity-formal-lineage/index.html","support/index.html","support/concordia/index.html","support/concordia/research/index.html","support/concordia/brief/index.html","support/patrons/index.html","support/partnerships/index.html"]);
// Require the exact Cloudflare script, exactly once per published page.
for(const page of navPages){
 const html=fs.readFileSync(page,"utf8");
 assert.equal(html.split(CLOUDFLARE_WEB_ANALYTICS_BEACON).length-1,1,
  "Missing or duplicated canonical Cloudflare Web Analytics beacon: "+page);
 assert.equal(html.split("static.cloudflareinsights.com/beacon.min.js").length-1,1,
  "Unexpected number of Cloudflare analytics scripts: "+page);
 assert.ok(html.indexOf(CLOUDFLARE_WEB_ANALYTICS_BEACON)<html.indexOf("</head>"),
  "Cloudflare Web Analytics must appear inside the HTML head: "+page);
}
for(const page of navPages){
 const html=fs.readFileSync(page,"utf8");
 const matches=[...html.matchAll(/<nav class="nav__links site-nav" aria-label="Main navigation">[\s\S]*?<\/nav>/g)];
 assert.equal(matches.length,1,"Missing unique static site navigation in "+page);
 assert.equal(matches[0][0],renderMainNav(activeForPage(page)),"Inconsistent site navigation / active section in "+page);
}
// The philanthropic pages retain static navigation and are checked against their shared source.
for(const page of navPages){
 const html=fs.readFileSync(page,"utf8");
 assert.ok(html.includes('<a href="support/">Support ILC</a>'),"Missing Support footer: "+page);
}
// Public correspondence must be available in static HTML, without client JavaScript.
const generalEmail='mailto:contact@instituteluxconsilio.org';
const researchEmail='mailto:research@instituteluxconsilio.org';
const contactPage=fs.readFileSync("contact.html","utf8");
const collaborationPage=fs.readFileSync("collaborate.html","utf8");
for(const address of [generalEmail,researchEmail]){
 assert.ok(contactPage.includes('href="'+address+'"'),"Contact page missing accessible public mailbox: "+address);
}
assert.ok(!contactPage.includes("will be added when the ILC domain is launched"),"Outdated ILC contact placeholder remains");
assert.ok(collaborationPage.includes('href="'+researchEmail+'"'),"Scholarly collaboration must offer direct research correspondence");
const siteSitemap=fs.readFileSync("sitemap.xml","utf8");
const sitePageRoutes=[...siteSitemap.matchAll(/<loc>https:\/\/instituteluxconsilio[.]org\/([^<]*)<\/loc>/g)]
 .map(m=>m[1]).filter(route=>!route.endsWith(".pdf"))
 .map(route=>route===""?"index.html":route.endsWith("/")?route+"index.html":route)
 .filter(route=>route.endsWith(".html"));
for(const route of sitePageRoutes){
 const markup=fs.readFileSync(route,"utf8");
 assert.ok(markup.includes('<a href="'+generalEmail+'">Email ILC</a>'),
  "Static footer lacks visible general email entry: "+route);
}
assert.ok(fs.readFileSync("scripts/build-publication-pages.mjs","utf8").includes('<a href="'+generalEmail+'">Email ILC</a>'),
 "Publication generator would erase the sitewide email footer");

assert.ok(renderMainNav("concordia").includes('<a href="publications.html">Publications</a><a href="concordia/" aria-current="page">Concordia</a>'),
 "Concordia navigation must follow Publications and indicate its section.");

const aiDoc=fs.readFileSync("ai-scientific-continuity.html","utf8");
assert.ok(aiDoc.includes('href="https://instituteluxconsilio.org/ai-scientific-continuity.html"'),"AI disclosure missing canonical URL");
assert.ok(aiDoc.includes('"identifier":"ILC-AI-001"')&&aiDoc.includes('"version":"1.1"')&&aiDoc.includes('"dateModified":"2026-11-17"'),"AI disclosure v1.1 identity or revision metadata missing");
for(const phrase of ["Scientific history and negative results","Scientific accountability remains with the human authors","Earlier publications retain their publication-specific disclosure histories","AI-generated explanations, reconstructions, and extensions","underlying materials remains subject","October 20, 2026"]){
 assert.ok(aiDoc.includes(phrase),"AI disclosure missing substantive or control language: "+phrase);
}
for(const linked of ["governance.html","methods.html","concordia/index.html","concordia/runtime/index.html"]){
 assert.ok(fs.readFileSync(linked,"utf8").includes('href="ai-scientific-continuity.html"'),"Institutional AI disclosure link missing from "+linked);
}
// The seven-page editorial revision must preserve source-grounded interpretation
// and distinguish a proposed explanation from its actual evidentiary authority.
for(const [page,phrase] of [
 ["index.html","Its coherence does not establish its scientific authority."],
 ["institute.html","successful communication to the first audience"],
 ["methods.html","sufficiently explicit to constrain interpretation"],
 ["publications.html","constraining claims to the authority of its evidence"],
 ["concordia/index.html","constrain subsequent interpretations to its evidentiary authority"],
 ["concordia/runtime/index.html","without silently replacing missing evidence with a plausible reconstruction"],
 ["ai-scientific-continuity.html","constrain interpretation to what the available evidence establishes"]
]){
 const markup=fs.readFileSync(page,"utf8");
 assert.ok(markup.toLowerCase().includes(phrase.toLowerCase()),"Missing source-constrained scholarship principle in "+page);
}
assert.ok(aiDoc.includes("Version 1.1 — Source-constrained AI-mediated scientific inquiry")&&aiDoc.includes("Version 1.0 — Initial institutional statement"),"AI standing statement must preserve its amendment history");
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
assert.ok(!/workbench/i.test(runtimeHtml),"Do not present Runtime and Workbench as separate public products");
assert.ok(runtimeHtml.includes("integrated research interface"),"Runtime must be presented as one integrated research environment");

assert.ok(runtimeHtml.includes("Formal and Source Worlds")&&runtimeHtml.includes("Research inhabitants")&&runtimeHtml.includes("Intended review record"),
 "Runtime must distinguish the corpus, inhabitants and claim-scoped scientific review");
assert.ok(!runtimeHtml.includes('<p class="eyebrow">Research architecture</p>')&&!runtimeHtml.includes('<h2>Worlds, inhabitants and continuity</h2>'),
 "A second architecture overview duplicates the scientific laboratory section");
assert.equal((runtimeHtml.match(/<div class="concordia-stages">/g)||[]).length,1,
 "Keep one research-process diagram alongside the unified architecture explanation");

const aboutMission=fs.readFileSync("institute.html","utf8");
assert.ok(aboutMission.includes("generational horizon")&&aboutMission.includes("Why Institute Lux Consilio exists.")&&aboutMission.includes("negative results, and unresolved questions"),"ILC generational purpose or research continuity absent");
assert.ok(aboutMission.includes("The freedom to pursue science across generations."),"About page must state scientific independence and long-horizon purpose");
const homeVision=fs.readFileSync("index.html","utf8");
assert.ok(homeVision.includes("Scientific knowledge for questions not yet asked.")&&homeVision.includes("Why scientific scholarship must evolve."),"Homepage must introduce long-horizon scholarship and why it evolves");
for(const phrase of ["professional interface between the Formal World","inhabited digital scientific laboratory","digital scientific staff","Evidence without a full-corpus checkout","claim-scoped, source-bound review","Alpha Testing"]){
 assert.ok(runtimeHtml.includes(phrase),"Concordia laboratory or qualification missing: "+phrase);
}
assert.ok(concordia.includes('"version":"1.2"')&&concordia.includes("Version 1.2 — Professional Runtime interface"),"ILC-CRD-001 version and history disagree");
assert.ok(concordia.includes("a complete local fork is not the ordinary prerequisite")&&concordia.includes("scoped source access or rerunnable checks"),"Concordia review scope or reproducibility caveat missing");

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

// Stable one-click ZIP assets must be discoverable on every published series page.
// The release publisher verifies actual PDF bytes against Zenodo and publishes the
// archives separately; static site tests validate page-to-release identity.
const completeSeriesDownloads={
 health:["research-health-formally-defined.html","health-formally-defined",8],
 kinetic:["research-kinetic-organization-biological-function.html","kinetic-organization-biological-function",5],
 rmmo:["research-relational-morphogenesis.html","rmmo",3],
 celestial:["research-gaussian-celestial.html","gaussian",9],
 qg:["research-relational-quantum-gravity.html","schwarzschild-qg",10],
 ns:["research-navier-stokes.html","navier-stokes",4],
};
for(const [program,[page,seriesId,count]] of Object.entries(completeSeriesDownloads)){
 const papers=data.publications.filter(p=>p.program===program&&(program!=="rmmo"||p.seriesId==="rmmo"));
 assert.equal(papers.length,count,"Series count or archive expectation changed: "+program);
 const expected="https://github.com/zedjames/institute-lux-consilio/releases/download/series-latest/ilc-"+seriesId+"-latest.zip";
 const html=fs.readFileSync(page,"utf8");
 assert.ok(html.includes('href="'+expected+'"'),"Missing stable ZIP download on "+page);
 assert.ok(html.includes("Download complete series (ZIP)"),"Missing direct download text on "+page);
 assert.equal((html.match(/Download complete series \(ZIP\)/g)||[]).length,1,"Duplicated download control on "+page);
}
assert.ok(!fs.readFileSync("research-formal-infrastructure.html","utf8").includes("Download complete series (ZIP)"),
 "Formal infrastructure program has no published paper sequence to download");

// ILC's research purpose is expressed through source-grounded inquiries,
// with each program retaining its own mathematical and physical scope.
const inquiryProgramPages={
 qg:"research-relational-quantum-gravity.html",
 celestial:"research-gaussian-celestial.html",
 kinetic:"research-kinetic-organization-biological-function.html",
 ns:"research-navier-stokes.html",
 rmmo:"research-relational-morphogenesis.html",
 health:"research-health-formally-defined.html"
};
for(const [program,page] of Object.entries(inquiryProgramPages)){
 const inquiry=data.programDetails[program]?.inquiry;
 assert.ok(inquiry&&inquiry.intro&&(inquiry.paragraphs||[]).length>=2&&inquiry.centralQuestion,
  "Missing authored continuing-inquiry statement for "+program);
 const html=fs.readFileSync(page,"utf8");
 assert.equal((html.match(/aria-label="The inquiry behind this research series"/g)||[]).length,1,
  "Expected exactly one visible inquiry introduction: "+page);
 assert.ok(html.includes(inquiry.heading)&&html.includes(escapeHtmlForInquiryTest(inquiry.centralQuestion)),
  "Page omits its authored research question: "+page);
}
function escapeHtmlForInquiryTest(value){
 return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
const fundamentalQuestion="What if the properties we call \"matter\" and \"geometry\" are not fully independent ingredients of the world, but two distinguishable descriptions of relationships that become apparent through their exchanges?";
assert.equal(data.programDetails.qg.inquiry.centralQuestion,fundamentalQuestion,
 "Keep the direct matter/geometry foundational inquiry");
assert.ok(data.programDetails.qg.inquiry.intro.startsWith("We are questioning whether our habit of defining objects first"),
 "Schwarzschild QG inquiry must retain its direct question of object-first assumptions");
const methodsContent=fs.readFileSync("methods.html","utf8");
for(const phrase of ["Objects, relationships, and physical exchange",
 "Follow the question through successive constructions.",
 "A mathematical or physical finding can open new questions",
 "A paper is a scientific contribution within its stated scope",
 "Preserve the source. Constrain interpretation. Enable inquiry."]){
 assert.ok(methodsContent.includes(phrase),"ILC Methods page omitted foundational research rationale: "+phrase);
}
const healthInquiryHtml=fs.readFileSync(inquiryProgramPages.health,"utf8");
const healthInquiryStart="<!-- ILC_HEALTH_INQUIRY_START -->",healthInquiryEnd="<!-- ILC_HEALTH_INQUIRY_END -->";
const hi=healthInquiryHtml.indexOf(healthInquiryStart),hj=healthInquiryHtml.indexOf(healthInquiryEnd,hi+healthInquiryStart.length);
assert.ok(hi>=0&&hj>hi,"Health inquiry must remain regenerable");
assert.equal(healthInquiryHtml.slice(hi+healthInquiryStart.length,hj),"\n"+renderResearchInquiry(data.programDetails.health.inquiry),
 "Health series inquiry differs from canonical research data");

const qgPapersV2=data.publications.filter(x=>x.program==="qg");
assert.equal(qgPapersV2.length,10,"QG must retain the ten-paper sequence");
assert.deepStrictEqual(qgPapersV2.map(p=>p.order).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10],"Schwarzschild Paper X must extend the complete sequence");
for(const id of ["sqg3","sqg4","sqg5","sqg6","sqg7"])assert.ok(Number.parseFloat(qgPapersV2.find(p=>p.id===id)?.version||"0")>=2,"QG v2 or newer edition marker missing: "+id);
assert.ok(data.programDetails.qg.narrative.some(s=>s.startsWith("Paper VIII v2.0 classifies")),"Paper VIII v2.0 scientific result is missing");
const qgVIII=qgPapersV2.find(p=>p.id==="sqg8");
assert.equal(qgVIII?.conceptDoi,"10.5281/zenodo.22939781","Paper VIII concept DOI family changed");
assert.ok(Number.parseFloat(String(qgVIII?.version||"").replace(/^v/,""))>=2,"Paper VIII must display the published v2.0 edition or later");
assert.notEqual(qgVIII?.doi,"10.5281/zenodo.22939782","Paper VIII reverted to its earlier Zenodo edition");
assert.ok(qgVIII?.pdf?.startsWith("https://zenodo.org/"),"Paper VIII must link a Zenodo-verifiable PDF");
assert.ok(!data.programDetails.qg.editionNotice,"Published v2.0 must not retain a stale manuscript/deposit warning");
const qgIX=qgPapersV2.find(p=>p.id==="sqg9");
assert.ok(qgIX&&qgIX.order===9&&qgIX.seriesId==="schwarzschild-qg","Schwarzschild IX sequence registration missing");
assert.equal(qgIX.title,"Causal Exterior Ownership for a Moving Einstein–Scalar Quantum Sector");
assertVersionedPublication(qgIX,{concept:"10.5281/zenodo.23604371",minRecord:23604372,minDate:"2026-10-23",minVersion:"1.0"});
assert.ok(qgIX.summary.includes("negative proper-time surface energy")&&qgIX.summary.includes("Global exterior continuation"),"Paper IX scientific result or physical scope missing");
assert.ok(data.programDetails.qg.narrative.some(p=>p.startsWith("Paper IX v1.0 continues")),"Paper IX research trajectory missing");
assert.equal(data.series.find(x=>x.id==="schwarzschild-qg")?.publishedCount,10,"QG series published count incorrect");
const qgIXPage=fs.readFileSync("publication-sqg9.html","utf8");
assert.ok(qgIXPage.includes('name="citation_doi" content="'+qgIX.doi+'"')&&qgIXPage.includes(qgIX.pdf),"Paper IX static page missing scholarly DOI or PDF");
assert.ok(fs.readFileSync("publications.html","utf8").includes('href="publication-sqg9.html"'),"Schwarzschild IX must remain discoverable in archive");

const qgX=qgPapersV2.find(p=>p.id==="sqg10");
assert.ok(qgX&&qgX.order===10&&qgX.seriesId==="schwarzschild-qg","Schwarzschild X publication registration missing");
assert.equal(qgX.title,"Global Coherence of a Quantum-Sourced Einstein–Scalar History");
assertVersionedPublication(qgX,{concept:"10.5281/zenodo.23700767",minRecord:23990050,minDate:"2026-11-05",minVersion:"2.0"});
assert.ok(qgX.summary.includes("physical-past Einstein–scalar spacetime")&&qgX.summary.includes("not a maximal history"),"Paper X earned-global and continuation scope missing");
assert.ok(qgX.summary.includes("open equality collar")&&qgX.summary.includes("nondegenerate alternating pairing"),"Paper X v2.0 classical joining and local wave result missing");
assert.ok(data.programDetails.qg.narrative.some(x=>x.startsWith("Paper X v2.0 proves")),"Paper X v2.0 QG trajectory missing");
assert.ok(data.programDetails.qg.frontier.includes("Paper X v2.0")&&data.programDetails.qg.frontier.includes("quantum"),"Paper X future quantum scope missing");
assert.ok(data.programDetails.qg.artifacts.some(x=>x.href==="publication-sqg10.html"),"Paper X scholarly artifact missing");
const qgXHtml=fs.readFileSync("publication-sqg10.html","utf8");
assert.ok(qgXHtml.includes('name="citation_doi" content="'+qgX.doi+'"')&&qgXHtml.includes(qgX.pdf),"Paper X static record missing current DOI or PDF");
assert.ok(fs.readFileSync("publication-sqg9.html","utf8").includes('href="publication-sqg10.html"'),"Paper IX must link forward to X");
assert.ok(fs.readFileSync("publications.html","utf8").includes('href="publication-sqg10.html"'),"Schwarzschild X missing from publication archive");
assert.ok(fs.readFileSync("sitemap.xml","utf8").includes("publication-sqg10.html"),"Schwarzschild X missing from sitemap");
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
assert.equal(kineticSeries?.publishedCount,5,"Kinetic Papers I–V registration missing");
assert.deepStrictEqual(data.publications.filter(x=>x.program==="kinetic").map(x=>x.order).sort((a,b)=>a-b),[1,2,3,4,5],"Kinetic series order must be complete");
const kineticII=data.publications.find(x=>x.id==="kobf2");
assert.ok(/^10[.]5281[/]zenodo[.][0-9]+$/.test(kineticII?.doi||"") && Number(kineticII.doi.split(".").at(-1))>=23512025,"Kinetic Paper II must use the verified v1.0 or a newer Zenodo version");
assert.equal(kineticII?.conceptDoi,"10.5281/zenodo.23512024","Kinetic Paper II all-version DOI mismatch");
assert.equal(kineticII?.seriesId,kineticPaper.seriesId);
assert.equal(kineticII?.order,2);
assert.ok(data.programDetails.kinetic.narrative.join(" ").includes("Paper II"),"Kinetic Paper II trajectory not updated");
const celestialVI=data.publications.find(x=>x.id==="gps6");
assert.ok(/^10[.]5281[/]zenodo[.][0-9]+$/.test(celestialVI?.doi||"") && Number(celestialVI.doi.split(".").at(-1))>=23509540,"Celestial Paper VI must retain the verified v2.0 or a newer Zenodo edition");
assert.equal(celestialVI?.conceptDoi,"10.5281/zenodo.23108945","Celestial Paper VI family DOI mismatch");
assert.ok(/^\d+(?:[.]\d+)*$/.test(celestialVI?.version||"") && Number(celestialVI.version.split(".")[0])>=2,"Celestial Paper VI must remain at v2.0 or later");
assert.ok(celestialVI.summary.includes("disproving"),"Celestial VI bounded-completion no-go missing");
assert.ok(data.programDetails.celestial.frontier.includes("does not admit uniform bounded Hilbert completion"),"Celestial series frontier must acknowledge failure of bounded completion");
assert.ok(data.programDetails.celestial.narrative.join(" ").includes("without restoring the bounded completion"),"Paper VII v2.0 must not depend on the refuted bounded completion");
assert.ok(data.programDetails.celestial.narrative.join(" ").includes("true partial-adjoint range"),"Paper VII v2.0 physical adjoint-range finding missing");
const celestialVII=data.publications.find(x=>x.id==="gps7");
assert.equal(celestialVII?.conceptDoi,"10.5281/zenodo.23246259","Celestial VII all-versions DOI family changed");
assert.ok(Number(celestialVII?.doi?.split(".").at(-1))>=23545548,"Celestial VII must be at v2.0 or later");
assert.ok(Number(celestialVII?.version?.split(".")[0])>=2,"Celestial VII must show v2.0 or later");
assert.ok(celestialVII?.summary?.includes("true partial Hilbert adjoint range"),"Celestial Paper VII v2.0 scope missing");
assert.ok(celestialVII?.pdf?.includes("/api/records/")&&/^[0-9a-f]{64}$/.test(celestialVII.pdfSha256||""),"Celestial VII current published PDF must be checksum-verified");
assert.equal(data.programDetails.celestial.foundation?.title,"From Celestial Data to Physical Correspondence");
assert.equal(data.programDetails.celestial.foundation?.paragraphs?.length,5);
const celestialPage=fs.readFileSync("research-gaussian-celestial.html","utf8");
assert.ok(celestialPage.includes("<h2>From Celestial Data to Physical Correspondence</h2>"),"Celestial scientific purpose heading missing");
assert.ok(celestialPage.indexOf("From Celestial Data to Physical Correspondence")<celestialPage.indexOf("Research trajectory"),"Foundational framing must precede trajectory");
assert.equal((celestialPage.match(/<p class="eyebrow">Scientific purpose<\/p>/g)||[]).length,1,"Do not duplicate the Celestial scientific purpose");
for(const phrase of ["Which conclusions follow from an established scattering construction","what information survives representation","additional requirements of a physically realized celestial theory"]){
 assert.ok(data.programDetails.celestial.foundation.paragraphs.some(p=>p.includes(phrase)), "Celestial physical-correspondence boundary missing: "+phrase);
 assert.ok(celestialPage.includes(phrase),"Celestial source framing not rendered statically: "+phrase);
}
assert.ok(celestialPage.includes("complement amplitude-based celestial holography"),"Respect for distinct celestial research frameworks missing");
const celestialVIII=data.publications.find(x=>x.id==="gps8");
assert.ok(celestialVIII&&celestialVIII.order===8&&celestialVIII.program==="celestial","Celestial VIII published entry missing");
assert.equal(celestialVIII.title,"Interaction Topologies of Celestial Radiative States");
assertVersionedPublication(celestialVIII,{concept:"10.5281/zenodo.23651437",minRecord:23651438,minDate:"2026-10-25",minVersion:"1.0"});
assert.ok(celestialVIII.summary.includes("entire admissible cubic span")&&celestialVIII.summary.includes("No continuum scattering operator"),"Celestial VIII must preserve topology and scattering scope");
assert.ok(data.programDetails.celestial.narrative.some(x=>x.startsWith("Paper VIII v1.0 proves")),"Celestial VIII trajectory missing");
assert.ok(data.programDetails.celestial.frontier.includes("Paper IX")&&!data.programDetails.celestial.frontier.includes("being drafted"),"Celestial IX must be represented as the newest published geometric result");
assert.equal(data.series.find(s=>s.id==="gaussian")?.publishedCount,9,"Celestial published sequence must include IX");
assert.equal(data.series.find(s=>s.id==="gaussian")?.status,"Papers I–IX published");
assert.ok(data.programDetails.celestial.artifacts.some(x=>x.href==="publication-gps8.html"),"Celestial VIII scholarly artifact missing");
const celestialVIIIHtml=fs.readFileSync("publication-gps8.html","utf8");
assert.ok(celestialVIIIHtml.includes('name="citation_doi" content="'+celestialVIII.doi+'"')&&celestialVIIIHtml.includes(celestialVIII.pdf),"Celestial VIII indexed publication must expose current DOI and PDF");
assert.ok(fs.readFileSync("publication-gps7.html","utf8").includes('href="publication-gps8.html"'),"Celestial VII must link to next published paper");
assert.ok(fs.readFileSync("publications.html","utf8").includes('href="publication-gps9.html"'),"Celestial Paper IX missing from publication archive");
assert.ok(fs.readFileSync("sitemap.xml","utf8").includes("publication-gps8.html"),"Celestial VIII missing from static sitemap");
const celestialIX=data.publications.find(x=>x.id==="gps9");
assert.ok(celestialIX&&celestialIX.order===9&&celestialIX.seriesId==="gaussian"&&celestialIX.program==="celestial");
assertVersionedPublication(celestialIX,{concept:"10.5281/zenodo.24539999",minRecord:24540001,minDate:"2026-11-25",minVersion:"1.0"});
assert.equal(celestialIX.pdfSha256,"3bbbd8931f926a41fea65553971779645e677149d9314420cd63021532dc52af","Paper IX PDF differs from verified uploaded and Zenodo bytes");
assert.ok(celestialIX.pdf.startsWith("https://zenodo.org/api/records/24540001/files/")&&celestialIX.pdf.endsWith("/content"),"Celestial Paper IX lacks verified direct scholarly PDF URL");
assert.ok(celestialIX.summary.includes("320-dimensional sitewise trace kernel")&&
 celestialIX.summary.includes("211")&&celestialIX.summary.includes("347")&&
 celestialIX.summary.includes("boundary Cartan"),"Celestial IX must retain both physical observation results and action-derived boundary context");
assert.ok(data.programDetails.celestial.narrative.some(x=>x.startsWith("Paper IX v1.0 reconstructs"))&&
 data.programDetails.celestial.artifacts.some(x=>x.href==="publication-gps9.html"),
 "Celestial Paper IX must appear in the scientific trajectory and scholarly artifacts");
const celestialIXHtml=fs.readFileSync("publication-gps9.html","utf8");
assert.ok(celestialIXHtml.includes('name="citation_doi" content="'+celestialIX.doi+'"')&&
 celestialIXHtml.includes('name="citation_title" content="'+celestialIX.title+'"'),
 "Celestial IX must have correct machine-readable scholarly citation metadata");
assert.ok(fs.readFileSync("publication-gps8.html","utf8").includes('href="publication-gps9.html"'),
 "Paper VIII must lead to its new successor Paper IX");
assert.ok(siteSitemap.includes("<loc>https://instituteluxconsilio.org/publication-gps9.html</loc>"),
 "Celestial IX must be indexed in the static sitemap");
const kineticIII=data.publications.find(x=>x.id==="kobf3");
assert.equal(kineticIII?.conceptDoi,"10.5281/zenodo.23547073","Kinetic Paper III DOI family changed");
assert.ok(Number(kineticIII?.doi?.split(".").at(-1))>=23547074,"Kinetic Paper III must remain at v1.0 or later");
assert.equal(kineticIII?.order,3);
assert.equal(kineticIII?.program,"kinetic");
assert.ok(kineticIII?.summary?.includes("conditional propagation of chaos"),"Kinetic Paper III must state its conditional statistical scope");
assert.ok(kineticIII?.pdf?.includes("/api/records/")&&/^[0-9a-f]{64}$/.test(kineticIII.pdfSha256||""),"Kinetic Paper III published PDF must be checksum-verified");
assert.ok(data.programDetails.kinetic.narrative.join(" ").includes("Paper III"),"Kinetic III program narrative missing");
const kineticIV=data.publications.find(x=>x.id==="kobf4");
assert.ok(kineticIV&&kineticIV.order===4&&kineticIV.program==="kinetic","Kinetic IV publication missing");
assert.equal(kineticIV.title,"Stationary Organization and Functional Persistence in Collective Kinetic Systems");
assertVersionedPublication(kineticIV,{concept:"10.5281/zenodo.23604747",minRecord:23604748,minDate:"2026-10-23",minVersion:"1.0"});
assert.ok(kineticIV.summary.includes("compact attracting set")&&kineticIV.summary.includes("does not establish global point selection"),"Kinetic IV must retain local vs global stability boundary");
assert.ok(kineticIV.summary.includes("limits do not commute"),"Kinetic IV finite/collective survival boundary missing");
assert.ok(data.programDetails.kinetic.narrative.some(x=>x.startsWith("Paper IV examines")),"Kinetic IV trajectory absent");
assert.ok(data.programDetails.kinetic.frontier.includes("Paper V proves A = {X*}")&&data.programDetails.kinetic.frontier.includes("Further work may investigate regenerative response"),"Kinetic V published frontier missing");
assert.ok(data.programDetails.kinetic.artifacts.some(x=>x.href==="publication-kobf4.html"),"Kinetic IV artifact link absent");
const kineticV=data.publications.find(x=>x.id==="kobf5");
assert.ok(kineticV&&kineticV.order===5&&kineticV.program==="kinetic","Kinetic V publication not registered");
assert.equal(kineticV.title,"Global Selection of Collective Kinetic Organization");
assertVersionedPublication(kineticV,{concept:"10.5281/zenodo.23676335",minRecord:23676336,minDate:"2026-10-26",minVersion:"1.0"});
assert.ok(kineticV.summary.includes("singleton {X*}")&&kineticV.summary.includes("uninterrupted charge-band survival"),"Global singleton and finite population/path limits missing");
assert.ok(kineticV.summary.includes("no universal numerical convergence rate")||kineticV.summary.includes("a universal convergence rate"),"Paper V qualitative convergence limitation missing");
assert.ok(data.programDetails.kinetic.narrative.some(x=>x.startsWith("Paper V completes")),"Paper V trajectory missing");
assert.ok(data.programDetails.kinetic.frontier.includes("A = {X*}")&&data.programDetails.kinetic.frontier.includes("do not provide a universal numerical convergence rate"),"Paper V mathematical scope missing from frontier");
assert.ok(data.programDetails.kinetic.artifacts.some(x=>x.href==="publication-kobf5.html"),"Paper V scientific artifact link missing");
assert.equal(kineticSeries?.status,"Papers I–V published; global-selection arc complete");
const kineticVHtml=fs.readFileSync("publication-kobf5.html","utf8");
assert.ok(kineticVHtml.includes('name="citation_doi" content="'+kineticV.doi+'"')&&kineticVHtml.includes(kineticV.pdf),"Kinetic V current scholarly metadata or PDF link missing");
assert.ok(fs.readFileSync("publication-kobf4.html","utf8").includes('href="publication-kobf5.html"'),"Paper IV must link to Paper V");
assert.ok(fs.readFileSync("publications.html","utf8").includes('href="publication-kobf5.html"'),"Homepage missing Kinetic Paper V");
assert.ok(fs.readFileSync("sitemap.xml","utf8").includes("publication-kobf5.html"),"Sitemap missing Kinetic Paper V");

const kineticIVHtml=fs.readFileSync("publication-kobf4.html","utf8");
assert.ok(kineticIVHtml.includes('name="citation_doi" content="'+kineticIV.doi+'"')&&kineticIVHtml.includes(kineticIV.pdf),"Kinetic IV indexed DOI or PDF not current");
assert.ok(fs.readFileSync("publications.html","utf8").includes('href="publication-kobf4.html"'),"Kinetic IV must remain in the full scholarly archive");

assert.equal(kineticPaper?.conceptDoi,"10.5281/zenodo.23405911","Kinetic Paper I Zenodo family changed");
assert.equal(kineticPaper?.program,"kinetic","Kinetic Paper I program link missing");
assertVersionedPublication(kineticPaper,{concept:"10.5281/zenodo.23405911",minRecord:23405912,minDate:"2026-10-16",minVersion:"1.0"});
assert.equal(data.publications.find(x=>x.id==="sqg7")?.title,"Finite Palatini BV Regulators for a Self-Consistent Einstein–Scalar Sector","QG Paper VII version title mismatch");
assert.ok(data.programDetails.kinetic?.artifacts?.some(x=>x.href==="publication-kobf1.html"),"Kinetic series artifact missing");
for(const htmlFile of ["index.html","research.html"]){
 const html=fs.readFileSync(htmlFile,"utf8");
 assert.ok(html.includes('data-static="1"'),"Missing crawlable program index in "+htmlFile);
 assert.ok(html.includes("<!-- ILC_PROGRAM_INDEX_START -->\n"+programCards(data)+"\n<!-- ILC_PROGRAM_INDEX_END -->"),"Stale research-program list in "+htmlFile);
}
// Emerging projects retain a separate research inventory and never enter the published-paper sequence.
const emerging=data.emergingPrograms||[];
assert.equal(emerging.length,1,"Expected the registered emerging research initiative");
assert.equal(emerging[0].id,"essence-physical-constitution");
assert.equal(emerging[0].href,"research-essence-physical-constitution.html");
for(const page of ["index.html","research.html"]){
 const markup=fs.readFileSync(page,"utf8");
 assert.ok(markup.includes('id="emerging-list" class="emerging-research__grid" data-static="1"'),"Missing emerging-research static list in "+page);
 assert.ok(markup.includes("<!-- ILC_EMERGING_INDEX_START -->\n"+emergingCards(data)+"\n<!-- ILC_EMERGING_INDEX_END -->"),"Emerging research cards differ from canonical catalog in "+page);
}
const essence=JSON.parse(fs.readFileSync("research/essence-physical-constitution.json","utf8"));
const essencePage=fs.readFileSync(essence.href,"utf8");
assert.equal(essence.id,emerging[0].id);
assert.equal(essence.hypotheses.length,5);
assert.deepStrictEqual(essence.hypotheses.map(h=>h.number),[1,2,3,4,5]);
assert.equal(essence.seriesStatus,"Paper I published; further investigations in development");
assert.ok(essencePage.includes(essence.foundationalStatement),"Foundational proposition absent from public initiative");
assert.ok(essencePage.includes(essence.unifyingQuestion),"Unifying research question absent");
for(const h of essence.hypotheses){
 assert.ok(essencePage.includes('id="hypothesis-'+h.number+'"'),"Missing hypothesis anchor: "+h.number);
 assert.ok(essencePage.includes(h.title),"Missing hypothesis title: "+h.number);
 assert.ok(essencePage.includes(h.statement),"Missing proposition: "+h.number);
}
assert.ok(essencePage.includes('href="mailto:research@instituteluxconsilio.org?subject=Essence%20and%20Physical%20Constitution'),"Missing program collaboration route");
assert.ok(essencePage.includes('action="https://buttondown.com/api/emails/embed-subscribe/institute-lux-consilio"'),"Missing functioning ILC newsletter signup");
assert.ok(essencePage.includes('name="utm_campaign" value="essence-physical-constitution"'),"Missing initiative-attributed subscription campaign");
assert.ok(essencePage.includes("Paper I published")&&essencePage.includes("publication-epc1.html"),"Essence publication missing");
assert.ok(essencePage.includes("10.5281/zenodo.24600824"),"Essence Paper I DOI missing");
assert.ok(essencePage.includes("<!-- ILC_EPC_PUBLICATIONS_START -->\n"+renderEssencePublications(essence,data)+"\n<!-- ILC_EPC_PUBLICATIONS_END -->"),"Essence scientific publication overview differs from source register");
assert.ok(!essencePage.includes("has not yet assigned a Paper I DOI"),"Stale prepublication language");
assert.ok(essencePage.indexOf('id="published-research"')<essencePage.indexOf('id="research-hypotheses"'),"Published results should precede the original hypotheses");
assert.ok(fs.readFileSync("collaborate.html","utf8").includes('id="essence-physical-constitution"'),"Dedicated collaboration entry missing");
assert.ok(fs.readFileSync("sitemap.xml","utf8").includes('<loc>https://instituteluxconsilio.org/research-essence-physical-constitution.html</loc>'),"Emerging program is not indexed");

const researchPage=fs.readFileSync("research.html","utf8");
assert.ok(researchPage.includes("<!-- ILC_QUESTION_INDEX_START -->\n"+questionCards(data)+"\n<!-- ILC_QUESTION_INDEX_END -->"),"Research questions must be present in static HTML");
const directions=loadDirections(process.cwd(),data);
assert.equal(directions.length,5,"RDA-01 pilot register must include all five proposed public summaries");
assert.deepStrictEqual(directions.map(d=>d.id),["QG-D01","QG-D02","KIN-D01","EPC-D01","CH-D01"],
 "Stable identity and editorial priority of the five pilot directions changed");
assert.ok(researchPage.includes(renderDirectionsSection(directions,data)),
 "Research Atlas section must be identical to generated canonical direction records");
assert.ok(researchPage.includes('id="question-grid" data-static="1"')&&researchPage.includes('id="direction-grid" class="atlas-directions" data-static="1"'),
 "Research direction or question visibility controls missing");
assert.ok(!researchPage.includes('id="theme-grid"'),"Old theme cards should be replaced rather than appended");
for(const d of directions){
 assert.ok(researchPage.includes('data-direction-id="'+d.id+'"'),
  "Missing direction in public overview: "+d.id);
 assert.ok(d.history[0].event==="registered"&&d.history.length>0,
  "Direction has lost its original scientific record");
}
for(const id of ["qg","kinetic","celestial"]){
 const program=data.programs.find(p=>p.id===id);
 const html=fs.readFileSync(program.href,"utf8");
 assert.ok(html.includes(renderProgramDirections(directions,data,id)),"Program direction section out of sync: "+id);
 assert.ok(html.includes('href="research.html#current-directions"'),"Atlas cross-link absent: "+id);
}
// Standalone and specially generated research pages must share the same register.
const healthDirectionsMarkup=fs.readFileSync("research-health-formally-defined.html","utf8");
assert.ok(healthDirectionsMarkup.includes("<!-- ILC_HEALTH_DIRECTIONS_START -->\n"+
 renderProgramDirections(directions,data,"health")+"\n<!-- ILC_HEALTH_DIRECTIONS_END -->"),
 "Health direction placeholder is not generated from the canonical register");
const epcDirectionsMarkup=fs.readFileSync("research-essence-physical-constitution.html","utf8");
assert.ok(epcDirectionsMarkup.includes("<!-- ILC_EPC_DIRECTIONS_START -->\n"+
 renderProgramDirections(directions,data,"research-essence-physical-constitution.html")+
 "\n<!-- ILC_EPC_DIRECTIONS_END -->"),
 "Emerging initiative direction is not generated from the canonical register");
// RDA-03: source-owned scientific connections retain explicit evidence status.
// RDA-06: Qualified CH scientific progress is visible through a native
// evidence disclosure without changing CH's scientific identity or paper standing.
const chDirection=directions.find(d=>d.id==="CH-D01");
assert.ok(chDirection&&chDirection.claims.length===5&&chDirection.obligations.length===4&&
 chDirection.obstructions.length===2,"CH scattering source record missing qualified new results and obligations");
assert.ok(chDirection.claims.filter(c=>c.evidence==="formal_internal").length===4&&
 chDirection.claims.some(c=>c.id==="CH-D01-C05"&&c.evidence==="published"&&c.publication_id==="gps9")&&
 chDirection.publication_status==="unpublished_direction",
 "Published geometric Paper IX must support CH while separate kinematic scattering remains internal research");
assert.ok(chDirection.history.some(e=>e.id==="CH-D01-H0003"&&e.event==="finding"),
 "CH progress must have a durable dated scientific development event");
const chProgram=fs.readFileSync("research-gaussian-celestial.html","utf8");
assert.ok(chProgram.includes('id="direction-CH-D01"')&&
 chProgram.includes('<details class="atlas-program-evidence"')&&
 chProgram.includes("Internal formal research")&&
 chProgram.includes("does not establish a gauge/BRST-reduced physical S-matrix"),
 "CH source-qualified kinematic work must be inspectable within its existing program page");
assert.ok(chProgram.includes("original unit-coupling claim open")&&
 chProgram.includes("publication-gps9.html")&&chProgram.includes("Published scholarly foundation")&&
 chProgram.includes("does not establish a physical S-matrix"),
 "CH limits must separate the published geometric Paper IX from internal physical-scattering obligations");
const relations=enumerateResearchConnections(directions);
assert.equal(relations.length,4,"Initial RDA-03 source-backed relation count changed");
assert.ok(relations.every(({edge})=>edge.standing==="research_question"),
 "Pilot research connections must not be described as established formal bridges");
for(const {source,target,edge} of relations){
 assert.ok(edge.basis_ids.length>0&&target.id!==source.id,
  "Qualified connection requires actual source context and a distinct target");
 assert.ok(directions.some(d=>d.id===edge.target),
  "Connection references a nonexistent public direction");
}
const relationsPage=fs.readFileSync("research/atlas/index.html","utf8");
assert.ok(relationsPage.includes('<base href="/">')&&
 relationsPage.includes('<link rel="canonical" href="https://instituteluxconsilio.org/research/atlas/">'),
 "Canonical relationship atlas route or base missing");
assert.equal(replaceRelationshipAtlas(relationsPage,renderRelationshipAtlas(directions,data)),relationsPage,
 "Relationship atlas no longer matches canonical scientific data");
assert.ok(researchPage.includes('href="research/atlas/"'),"Research overview must link to the relationship atlas");
assert.ok(siteSitemap.includes("<loc>https://instituteluxconsilio.org/research/atlas/</loc>"),
 "Research relationship atlas missing from public sitemap");
assert.ok(fs.readFileSync("scripts/build-publication-pages.mjs","utf8").includes('"research/atlas/"'),
 "Sitemap generator omits the relationship atlas");
assert.ok(directions.find(d=>d.id==="CH-D01").program_relation==="adjacent_research_stream",
 "CH scattering must remain distinct from the existing celestial program");
assert.ok(!directions.some(d=>d.publication_status==="published"),
 "Pilot research directions are not additional published papers");
for(const file of ["research.html","research-relational-quantum-gravity.html",
 "research-kinetic-organization-biological-function.html","research-gaussian-celestial.html",
 "research-health-formally-defined.html","research-essence-physical-constitution.html"]){
 assert.ok(fs.readFileSync(file,"utf8").includes('href="assets/css/research-atlas.css?v=3"'),
  "Missing Atlas design stylesheet: "+file);
}
assert.ok(fs.existsSync("research/directions/schema.json")&&fs.existsSync("research/directions/README.md"),
 "RDA-01 data contract and publishing policy missing");
const home=fs.readFileSync("index.html","utf8");
assert.ok(home.includes("<!-- ILC_HOME_RECENT_START -->\n"+recentCards(data)+"\n<!-- ILC_HOME_RECENT_END -->"),"Stale homepage recent-publications list");
assert.ok(home.includes('data-limit="4" data-static="1"'),"Homepage client script may overwrite current research");
assert.ok(home.includes("<!-- ILC_HEALTH_FULLTEXT_START -->\n"+healthFullText(data)+"\n<!-- ILC_HEALTH_FULLTEXT_END -->"),"Homepage locally hosted Health PDFs missing or stale");
const generated=makeArtifacts(data);
assert.equal(Object.keys(generated.pages).length, data.publications.filter(p=>!p.localPage).length,
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
assert.equal((archive.match(/class="archive-item" data-program=/g)||[]).length,data.publications.length+(data.companionPublications||[]).length,"Publication list must expose all numbered papers and companion research without JavaScript");
for(const p of data.publications){
 assert.ok(archive.includes('href="'+publicationPath(p)+'"'),"Static archive missing "+p.id);
}

import crypto from "node:crypto";
import {makeArtifacts, publicationPath} from "./build-publication-pages.mjs";
import {activeForPage,renderMainNav} from "./build-main-navigation.mjs";
import {renderProgramContent, renderResearchInquiry, PROGRAM_IDS} from "./build-program-pages.mjs";
import {programCards, emergingCards, recentCards, healthFullText, questionCards} from "./build-site-discovery.mjs";
import {loadDirections,renderDirectionsSection,renderProgramDirections} from "./build-research-directions.mjs";
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
assert.deepStrictEqual(healthPapers.map(p=>p.order),[1,2,3,4,5,6,7,8],"Health series sequence I–VIII");
assert.equal(data.series.find(s=>s.id==="health-formally-defined")?.publishedCount,8);
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
assert.deepStrictEqual(gaussianPapers.map(p=>p.order),[1,2,3,4,5,6,7,8,9],"Gaussian/Celestial sequence must contain Papers I–IX");
const pins=JSON.parse(fs.readFileSync("research/zenodo-concepts.json","utf8")).papers;
assert.deepStrictEqual(Object.keys(pins).sort(),data.publications.filter(p=>!["hfd7","hfd8","epc1"].includes(p.id)).map(p=>p.id).sort(),"Existing ILC publications must retain audited Zenodo families; Paper VII is temporarily version-DOI indexed");
for(const pub of data.publications){
 const pin=pins[pub.id];
 assert.ok(/^10[.]5281[/]zenodo[.][0-9]+$/.test(pub.doi),"Invalid version DOI "+pub.id);
 if(["hfd7","hfd8","epc1"].includes(pub.id)){
   assert.equal(pub.doi,{hfd7:"10.5281/zenodo.24143821",hfd8:"10.5281/zenodo.24610039",epc1:"10.5281/zenodo.24600824"}[pub.id],"Paper VII must cite its source record");
   assert.equal(pub.localPage,"publication-"+pub.id+".html");
   assert.ok(!pub.conceptDoi && !pub.pdf,"Unverified concept DOI or PDF mirror must not be invented for Paper VII");
   continue;
 }
 assert.ok(pin.concept_doi.startsWith("10.5281/zenodo."),"Missing verified concept family "+pub.id);
 if(pub.conceptDoi && pub.conceptDoi!==pin.concept_doi){
  // Preexisting inverse DOI pair allowed only until the first auto-sync.
  assert.equal(pub.doi,pin.concept_doi,"Concept DOI mismatch "+pub.id);
 }
 if(pub.pdf && pub.pdf.startsWith("https://zenodo.org/api/records/")){
  assert.match(pub.pdf,/[/]files[/].+[/]content$/,"Invalid pinned Zenodo PDF URL");
   const ver=pub.doi.match(/^10[.]5281[/]zenodo[.]([0-9]+)$/);
   assert.ok(ver&&pub.pdf.includes("/api/records/"+ver[1]+"/files/"),"Publication PDF points at an older Zenodo edition: "+pub.id);
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
// Curated QG exhibit must remain available to static visitors and to future generators.
const qgExhibitRoute="research/quantum-gravity-formal-lineage/";
const qgExhibit=fs.readFileSync(qgExhibitRoute+"index.html","utf8");
assert.equal(data.programDetails.qg.exhibit.href,qgExhibitRoute,
 "Canonical QG program data must point to the curated exhibit");
assert.ok(qgExhibit.includes('<link rel="canonical" href="https://instituteluxconsilio.org/'+qgExhibitRoute+'">'),
 "QG exhibit canonical URL missing");
assert.ok(qgExhibit.includes('<a href="mailto:contact@instituteluxconsilio.org">Email ILC</a>'),
 "QG exhibit must retain the ILC contact footer");
assert.equal((qgExhibit.match(/class="qx-stage-btn\b/g)||[]).length,7,
 "QG exhibit needs seven keyboard-selectable scientific chapters");
assert.ok((qgExhibit.match(/<svg\b/g)||[]).length>=4,
 "QG exhibit must retain explanatory original mathematical diagrams");
assert.ok(qgExhibit.includes('data-stage-title')&&qgExhibit.includes('data-stage-demand'),
 "Scientific stage inspector is incomplete");
assert.ok(qgExhibit.includes('Paper X')&&qgExhibit.includes('active investigations'),
 "QG exhibit must disclose the public-research frontier");

const qgExhibitPath="/"+qgExhibitRoute;
const qgAnchorTargets=["main","journey","demonstrations","formal-world","evidence","inquiry"];
for(const target of qgAnchorTargets){
 assert.ok(qgExhibit.includes('id="'+target+'"'),"Missing exhibit anchor target: "+target);
 assert.ok(qgExhibit.includes('href="'+qgExhibitPath+'#'+target+'"'),
  "Exhibit link does not stay on the exhibit page: "+target);
}
assert.ok(!/href="#[A-Za-z]/.test(qgExhibit),
 "Bare fragment href resolves to homepage because exhibit declares <base href=\"/\">");
const qgExhibitJs=fs.readFileSync("assets/js/qg-exhibit.js","utf8");
assert.ok(qgExhibitJs.includes('link:"'+qgExhibitPath+'#evidence"'),
 "The research-frontier reader must link to the exhibit evidence section");

assert.ok(qgExhibitJs.includes("window.scrollTo({top,behavior:\"auto\"})"),
 "Exhibit anchors must have explicit sticky-aware scrolling");
assert.ok(qgExhibitJs.includes('window.history.pushState(null,"",window.location.pathname'),
 "Exhibit anchor navigation must keep a shareable local fragment");
assert.ok(qgExhibitJs.includes('document.addEventListener("click"'),
 "Exhibit navigation must bind both hero and section links");
const qgExhibitCss=fs.readFileSync("assets/css/qg-exhibit.css","utf8");
assert.ok(qgExhibitCss.includes("overflow-x:clip")&&!qgExhibitCss.includes("overflow-x:hidden"),
 "Exhibit body must not establish an unintended scrolling container");
assert.ok(qgExhibit.includes('qg-exhibit.css?v=4')&&qgExhibit.includes('qg-exhibit.js?v=3'),
 "Navigation fix assets need refreshed browser cache keys");

// A public, source-constrained interactive experience must be readable without JavaScript,
// and must not present in-progress Paper XI as a completed scholarly publication.
assert.ok(qgExhibit.includes('id="qx-inquiry-panels"')&&qgExhibit.includes('id="qx-inquiry-controls"'),
 "Curated inquiry reader and progressive enhancement controls are missing");
assert.equal((qgExhibit.match(/class="qx-inquiry-panel" data-inquiry-path=/g)||[]).length,12,
 "Each of four questions must offer three independently authored depths");
for(const question of ["history","identity","scale","observation"]){
 for(const depth of ["idea","math","next"]){
  assert.ok(qgExhibit.includes('data-inquiry-path="'+question+'" data-inquiry-depth="'+depth+'"'),
   "Missing source-scoped inquiry question/depth: "+question+"/"+depth);
 }
 assert.ok(qgExhibit.includes('data-inquiry-path-select="'+question+'"'),
  "Inquirer cannot choose the "+question+" question");
}
assert.equal((qgExhibit.match(/data-inquiry-depth-select=/g)||[]).length,3,
 "Reader must offer conceptual, mathematical and forward research depth");
assert.ok(qgExhibit.includes("Internal formally developed mathematical result")&&
 qgExhibit.includes("not a published manuscript")&&
 qgExhibit.includes("strictly local")&&qgExhibit.includes("QGCO-07"),
 "Instrument pathway must distinguish a formal mathematical model from physical or published claims");
assert.ok(qgExhibit.includes("Paper XI research notes in progress")&&
 qgExhibit.includes("No Paper XI publication, DOI")&&
 qgExhibit.includes("not yet a public scholarly publication"),
 "In-progress Paper XI status is not explicit");
assert.ok(qgExhibit.includes("https://doi.org/10.5281/zenodo.23990050"),
 "Guided inquiry missing published Paper X reference");
assert.ok(qgExhibit.includes('id="qx-propose-form"')&&
 qgExhibit.includes('id="qx-propose-text"')&&
 qgExhibit.includes('id="qx-propose-topic"')&&
 qgExhibit.includes('mailto:research@instituteluxconsilio.org'),
 "Propose-a-research-question composer must be functional with direct correspondence fallback");
assert.ok(qgExhibit.includes("It does not submit data to the site")&&
 qgExhibit.includes("your own email application"),
 "Email compose action must not misrepresent submission or collect website data");
assert.ok(qgExhibit.includes("Stage 2 · In development")&&
 qgExhibit.includes("not a publicly available conversational service"),
 "Stage-two capability must be clearly labeled in development");
assert.ok(qgExhibit.includes("qg-inquiry.js?v=3"),
 "Interactive controls require a versioned independently maintained client script");
const publicInquiryIndex=JSON.parse(fs.readFileSync("research/atlas/inquiry-index.json","utf8"));
assert.equal(publicInquiryIndex.schema_version,1,"Public inquiry index schema changed");
assert.deepStrictEqual(publicInquiryIndex.paths.map(p=>[p.path,p.direction_id]),
 [["history","QG-D02"],["identity","QG-D02"],["scale","EPC-D01"],["observation","QG-D01"]],
 "Curated QG source provenance must match the approved Research Atlas owner identities");
assert.ok(publicInquiryIndex.runtime_status==="in_development_not_publicly_available"&&
 publicInquiryIndex.live_formal_verification===false,
 "Public inquiry index must not claim live source verification or Runtime service");
for(const v of publicInquiryIndex.paths){
 assert.ok(qgExhibit.includes('data-inquiry-source-for="'+v.path+'"'),
  "QG evidence block does not identify the matching authored inquiry path");
 assert.ok(qgExhibit.includes('data-inquiry-direction-id="'+v.direction_id+'"'),
  "QG source evidence is not linked to its approved direction identity");
}
const inquiryJs=fs.readFileSync("assets/js/qg-inquiry.js","utf8");
assert.ok(inquiryJs.includes('window.location.href=mailto')&&
 inquiryJs.includes('encodeURIComponent(body)')&&
 inquiryJs.includes('panels.length!==pathways.length*depths.length'),
 "The inquiry module must support all authored combinations and prepare a user-controlled email");
assert.ok(!/\bfetch\s*\(|\bXMLHttpRequest\b/.test(inquiryJs),
 "The QG inquiry must not silently send research questions to a backend");
assert.ok(qgExhibitJs.includes('"evidence","inquiry"'),
 "New inquiry anchor must participate in existing two-header navigation");
assert.ok(fs.readFileSync("research-relational-quantum-gravity.html","utf8").includes('href="'+qgExhibitRoute+'#inquiry"'),
 "Main QG research series must directly invite curated inquiry");
assert.ok(fs.readFileSync("concordia/runtime/index.html","utf8").includes('href="'+qgExhibitRoute+'#inquiry"')&&
 fs.readFileSync("concordia/runtime/index.html","utf8").includes("AI-mediated scholarly inquiry"),
 "Runtime development statement must reference the exhibit without claiming a live AI chat");
assert.ok(fs.existsSync("assets/css/qg-exhibit.css")&&fs.existsSync("assets/js/qg-exhibit.js"),
 "QG exhibit assets missing");
assert.ok(sitemap.includes("<loc>https://instituteluxconsilio.org/"+qgExhibitRoute+"</loc>"),
 "Curated exhibit must remain in the sitemap");
for(const file of ["index.html","methods.html","concordia/index.html",
 "collaborate.html","research.html","research-relational-quantum-gravity.html"]){
 assert.ok(fs.readFileSync(file,"utf8").includes('href="'+qgExhibitRoute+'"'),
  "Missing exhibit discovery link: "+file);
}
assert.ok(fs.readFileSync("scripts/build-program-pages.mjs","utf8").includes("const exhibit=detail.exhibit"),
 "Program generator must retain curated exhibit feature");
assert.ok(fs.readFileSync("scripts/build-publication-pages.mjs","utf8").includes('"'+qgExhibitRoute+'"'),
 "Sitemap generator must retain the curated exhibit");

console.log("ILC research integrity checks passed: "+data.programs.length+" programs, "+data.publications.length+" papers, "+data.notes.length+" notes.");
