import fs from "node:fs";
import assert from "node:assert/strict";
const read=p=>fs.readFileSync(p,"utf8");
const shared=JSON.parse(read("support/content.json")),community=JSON.parse(read("support/community.json")),demo=JSON.parse(read("support/scientific-demonstration.json"));
const routes=["support/","support/concordia/","support/concordia/research/","support/concordia/brief/",...shared.participationRoutes.map(x=>x.path),...shared.reportRoutes.map(x=>x.path)];
assert.equal(new Set(routes).size,routes.length);
const sourceMap=new Map(routes.map(route=>[route+"index.html",read(route+"index.html")]));
for(const route of routes){
 const p=route+"index.html",s=sourceMap.get(p);
 assert.ok(s.includes('<base href="/">'),p+": missing root base");
 assert.ok(s.includes('<link rel="canonical" href="https://instituteluxconsilio.org/'+route+'">'),p+": missing canonical");
 assert.equal((s.match(/<h1>/g)||[]).length,1,p+": h1");
 const ids=[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,p+": duplicate ids");
 for(const dest of routes.filter(r=>!shared.reportRoutes.some(x=>x.path===r)))assert.ok(s.includes('href="'+dest+'"'),p+": missing section route "+dest);
 for(const m of s.matchAll(/(?:href|src)="([^"]+)"/g)){
  const l=m[1];if(/^https?:|^mailto:|^data:/.test(l))continue;
  let [q,a]=l.split("#");q=q.split("?")[0].replace(/^\//,"");q=q?(q.endsWith("/")?q+"index.html":q):p;
  assert.ok(fs.existsSync(q),p+": unresolved path "+l);
  if(a&&q.endsWith(".html"))assert.ok(read(q).includes('id="'+a+'"'),p+": unresolved anchor "+l);
 }
 assert.ok(read("sitemap.xml").includes("<loc>https://instituteluxconsilio.org/"+route+"</loc>"),p+": sitemap route missing");
}
assert.equal(demo.exhibit.records.length,9);
assert.equal(community.fellowship.status,"In development · Applications are not open");
assert.ok(sourceMap.get("support/fellowships/index.html").includes("not applications, selections or beta invitations"));
assert.ok(sourceMap.get("support/stewardship/index.html").includes("not numerical targets or achieved outcomes"));
for(const r of community.reports){
 assert.ok(r.sourceRevision&&r.period&&r.unreported.length);
 const s=sourceMap.get(r.route+"index.html");assert.ok(s.includes(r.sourceRevision)&&s.includes(r.inventory.commit)&&s.includes("No zero values or achieved outcomes are inferred."));
}
console.log("Support section verified:",routes.length,"public routes, static navigation, internal links and source-qualified program states.");
