(()=>{
const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const btn=$('.nav__menu'), nav=$('.nav__links'); if(btn&&nav) btn.addEventListener('click',()=>nav.classList.toggle('open'));
if('IntersectionObserver' in window){const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');obs.unobserve(e.target)}}),{threshold:.08});$$('.reveal').forEach(el=>obs.observe(el));}else{$$('.reveal').forEach(el=>el.classList.add('in'))}
const D=window.ILC_DATA||{};
function fmtDate(s){if(!s)return'';const d=new Date(s+'T12:00:00');return d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function programHref(p){return p?.href||('program.html?id='+encodeURIComponent(p?.id||''));}
function renderPrograms(){
 const el=$('#program-list'); if(!el||!D.programs)return;
 el.innerHTML=D.programs.map((p,i)=>`<a class="program-row" href="${programHref(p)}">
 <div class="program-row__num">${String(i+1).padStart(2,'0')} · ${esc(p.domain)}</div>
 <div><div class="program-row__title">${esc(p.title)}</div><div class="program-row__desc">${esc(p.desc)}</div></div>
 <div class="program-row__status">${esc(p.status)}</div></a>`).join('');
}
function renderThemes(){
 const el=$('#theme-grid'); if(!el||!D.themes)return;
 el.innerHTML=D.themes.map((t,i)=>`<article class="theme-card"><span>${String(i+1).padStart(2,'0')}</span><h3>${esc(t.label)}</h3><p>${esc(t.description)}</p></article>`).join('');
}
function pubHtml(p){
 const links=[`<a href="publication.html?id=${encodeURIComponent(p.id)}">Record →</a>`];
 if(p.doi) links.push(`<a href="https://doi.org/${encodeURIComponent(p.doi)}" target="_blank" rel="noopener">DOI ${esc(p.doi)} ↗</a>`);
 if(p.pdf) links.push(`<a href="${esc(p.pdf)}" target="_blank" rel="noopener">PDF ↗</a>`);
 return `<article class="archive-item" data-program="${esc(p.program)}"><div class="meta">${fmtDate(p.date)}</div><div><h3><a href="publication.html?id=${encodeURIComponent(p.id)}" style="text-decoration:none">${esc(p.title)}</a></h3><p>${esc(p.series||'')}</p>${p.subtitle?`<p style="margin-top:6px">${esc(p.subtitle)}</p>`:''}<div class="archive-item__links">${links.join('')}</div></div><div class="archive-item__right">Paper ${p.order||''}<br>Preprint</div></article>`;
}
function renderPubs(list=D.publications){
 const el=$('#publication-list'); if(!el||!list)return;
 let view=[...list]; const limit=parseInt(el.dataset.limit||'0',10); if(limit>0)view=view.slice(0,limit);
 el.innerHTML=view.map(pubHtml).join('') || '<p class="muted">No publications match this view.</p>';
}
function renderNotes(){
 const el=$('#note-list');if(!el||!D.notes)return;
 el.innerHTML=D.notes.map(n=>`<article class="archive-item"><div class="meta">${fmtDate(n.date)}</div><div><h3>${esc(n.title)}</h3><p>${esc(n.summary)}</p><div class="archive-item__links">${n.legacyPage?`<a href="${esc(n.legacyPage)}" target="_blank" rel="noopener">Original public note ↗</a>`:''}</div></div><div class="archive-item__right">${esc(n.program)}</div></article>`).join('');
}
function wirePublicationFilters(){
 const input=$('#pub-search'),filters=$$('#pub-filters .filter');if(!input)return;let active='all';
 function apply(){const q=input.value.toLowerCase().trim();const arr=(D.publications||[]).filter(p=>(active==='all'||p.program===active)&&(!q||[p.title,p.subtitle,p.series,p.doi,...(p.domains||[])].join(' ').toLowerCase().includes(q)));renderPubs(arr)}
 input.addEventListener('input',apply);filters.forEach(b=>b.addEventListener('click',()=>{filters.forEach(x=>x.classList.remove('active'));b.classList.add('active');active=b.dataset.filter;apply()}));
}
function renderProgram(){
 const el=$('#program-detail');if(!el||!D.programs)return;
 const id=document.body.dataset.programId||new URLSearchParams(location.search).get('id')||'health';
 const p=D.programs.find(x=>x.id===id)||D.programs[0], detail=(D.programDetails||{})[p.id]||{};
 const pubs=(D.publications||[]).filter(x=>x.program===p.id).sort((a,b)=>(a.order||0)-(b.order||0));
 const seriesIds=[...new Set(pubs.map(x=>x.seriesId))], series=(D.series||[]).filter(s=>seriesIds.includes(s.id));
 document.title=p.title+' — Institute Lux Consilio';
 const narrative=(detail.narrative||[]).map(x=>`<p>${esc(x)}</p>`).join('');
 const methods=(detail.methods||[]).map(x=>`<li>${esc(x)}</li>`).join('');
 const questions=(detail.openQuestions||[]).map((x,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span><p>${esc(x)}</p></li>`).join('');
 const artifacts=(detail.artifacts||[]).map(a=>`<a class="artifact-row" href="${esc(a.href)}"${/^https?:/.test(a.href)?' target="_blank" rel="noopener"':''}><span class="artifact-row__kind">${esc(a.kind)}</span><strong>${esc(a.label)}</strong><span class="artifact-row__arrow">↗</span></a>`).join('');
 const metrics=(detail.metrics||[]).map(m=>`<div><strong>${esc(m.value)}</strong><span>${esc(m.label)}</span></div>`).join('');
 el.innerHTML=`
 <section class="program-hero"><div class="wrap">
   <p class="eyebrow">${esc(p.domain)} · ${esc(p.status)}</p>
   <h1>${esc(p.title)}</h1>
   <p class="lede">${esc(p.desc)}</p>
   ${detail.question?`<div class="program-question"><span>Guiding question</span><p>${esc(detail.question)}</p></div>`:''}
 </div></section>
 <section class="section"><div class="wrap program-layout">
   <article class="program-main">
     <p class="eyebrow">Program</p><h2>Research trajectory</h2>
     <div class="program-narrative">${narrative||'<p>This program page is being expanded as the public research archive is consolidated.</p>'}</div>
   </article>
   <aside class="program-aside">
     <p class="eyebrow">Methods</p><ul class="method-list">${methods}</ul>
   </aside>
 </div></section>
 ${metrics?`<section class="section section--tight section--alt"><div class="wrap"><div class="program-metrics">${metrics}</div></div></section>`:''}
 <section class="section section--alt"><div class="wrap">
   <div class="sec-head"><div><p class="eyebrow">Paper sequence</p><h2>Published stages of the program.</h2></div><p>${series.length?esc(series.map(s=>s.status).join(' · ')):'The public sequence is maintained as part of ILC’s scholarly archive.'}</p></div>
   <div class="paper-sequence">${pubs.length?pubs.map((x,i)=>`<article class="paper-stage"><div class="paper-stage__num">${String(x.order||i+1).padStart(2,'0')}</div><div><p class="meta">${fmtDate(x.date)}</p><h3><a href="publication.html?id=${encodeURIComponent(x.id)}">${esc(x.title)}</a></h3>${x.subtitle?`<p class="paper-stage__subtitle">${esc(x.subtitle)}</p>`:''}<p>${esc(x.summary)}</p><div class="archive-item__links"><a href="publication.html?id=${encodeURIComponent(x.id)}">ILC record →</a>${x.doi?`<a href="https://doi.org/${encodeURIComponent(x.doi)}" target="_blank" rel="noopener">DOI ↗</a>`:''}</div></div></article>`).join(''):'<p class="muted">No public papers are attached to this program yet.</p>'}</div>
 </div></section>
 <section class="section"><div class="wrap program-layout">
   <article class="program-main"><p class="eyebrow">Current frontier</p><h2>What the public record hands forward.</h2><p class="frontier-copy">${esc(detail.frontier||'The program remains active and will be updated as additional public results are released.')}</p></article>
   <aside class="program-aside"><p class="eyebrow">Open questions</p><ol class="open-question-list">${questions}</ol></aside>
 </div></section>
 ${artifacts?`<section class="section section--deep"><div class="wrap"><div class="sec-head"><div><p class="eyebrow" style="color:#c8ae83">Artifacts</p><h2>Research objects and verification surfaces.</h2></div><p style="color:#c7cfca">Papers are one part of the record. Repositories, formal verification, inventories, and persistent archival records make the program inspectable.</p></div><div class="artifact-list">${artifacts}</div></div></section>`:''}
 <section class="section section--tight"><div class="wrap"><a class="link-arrow" href="research.html">← Return to all research programs</a></div></section>`;
}
function renderPublication(){
 const el=$('#publication-detail');if(!el||!D.publications)return;const id=new URLSearchParams(location.search).get('id');const p=D.publications.find(x=>x.id===id);
 if(!p){el.innerHTML='<section class="page-head"><div class="wrap"><p class="eyebrow">Publication</p><h1>Record not found.</h1></div></section>';return;}
 const prog=(D.programs||[]).find(x=>x.id===p.program), ser=(D.series||[]).find(x=>x.id===p.seriesId);
 document.title=p.title+' — Institute Lux Consilio';
 el.innerHTML=`<section class="page-head"><div class="wrap"><p class="eyebrow">${esc(ser?.label||p.series)} · Paper ${p.order||''}</p><h1>${esc(p.title)}</h1>${p.subtitle?`<p class="lede">${esc(p.subtitle)}</p>`:''}</div></section>
 <section class="section"><div class="wrap"><div class="grid grid-2" style="align-items:start"><div class="prose"><p class="eyebrow">Abstract record</p><p class="kicker">${esc(p.summary)}</p><h2>Scientific context</h2><p>This publication belongs to <a href="${programHref(prog)}">${esc(prog?.title||p.series)}</a>. ILC preserves the program context around the archival publication so the result remains connected to the question, sequence, and later work it supports.</p><h2>Provenance</h2><p>This record was migrated from the existing public Fieldflux research catalog. Historical publication provenance and DOI records remain unchanged; the ILC site now provides the institute-level scholarly context.</p></div>
 <aside class="card"><p class="card__tag">Publication record</p><h3>${fmtDate(p.date)}</h3><p><strong>Author</strong><br>Zed James</p><p><strong>Type</strong><br>Preprint</p><p><strong>Series</strong><br>${esc(p.series)}</p><p><strong>DOI</strong><br><a href="https://doi.org/${encodeURIComponent(p.doi)}" target="_blank" rel="noopener">${esc(p.doi)} ↗</a></p><p><strong>Domains</strong><br>${esc((p.domains||[]).join(' · '))}</p><div class="hero__actions"><a class="btn btn--primary" href="${esc(p.pdf)}" target="_blank" rel="noopener">Open PDF</a><a class="btn btn--quiet" href="${esc(p.legacyPage)}" target="_blank" rel="noopener">Original record</a></div></aside></div></div></section>`;
}
renderPrograms();renderThemes();renderPubs();renderNotes();wirePublicationFilters();renderProgram();renderPublication();
})();