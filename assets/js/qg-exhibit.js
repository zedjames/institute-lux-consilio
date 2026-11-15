/* ILC Quantum Gravity exhibit: progressive enhancement only.
   The complete seven-chapter progression is also present in static HTML. */
(() => {
  "use strict";
  const stages = [
    {
      papers:"Papers I–III", title:"What is the quantum system?",
      intro:"The inquiry begins with a critical Schwarzschild scalar, a selected physical operator realization, and the quantum-field dynamics built upon it.",
      inherited:"Schwarzschild geometry, differential operators, admissible domains, and the selected scalar.",
      demand:"Establish Friedrichs selection, a continuum Fock carrier, physical evolution, and a real-scalar source construction.",
      next:"Can the constructed quantum matter act as a self-consistent source for Einstein geometry?",
      link:"publication-sqg3.html", label:"Explore the published stage →"
    },
    {
      papers:"Paper IV", title:"Can quantum matter source the geometry?",
      intro:"The selected matter construction is placed within a nonempty positive-coupling Einstein–real-scalar family with a computed vacuum-relative source and physical-domain conservation law.",
      inherited:"The selected scalar field, quantum source machinery, native metric conventions, and physical evolution.",
      demand:"Construct an inhabited Einstein–scalar realization, its geometry, and a consistent tensor source on the declared physical window.",
      next:"Which action and gauge structures does this same physical sector support?",
      link:"publication-sqg4.html", label:"Paper IV · self-consistent source →"
    },
    {
      papers:"Papers V–VII", title:"What does physical consistency require?",
      intro:"The construction encounters new demands from the action principle, gauge structure, BRST representation, and finite-regulator quantization.",
      inherited:"The selected positive-coupling Einstein–scalar sector, source normalization, and physical matter carrier.",
      demand:"Relate the original physical action to master and gauge structures, establish restricted cohomological constructions, and classify regulated obstructions without assuming a full quantum-master solution.",
      next:"Which quantum-state distinctions remain visible in the computed gravitational response?",
      link:"publication-sqg7.html", label:"Paper VII · regulated quantization →"
    },
    {
      papers:"Paper VIII", title:"What can gravity distinguish?",
      intro:"The resulting represented quantum state, complete tensor source, and metric up to isometry are compared as different carriers of physical information.",
      inherited:"The inherited Fock state construction, computed Einstein source, native positive-coupling geometry, and restricted gauge representation.",
      demand:"Establish source fibers, exact counterexamples to global factorization, curvature-image rigidity, and fixed-anchor equivalence of full-source and physical-isometry classes.",
      next:"Do these established physical relationships survive when the boundary can move?",
      link:"publication-sqg8.html", label:"Paper VIII · relational classification →"
    },
    {
      papers:"Paper IX", title:"What changes when the boundary moves?",
      intro:"The selected Einstein–scalar source is extended into a local exterior with a moving interface. A complete action and its admissible variations become part of the physical question.",
      inherited:"The source-normalized geometry and scalar from the established Einstein–scalar construction.",
      demand:"Construct the junction, induced surface geometry, boundary contributions, and variations for a specified fixed-external-data class.",
      next:"Can source-matched exterior developments join into a coherent physical history?",
      link:"publication-sqg9.html", label:"Paper IX · moving interface →"
    },
    {
      papers:"Paper X", title:"When does a physical history exist?",
      intro:"Separately constructed Einstein–scalar developments are compared on their earned common domains, and compatible fields are assembled into a source-owned classical history.",
      inherited:"The original source and moving interface, physical clock conventions, action-coupled geometry, and local scalar wave structure.",
      demand:"Prove earned overlap, field agreement, open-domain gluing, and qualified continuation while retaining the distinction between classical fields and global quantum transport.",
      next:"What further boundary and quantum conditions would complete the joined physical system?",
      link:"publication-sqg10.html", label:"Paper X · physical history →"
    },
    {
      papers:"Active research after X", title:"What must a further completion establish?",
      intro:"The public series provides a substantial physical and mathematical foundation. Further inquiry tests terminal boundary variations, the quantum sector's transport, and global continuation.",
      inherited:"The joined classical Einstein–scalar history, known physical-domain restrictions, and the original complete-action structure.",
      demand:"Identify boundary and quantum-transmission requirements on the actual inherited carrier; prove compatibility or exhibit a scoped obstruction.",
      next:"Which new mathematical interface would make another physical extension possible?",
      link:"/research/quantum-gravity-formal-lineage/#evidence", label:"See the standing of the research frontier →"
    }
  ];

  const root = document.getElementById("qx-stage-reader");
  const buttons = Array.from(document.querySelectorAll("[data-stage]"));
  if (!root || buttons.length !== 7) return;

  const fields = {
    count:root.querySelector("[data-stage-count]"),
    papers:root.querySelector("[data-stage-papers]"),
    title:root.querySelector("[data-stage-title]"),
    intro:root.querySelector("[data-stage-intro]"),
    inherited:root.querySelector("[data-stage-inherited]"),
    demand:root.querySelector("[data-stage-demand]"),
    next:root.querySelector("[data-stage-next]"),
    link:root.querySelector("[data-stage-link]")
  };
  if (Object.values(fields).some(x=>!x)) return;

  function choose(index,focus) {
    const stage = stages[index];
    if (!stage) return;
    buttons.forEach((button,i)=>{
      const selected=i===index;
      button.classList.toggle("is-active",selected);
      button.setAttribute("aria-pressed",String(selected));
    });
    fields.count.textContent=String(index+1).padStart(2,"0")+" / 07";
    fields.papers.textContent=stage.papers;
    fields.title.textContent=stage.title;
    fields.intro.textContent=stage.intro;
    fields.inherited.textContent=stage.inherited;
    fields.demand.textContent=stage.demand;
    fields.next.textContent=stage.next;
    fields.link.textContent=stage.label;
    fields.link.setAttribute("href",stage.link);
    if (focus) buttons[index].focus();
  }
  buttons.forEach((button,index)=>{
    button.addEventListener("click",()=>choose(index,false));
    button.addEventListener("keydown",(event)=>{
      if(!["ArrowRight","ArrowLeft","Home","End"].includes(event.key))return;
      event.preventDefault();
      const next=event.key==="Home"?0:event.key==="End"?stages.length-1:
        (index+(event.key==="ArrowRight"?1:-1)+stages.length)%stages.length;
      choose(next,true);
    });
  });
})();

