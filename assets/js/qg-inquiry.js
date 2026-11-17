/* ILC QG Inquiry Explorer — progressive enhancement of fully authored, static source content.
   No generated scientific answers, network calls, or automatic research submissions. */
(() => {
  "use strict";
  const root=document.getElementById("qx-inquiry-panels");
  const controls=document.getElementById("qx-inquiry-controls");
  const status=document.getElementById("qx-inquiry-live");
  if (!root || !controls || !status) return;

  const pathways=[
    {id:"history",label:"Physical history",topic:"Physical history and boundaries"},
    {id:"identity",label:"Physical identity",topic:"Excitation identity and quantum representation"},
    {id:"scale",label:"Across scale",topic:"Constitutive organization across scales"}
  ];
  const depths=[
    {id:"idea",label:"Explore the idea"},
    {id:"math",label:"Examine the mathematics"},
    {id:"next",label:"Investigate further"}
  ];
  const panels=Array.from(root.querySelectorAll("[data-inquiry-path][data-inquiry-depth]"));
  const pathButtons=Array.from(controls.querySelectorAll("[data-inquiry-path-select]"));
  const depthButtons=Array.from(controls.querySelectorAll("[data-inquiry-depth-select]"));

  if (panels.length!==pathways.length*depths.length ||
      pathButtons.length!==pathways.length ||
      depthButtons.length!==depths.length ||
      panels.some(panel=>!pathways.some(p=>p.id===panel.dataset.inquiryPath) ||
         !depths.some(d=>d.id===panel.dataset.inquiryDepth))) return;

  let selectedPath=pathways[0].id;
  let selectedDepth=depths[0].id;
  const topicInput=document.getElementById("qx-propose-topic");
  let topicTouched=false;

  function render(){
    const activePath=pathways.find(p=>p.id===selectedPath);
    const activeDepth=depths.find(d=>d.id===selectedDepth);
    for (const panel of panels) {
      panel.hidden=panel.dataset.inquiryPath!==selectedPath ||
                   panel.dataset.inquiryDepth!==selectedDepth;
    }
    for (const button of pathButtons) {
      const active=button.dataset.inquiryPathSelect===selectedPath;
      button.classList.toggle("is-active",active);
      button.setAttribute("aria-pressed",String(active));
    }
    for (const button of depthButtons) {
      const active=button.dataset.inquiryDepthSelect===selectedDepth;
      button.classList.toggle("is-active",active);
      button.setAttribute("aria-pressed",String(active));
    }
    if (!topicTouched && topicInput) topicInput.value=activePath.topic;
    status.textContent="Showing "+activePath.label+" — "+activeDepth.label;
  }
  function registerButtons(buttons,items,onChoose){
    buttons.forEach((button,index)=>{
      button.addEventListener("click",()=>onChoose(items[index].id));
      button.addEventListener("keydown",event=>{
        if (!["ArrowRight","ArrowLeft","Home","End"].includes(event.key)) return;
        event.preventDefault();
        const next=event.key==="Home"?0:event.key==="End"?items.length-1:
          (index+(event.key==="ArrowRight"?1:-1)+items.length)%items.length;
        onChoose(items[next].id);
        buttons[next].focus();
      });
    });
  }
  registerButtons(pathButtons,pathways,id=>{selectedPath=id;render();});
  registerButtons(depthButtons,depths,id=>{selectedDepth=id;render();});
  if (topicInput)topicInput.addEventListener("change",()=>{topicTouched=true;});

  // Hide unused panels only after the complete static source and controls are found.
  render();
  controls.hidden=false;
  status.hidden=false;

  const form=document.getElementById("qx-propose-form");
  const questionField=document.getElementById("qx-propose-text");
  const feedback=document.getElementById("qx-form-feedback");
  if (!form || !questionField || !topicInput || !feedback) return;

  questionField.addEventListener("input",()=>questionField.setCustomValidity(""));
  form.addEventListener("submit",event=>{
    const question=questionField.value.trim();
    if (question.length<12){
      event.preventDefault();
      questionField.setCustomValidity("Please enter a research question of at least 12 characters.");
      questionField.reportValidity();
      return;
    }
    if (!form.checkValidity()) return;
    event.preventDefault();
    const topic=topicInput.value;
    const subject="Schwarzschild QG research question — "+topic;
    const body=[
      "Research program: Schwarzschild Quantum Gravity",
      "Inquiry area: "+topic,
      "",
      "Proposed research question:",
      question,
      "",
      "Relevant public scientific source:",
      "Paper X, Global Coherence of a Quantum-Sourced Einstein–Scalar History",
      "https://doi.org/10.5281/zenodo.23990050",
      "https://instituteluxconsilio.org/publication-sqg10.html",
      "",
      "Guided ILC exhibit:",
      "https://instituteluxconsilio.org/research/quantum-gravity-formal-lineage/#inquiry",
      "",
      "Paper XI research notes are in progress and are not yet a public scholarly publication."
    ].join("\n");
    const mailto="mailto:research@instituteluxconsilio.org?subject="+
      encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
    feedback.textContent="Your email application should open with a prepared draft. Review and send it there; nothing has been submitted by this webpage.";
    window.location.href=mailto;
  });
})();
