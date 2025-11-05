// Simple client-side simulation for RAG Math Routing Agent
const runBtn = document.getElementById('runBtn');
const clearBtn = document.getElementById('clearBtn');
const stagesDiv = document.getElementById('stages');
const resultDiv = document.getElementById('result');
const questionInput = document.getElementById('question');

function makeStage(title, text) {
  const el = document.createElement('div');
  el.className = 'stage';
  el.innerHTML = `<strong>${title}</strong><div class="text-sm text-gray-200 mt-1">${text}</div>`;
  return el;
}

function setRunning(stageEl) {
  stageEl.classList.add('running');
  stageEl.innerHTML = stageEl.innerHTML + '<div style="font-size:.8rem;color:#001;margin-top:.25rem">running…</div>';
}

function clearStages(){ stagesDiv.innerHTML = ''; resultDiv.innerHTML = 'Run the simulation to see the answer here.'; }

function simulatePipeline(query) {
  clearStages();
  resultDiv.innerHTML = 'Processing...';
  const timeline = [
    { id: 'parse', title: 'Parse & Sanitize', text: 'Detect math intent, sanitize input, extract expression tokens.' },
    { id: 'kb', title: 'Knowledge Base Lookup', text: 'Search vector KB (FAISS) for similar solved problems.' },
    { id: 'route', title: 'Routing Decision', text: 'Decide whether KB answer suffices or web/DSPy needed.' },
    { id: 'web', title: 'Web Search (MCP)', text: 'Fetch domain-specific web results (MCP) and extract structured steps.' },
    { id: 'dspy', title: 'DSPy Reasoning', text: 'Run declarative DSPy programs to compute step-by-step solution.' },
    { id: 'assemble', title: 'Assemble Response', text: 'Combine context, produce final structured solution with sources.' }
  ];

  // create stage nodes
  const nodes = timeline.map(s => ({...s, el: makeStage(s.title, s.text)}));
  nodes.forEach(n => stagesDiv.appendChild(n.el));

  // run timeline with delays, simulate branching
  let idx = 0;
  function step() {
    if (idx >= nodes.length) {
      // show final simulated answer
      const ans = synthesizeAnswer(query);
      resultDiv.innerHTML = `<div><strong>Answer:</strong> ${ans.answer_html}</div><div style="margin-top:8px;color:#cbd5e1"><strong>Sources:</strong> ${ans.sources}</div>`;
      return;
    }
    const node = nodes[idx];
    setRunning(node.el);
    // simulate different durations
    const durations = {parse:700, kb:900, route:700, web:1200, dspy:1200, assemble:600};
    setTimeout(() => {
      node.el.classList.remove('running');
      node.el.innerHTML = `<strong>${node.title}</strong><div class="text-sm text-gray-300 mt-1">${node.text}</div><div style="font-size:.75rem;color:#9ca3af;margin-top:.25rem">completed</div>`;
      // simulate branch: if KB hit, skip web+dspy
      if (node.id === 'kb') {
        const kbHit = Math.random() &lt; 0.6; // 60% KB hit for demo
        if (kbHit) {
          const hitEl = document.createElement('div');
          hitEl.className = 'stage';
          hitEl.innerHTML = `<strong>KB Match</strong><div class="text-sm text-gray-200 mt-1">Found similar solved problem with high similarity (0.86)</div>`;
          stagesDiv.appendChild(hitEl);
          // skip web + dspy stages
          const webNode = nodes.find(n=>n.id==='web');
          const dspyNode = nodes.find(n=>n.id==='dspy');
          if (webNode) { webNode.el.innerHTML = `<strong>${webNode.title}</strong><div class="text-sm text-gray-500 mt-1">skipped (KB sufficient)</div>`; }
          if (dspyNode) { dspyNode.el.innerHTML = `<strong>${dspyNode.title}</strong><div class="text-sm text-gray-500 mt-1">skipped (KB sufficient)</div>`; }
          idx = nodes.findIndex(n=>n.id==='assemble') - 1;
        }
      }
      idx += 1;
      step();
    }, durations[node.id] || 800);
  }
  step();
}

function synthesizeAnswer(query) {
  const q = query.toLowerCase().trim();
  if (!q) return { answer_html: '<em>No question provided.</em>', sources: 'none' };
  const quad = q.match(/(-?\d*)x\^2\s*([+-]\s*\d*)x\s*([+-]\s*\d*)\s*=\s*0/);
  if (quad) {
    try {
      const a = parseFloat(quad[1] || 1);
      const b = parseFloat(quad[2].replace(/\s+/g,''));
      const c = parseFloat(quad[3].replace(/\s+/g,''));
      const disc = b*b - 4*a*c;
      if (disc < 0) {
        return { answer_html: 'No real roots (discriminant < 0).', sources: 'KB: Quadratic formula' };
      }
      const r1 = ((-b + Math.sqrt(disc))/(2*a)).toFixed(4);
      const r2 = ((-b - Math.sqrt(disc))/(2*a)).toFixed(4);
      return { answer_html: `Roots: x = ${r1}, x = ${r2}`, sources: 'KB: Quadratic formula' };
    } catch(e){}
  }
  const deriv = q.match(/derivative of (.+)/);
  if (deriv) {
    const expr = deriv[1].replace(/\s+/g,'');
    const terms = expr.split('+').map(s=>s.trim());
    const out = terms.map(t=>{
      const m = t.match(/([+-]?\d*)x\^?(\d)?/);
      if (m) {
        const coef = parseFloat(m[1]||1);
        const pow = parseFloat(m[2]||1);
        const ncoef = coef*pow;
        const npow = pow-1;
        return `${ncoef}${npow===0?'':('x'+(npow===1?'':'^'+npow))}`;
      }
      return '0';
    }).join(' + ');
    return { answer_html: `Derivative ≈ ${out}`, sources: 'KB: Power rule' };
  }
  return { answer_html: `Simulated solution for: <em>${escapeHtml(query)}</em> — steps: parse → retrieve → reason → finalize.`, sources: 'Web & KB (simulated)' };
}

function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

runBtn.addEventListener('click', ()=>{
  const q = questionInput.value;
  simulatePipeline(q);
});

clearBtn.addEventListener('click', ()=>{ questionInput.value=''; clearStages(); });
