// operations.js — stores ops, generates toolpaths, renders panel
const Operations = (() => {
  const ops = []; // [{params, subops:{roughing,finishing,chamfer}, toolpaths, stateIdx}]
  let activeOpIdx = -1;
  let activeSubop = null; // 'roughing'|'finishing'|'chamfer'|'general'
  const toolpathLines = {};

  /* ── default params ── */
  function defaultParams() {
    return {
      safeZ: 50, refZ: 0, dir: 'climb',
      roughing: { enabled:true, tool:'T1 D16mm', mode:'parallel', aePct:45, depth:5, ap:2 },
      finishing: { enabled:true, tool:'T1 D16mm', mode:'parallel', aePct:45, depth:5, ap:0.5, allowance:0 },
      chamfer:   { enabled:false, tool:'T2 D16mm 45°', depth:0.5, steps:1 }
    };
  }

  function addOp() {
    ops.push({ params: defaultParams(), stateIdx: -1 });
    return ops.length - 1;
  }

  function getOps() { return ops; }

  /* ── toolpath generation ── */
  function generateFaceMilling(opIdx) {
    const op = ops[opIdx];
    const r = op.params.roughing;
    const blank = Blank.getData();
    const bp = blank.params;
    const toolDia = parseFloat((r.tool.match(/D(\d+)/)||[])[1]) || 16;
    const ae = (r.aePct/100) * toolDia;
    const ap = r.ap;
    const depth = r.depth;
    const toolR = toolDia/2;
    const x = bp.x || bp.d;
    const y = bp.y || bp.d;
    const z = bp.z || bp.h;
    const startZ = z - Math.min(ap, depth);
    const x0 = -(x/2)-toolR, x1 = (x/2)+toolR;

    const pts = [];
    let cy = -(y/2)-toolR, dir = 1;
    while (cy <= (y/2)+toolR) {
      const fx = dir>0?x0:x1, tx = dir>0?x1:x0;
      for(let i=0;i<=50;i++) pts.push(new THREE.Vector3(fx+(tx-fx)*(i/50), startZ, cy));
      cy += ae; dir *= -1;
    }

    // Remove old line
    if (toolpathLines[opIdx]) Viewer.remove(toolpathLines[opIdx]);
    // Hide all other lines
    Object.values(toolpathLines).forEach(l => { if(l) l.visible=false; });

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color:0x0057ff})
    );
    Viewer.add(line);
    toolpathLines[opIdx] = line;

    // Update blank state
    Blank.setOpState(opIdx, ap);
    Blank.showOp(opIdx);
    op.stateIdx = opIdx;

    // Init simulation
    Simulation.init(pts, toolDia, 60);
    document.getElementById('sim-bar').style.display = 'flex';
  }

  function showToolpath(opIdx) {
    // Always recalculate to show current state
    generateFaceMilling(opIdx);
  }

  /* ── tree rendering ── */
  function renderTree(onSelect) {
    const tree = document.getElementById('op-tree');
    tree.innerHTML = '';
    ops.forEach((op, oi) => {
      const r = op.params.roughing, f = op.params.finishing, c = op.params.chamfer;
      const wrap = document.createElement('div');
      wrap.className = 'tree-op';
      wrap.innerHTML = `
        <div class="tree-op-header" data-oi="${oi}">
          <span class="tree-op-chevron open">▶</span>
          <span class="tree-op-icon">◧</span>
          <span class="tree-op-name">Planfräsen ${oi+1}</span>
        </div>
        <div class="tree-op-body open">
          <div class="tree-sub ${r.enabled?'':'tree-sub-disabled'}" data-oi="${oi}" data-sub="roughing">
            <span class="tree-sub-icon">≡</span>
            <span class="tree-sub-name">Schruppen</span>
            <span class="tree-sub-tool">${r.tool}</span>
          </div>
          <div class="tree-sub ${f.enabled?'':'disabled'}" data-oi="${oi}" data-sub="finishing">
            <span class="tree-sub-icon">✎</span>
            <span class="tree-sub-name">Schlichten</span>
            <span class="tree-sub-tool">${f.tool}</span>
          </div>
          <div class="tree-sub ${c.enabled?'':'disabled'}" data-oi="${oi}" data-sub="chamfer">
            <span class="tree-sub-icon">◿</span>
            <span class="tree-sub-name">Kanten brechen</span>
            <span class="tree-sub-tool">${c.tool}</span>
          </div>
        </div>
      `;

      // Op header click = collapse/expand
      wrap.querySelector('.tree-op-header').addEventListener('click', function() {
        const body = wrap.querySelector('.tree-op-body');
        const chev = wrap.querySelector('.tree-op-chevron');
        const open = body.classList.toggle('open');
        chev.classList.toggle('open', open);
        // Also select general
        onSelect(oi, 'general');
      });

      // Sub-op clicks
      wrap.querySelectorAll('.tree-sub').forEach(sub => {
        sub.addEventListener('click', e => {
          e.stopPropagation();
          onSelect(parseInt(sub.dataset.oi), sub.dataset.sub);
        });
      });

      tree.appendChild(wrap);
    });
  }

  function setSelected(oi, sub) {
    activeOpIdx = oi; activeSubop = sub;
    document.querySelectorAll('.tree-op-header, .tree-sub').forEach(el => el.classList.remove('selected'));
    if (sub === 'general') {
      const hd = document.querySelector(`.tree-op-header[data-oi="${oi}"]`);
      if(hd) hd.classList.add('selected');
    } else {
      const el = document.querySelector(`.tree-sub[data-oi="${oi}"][data-sub="${sub}"]`);
      if(el) el.classList.add('selected');
    }
  }

  /* ── panel rendering ── */
  function renderPanel(oi, sub, onCalc) {
    const panel = document.getElementById('panel-body');
    const op = ops[oi];
    const p = op.params;

    let html = `<div class="p-op-title">
      <span class="p-op-title-text">Planfräsen ${oi+1} — ${subLabel(sub)}</span>
    </div>`;

    if (sub === 'general') {
      html += group('Allgemein', [
        row('Safe Z',       ctrl(p.safeZ, 'safeZ', 'mm')),
        row('Referenz Z',   ctrl(p.refZ, 'refZ', 'mm')),
        row('Fräsrichtung', sel(p.dir, 'dir', ['climb:Gleichlauf','conventional:Gegenlauf','auto:Auto'])),
      ]);
    }

    if (sub === 'roughing') {
      const r = p.roughing;
      const dia = parseFloat((r.tool.match(/D(\d+)/)||[])[1]) || 16;
      const aeMm = ((r.aePct||45)/100*dia).toFixed(1);
      const steps = Math.ceil((r.depth||5)/(r.ap||2));
      html += group('Schruppen', [
        rowChk('Aktiv', 'r-enabled', r.enabled),
        row('Werkzeug',      `<input class="p-control" style="border:1px solid var(--border);border-radius:var(--radius);height:26px;padding:0 8px;font-size:12px;width:130px;" id="r-tool" value="${r.tool}">`),
        row('Modus',         sel(r.mode, 'r-mode', ['parallel:Parallel','contour:Konturparallel','spiral:Spiralförmig'])),
        row('Seitl. Zust. ae', `<div class="p-control"><input type="number" id="r-ae-pct" value="${r.aePct||45}" min="1" max="100" step="1" oninput="ncwop_updateAe('r')"><span class="unit">%</span></div><span class="p-hint" id="r-ae-mm">${aeMm} mm</span>`),
        row('Gesamttiefe',   ctrl(r.depth||5, 'r-depth', 'mm', 'r')),
        row('Tiefenzust. ap',`<div class="p-control"><input type="number" id="r-ap" value="${r.ap||2}" min="0.1" step="0.1" oninput="ncwop_updateSteps('r')"></div><span class="p-hint" id="r-steps">${steps} Schr.</span>`),
      ]);
    }

    if (sub === 'finishing') {
      const f = p.finishing;
      const dia = parseFloat((f.tool.match(/D(\d+)/)||[])[1]) || 16;
      const aeMm = ((f.aePct||45)/100*dia).toFixed(1);
      const steps = Math.ceil((f.depth||5)/(f.ap||0.5));
      html += group('Schlichten', [
        rowChk('Aktiv', 'f-enabled', f.enabled),
        row('Werkzeug',      `<input class="p-control" style="border:1px solid var(--border);border-radius:var(--radius);height:26px;padding:0 8px;font-size:12px;width:130px;" id="f-tool" value="${f.tool}">`),
        row('Modus',         sel(f.mode, 'f-mode', ['parallel:Parallel','contour:Konturparallel','spiral:Spiralförmig'])),
        row('Seitl. Zust. ae', `<div class="p-control"><input type="number" id="f-ae-pct" value="${f.aePct||45}" min="1" max="100" step="1" oninput="ncwop_updateAe('f')"><span class="unit">%</span></div><span class="p-hint" id="f-ae-mm">${aeMm} mm</span>`),
        row('Gesamttiefe',   ctrl(f.depth||5, 'f-depth', 'mm', 'f')),
        row('Tiefenzust. ap',`<div class="p-control"><input type="number" id="f-ap" value="${f.ap||0.5}" min="0.1" step="0.1" oninput="ncwop_updateSteps('f')"></div><span class="p-hint" id="f-steps">${steps} Schr.</span>`),
        row('Aufmaß',        ctrl(f.allowance||0, 'f-allowance', 'mm')),
      ]);
    }

    if (sub === 'chamfer') {
      const c = p.chamfer;
      html += group('Kanten brechen', [
        rowChk('Aktiv', 'c-enabled', c.enabled),
        row('Werkzeug',      `<input class="p-control" style="border:1px solid var(--border);border-radius:var(--radius);height:26px;padding:0 8px;font-size:12px;width:130px;" id="c-tool" value="${c.tool}">`),
        row('Fasentiefe',    ctrl(c.depth||0.5, 'c-depth', 'mm')),
        row('Schritte',      ctrl(c.steps||1, 'c-steps', '')),
      ]);
    }

    panel.innerHTML = html;

    // Collapsible groups
    panel.querySelectorAll('.p-group-hd').forEach(hd => {
      hd.addEventListener('click', () => {
        const body = hd.nextElementSibling;
        const collapsed = body.style.display === 'none';
        body.style.display = collapsed ? 'block' : 'none';
        hd.classList.toggle('collapsed', !collapsed);
      });
    });
  }

  function saveParams(oi, sub) {
    const op = ops[oi]; const p = op.params;
    const v = id => { const el=document.getElementById(id); return el?el.value:null; };
    const n = id => { const el=document.getElementById(id); return el?parseFloat(el.value):null; };
    const b = id => { const el=document.getElementById(id); return el?el.checked:null; };

    if (sub==='general') {
      p.safeZ = n('safeZ')||50;
      p.refZ  = n('refZ')||0;
      p.dir   = v('dir')||'climb';
    }
    if (sub==='roughing') {
      p.roughing.enabled = b('r-enabled')??true;
      p.roughing.tool    = v('r-tool')||p.roughing.tool;
      p.roughing.mode    = v('r-mode')||'parallel';
      p.roughing.aePct   = n('r-ae-pct')||45;
      p.roughing.depth   = n('r-depth')||5;
      p.roughing.ap      = n('r-ap')||2;
    }
    if (sub==='finishing') {
      p.finishing.enabled   = b('f-enabled')??true;
      p.finishing.tool      = v('f-tool')||p.finishing.tool;
      p.finishing.mode      = v('f-mode')||'parallel';
      p.finishing.aePct     = n('f-ae-pct')||45;
      p.finishing.depth     = n('f-depth')||5;
      p.finishing.ap        = n('f-ap')||0.5;
      p.finishing.allowance = n('f-allowance')||0;
    }
    if (sub==='chamfer') {
      p.chamfer.enabled = b('c-enabled')??false;
      p.chamfer.tool    = v('c-tool')||p.chamfer.tool;
      p.chamfer.depth   = n('c-depth')||0.5;
      p.chamfer.steps   = n('c-steps')||1;
    }
  }

  /* helpers */
  function subLabel(s) { return {general:'Allgemein',roughing:'Schruppen',finishing:'Schlichten',chamfer:'Kanten brechen'}[s]||s; }

  function group(title, rows) {
    return `<div class="p-group">
      <div class="p-group-hd">${title}<span class="chev">▾</span></div>
      <div class="p-group-body">${rows.join('')}</div>
    </div>`;
  }

  function row(label, control) {
    return `<div class="p-row"><span class="p-label">${label}</span>${control}</div>`;
  }

  function rowChk(label, id, checked) {
    return `<div class="p-row"><span class="p-label">${label}</span>
      <input type="checkbox" id="${id}" ${checked?'checked':''} style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer;">
    </div>`;
  }

  function ctrl(val, id, unit, upd) {
    const oi = upd ? `oninput="ncwop_updateSteps('${upd}')"` : '';
    return `<div class="p-control"><input type="number" id="${id}" value="${val}" step="0.1" ${oi}>${unit?`<span class="unit">${unit}</span>`:''}</div>`;
  }

  function sel(val, id, opts) {
    const options = opts.map(o => { const [v,l]=o.split(':'); return `<option value="${v}" ${val===v?'selected':''}>${l}</option>`; }).join('');
    return `<div class="p-control"><select id="${id}">${options}</select></div>`;
  }

  return { addOp, getOps, generateFaceMilling, showToolpath, renderTree, renderPanel, setSelected, saveParams };
})();

// Global helpers for oninput handlers
window.ncwop_updateAe = function(type) {
  const pctEl = document.getElementById(type+'-ae-pct');
  const toolEl = document.getElementById(type+'-tool');
  if (!pctEl) return;
  const pct = parseFloat(pctEl.value)||45;
  const dia = parseFloat(((toolEl?toolEl.value:'').match(/D(\d+)/)||[])[1])||16;
  const mm = document.getElementById(type+'-ae-mm');
  if (mm) mm.textContent = (pct/100*dia).toFixed(1)+' mm';
};

window.ncwop_updateSteps = function(type) {
  const prefix = type==='r' ? 'r' : 'f';
  const depth = parseFloat(document.getElementById(prefix+'-depth')?.value)||5;
  const ap    = parseFloat(document.getElementById(prefix+'-ap')?.value)||(type==='r'?2:0.5);
  const el = document.getElementById(prefix+'-steps');
  if (el) el.textContent = Math.ceil(depth/ap)+' Schr.';
};