/* Explicit exhibit-local navigation for browsers that do not reliably scroll
   a sticky two-header layout via native fragment navigation. */
(() => {
  "use strict";
  const route="/research/quantum-gravity-formal-lineage/#";
  const sections=new Set(["main","journey","demonstrations","formal-world","evidence"]);
  const navigation=document.querySelector(".qx-subnav");
  if (!navigation) return;
  const tabs=Array.from(navigation.querySelectorAll('a[href]'));

  function offset() {
    const header=document.querySelector(".site-header");
    const headerHeight=header?header.getBoundingClientRect().height:0;
    const tabHeight=navigation.getBoundingClientRect().height;
    return Math.ceil(headerHeight+tabHeight+14);
  }
  function navigate(id,{record=false,focus=false}={}) {
    if (!sections.has(id)) return false;
    const target=document.getElementById(id);
    if (!target) return false;

    // Scroll against the real viewport instead of relying on a base-URL
    // fragment or the browser's anchor alignment under two sticky bars.
    const current=window.scrollY||window.pageYOffset||0;
    const top=Math.max(0,Math.round(current+target.getBoundingClientRect().top-offset()));
    window.scrollTo({top,behavior:"auto"});

    for (const tab of tabs) {
      const active=tab.getAttribute("href")===route+id;
      tab.classList.toggle("is-active",active);
      if (active) tab.setAttribute("aria-current","location");
      else tab.removeAttribute("aria-current");
    }
    if (record && window.location.hash!=="#"+id) {
      window.history.pushState(null,"",window.location.pathname+window.location.search+"#"+id);
    }
    if (focus) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex","-1");
      target.focus({preventScroll:true});
    }
    return true;
  }

  document.addEventListener("click",event=>{
    if (event.defaultPrevented || event.button!==0 ||
        event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const anchor=event.target.closest?.("a[href]");
    if (!anchor) return;
    const href=anchor.getAttribute("href")||"";
    if (!href.startsWith(route)) return;
    const id=href.slice(route.length);
    if (!sections.has(id)) return;
    event.preventDefault();
    navigate(id,{record:true,focus:event.detail===0||id==="main"});
  });

  function syncFromLocation() {
    const id=decodeURIComponent(window.location.hash.slice(1));
    if (sections.has(id)) navigate(id);
  }
  window.addEventListener("popstate",syncFromLocation);
  window.addEventListener("hashchange",syncFromLocation);
  window.addEventListener("load",syncFromLocation,{once:true});
})();
