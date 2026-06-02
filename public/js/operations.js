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
      roughing: { enabled:true, tool:'T1 D16mm', mode:'parallel', aePct:45, depth:-5, ap:2 },
      finishing: { enabled:true, tool:'T1 D16mm', mode:'parallel', aePct:45, depth:-5, ap:0.5, allowance:0 },
      chamfer:   { enabled:false, tool:'T2 D16mm 45°', depth:0.5, steps:1 }
    };
  }

  function addOp() {
    ops.push({ params: defaultParams(), stateIdx: -1 });
    return ops.length - 1;
  }

  function getOps() { return ops; }

  function topSurfaceZ() {
    const d = Blank.getData();
    if (!d.params) return 0;
    const topZ = d.params.z || d.params.h || 0;
    const off = d.params._off || {x:0,y:0,z:0};
    return topZ - off.z;
  }

  /* ── toolpath generation ── */
  function generateFaceMilling(opIdx) {
    const op = ops[opIdx];
    const r = op.params.roughing;
    const blank = Blank.getData();
    const bp = blank.params;
    const off = bp._off || {x:0,y:0,z:0};
    const toolDia = parseFloat((r.tool.match(/D(\d+)/)||[])[1]) || 16;
    const ae    = (r.aePct/100) * toolDia;
    const ap    = r.ap;
    const depth = r.depth;
    const toolR = toolDia/2;
    const x = bp.x || bp.d;
    const y = bp.y || bp.d;
    const topZ = bp.z || bp.h;

    // depth = ABSOLUTE Z target in part-origin coordinates (e.g. -10 = 10mm below origin)
    // Top surface Z in part-origin coords:
    const topSurfaceZ = topZ - off.z;        // world Z of top surface
    const targetZ = depth;                    // absolute Z target (origin coords) = world Z (origin at 0)
    // total material to remove from top surface down to targetZ
    const removeDepth = Math.max(0, topSurfaceZ - targetZ);
    const steps = Math.max(1, Math.ceil(removeDepth / ap));
    const x0 = -(x/2)-toolR, x1 = (x/2)+toolR;

    const pts = [];
    for (let s = 1; s <= steps; s++) {
      // Z level in world coords, stepping down from top surface to targetZ
      const levelZ = topSurfaceZ - Math.min(s*ap, removeDepth);
      let cy = -(y/2)-toolR, dir = (s%2===1)?1:-1;
      while (cy <= (y/2)+toolR) {
        const fx = dir>0?x0:x1, tx = dir>0?x1:x0;
        for(let i=0;i<=50;i++) {
          pts.push(new THREE.Vector3(
            (fx+(tx-fx)*(i/50)) - off.x,
            cy - off.y,
            levelZ
          ));
        }
        cy += ae; dir *= -1;
      }
    }
    const actualDepth = removeDepth;

    if (toolpathLines[opIdx]) Viewer.remove(toolpathLines[opIdx]);
    Object.values(toolpathLines).forEach(l => { if(l) l.visible=false; });

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color:0x0057ff})
    );
    Viewer.add(line);
    toolpathLines[opIdx] = line;

    Blank.setOpState(opIdx, actualDepth);
    Blank.showOp(opIdx);
    op.stateIdx = opIdx;

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
          <div class="tree-sub" data-oi="${oi}" data-sub="general">
            <span class="tree-sub-icon">⚙</span>
            <span class="tree-sub-name">Allgemein</span>
          </div>
          <div class="tree-sub ${r.enabled?'':'disabled'}" data-oi="${oi}" data-sub="roughing">
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
      const steps = Math.max(1, Math.ceil(Math.max(0, topSurfaceZ()-(r.depth??-5))/(r.ap||2)));
      html += group('Schruppen', [
        rowChk('Aktiv', 'r-enabled', r.enabled),
        row('Werkzeug',      `<button type="button" class="tool-select-btn" id="r-tool-btn"><span id="r-tool">${r.tool}</span><span class="tsb-icon">⚙</span></button>`),
        row('Modus',         sel(r.mode, 'r-mode', ['parallel:Parallel','contour:Konturparallel','spiral:Spiralförmig'])),
        row('Seitl. Zust. ae', `<div class="p-control"><input type="number" id="r-ae-pct" value="${r.aePct||45}" min="1" max="100" step="1" oninput="ncwop_updateAe('r')"><span class="unit">%</span></div><span class="p-hint" id="r-ae-mm">${aeMm} mm</span>`),
        row('Tiefe (Z abs.)', ctrl(r.depth??-5, 'r-depth', 'mm', 'r')),
        row('Tiefenzust. ap',`<div class="p-control"><input type="number" id="r-ap" value="${r.ap||2}" min="0.1" step="0.1" oninput="ncwop_updateSteps('r')"></div><span class="p-hint" id="r-steps">${steps} Schr.</span>`),
      ]);
    }

    if (sub === 'finishing') {
      const f = p.finishing;
      const dia = parseFloat((f.tool.match(/D(\d+)/)||[])[1]) || 16;
      const aeMm = ((f.aePct||45)/100*dia).toFixed(1);
      const steps = Math.max(1, Math.ceil(Math.max(0, topSurfaceZ()-(f.depth??-5))/(f.ap||0.5)));
      html += group('Schlichten', [
        rowChk('Aktiv', 'f-enabled', f.enabled),
        row('Werkzeug',      `<button type="button" class="tool-select-btn" id="f-tool-btn"><span id="f-tool">${f.tool}</span><span class="tsb-icon">⚙</span></button>`),
        row('Modus',         sel(f.mode, 'f-mode', ['parallel:Parallel','contour:Konturparallel','spiral:Spiralförmig'])),
        row('Seitl. Zust. ae', `<div class="p-control"><input type="number" id="f-ae-pct" value="${f.aePct||45}" min="1" max="100" step="1" oninput="ncwop_updateAe('f')"><span class="unit">%</span></div><span class="p-hint" id="f-ae-mm">${aeMm} mm</span>`),
        row('Tiefe (Z abs.)', ctrl(f.depth??-5, 'f-depth', 'mm', 'f')),
        row('Tiefenzust. ap',`<div class="p-control"><input type="number" id="f-ap" value="${f.ap||0.5}" min="0.1" step="0.1" oninput="ncwop_updateSteps('f')"></div><span class="p-hint" id="f-steps">${steps} Schr.</span>`),
        row('Aufmaß',        ctrl(f.allowance||0, 'f-allowance', 'mm')),
      ]);
    }

    if (sub === 'chamfer') {
      const c = p.chamfer;
      html += group('Kanten brechen', [
        rowChk('Aktiv', 'c-enabled', c.enabled),
        row('Werkzeug',      `<button type="button" class="tool-select-btn" id="c-tool-btn"><span id="c-tool">${c.tool}</span><span class="tsb-icon">⚙</span></button>`),
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
      p.roughing.tool    = (document.getElementById('r-tool')?document.getElementById('r-tool').textContent:p.roughing.tool);
      p.roughing.mode    = v('r-mode')||'parallel';
      p.roughing.aePct   = n('r-ae-pct')||45;
      p.roughing.depth   = n('r-depth')||5;
      p.roughing.ap      = n('r-ap')||2;
    }
    if (sub==='finishing') {
      p.finishing.enabled   = b('f-enabled')??true;
      p.finishing.tool      = (document.getElementById('f-tool')?document.getElementById('f-tool').textContent:p.finishing.tool);
      p.finishing.mode      = v('f-mode')||'parallel';
      p.finishing.aePct     = n('f-ae-pct')||45;
      p.finishing.depth     = n('f-depth')||5;
      p.finishing.ap        = n('f-ap')||0.5;
      p.finishing.allowance = n('f-allowance')||0;
    }
    if (sub==='chamfer') {
      p.chamfer.enabled = b('c-enabled')??false;
      p.chamfer.tool    = (document.getElementById('c-tool')?document.getElementById('c-tool').textContent:p.chamfer.tool);
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
  const depth = parseFloat(document.getElementById(prefix+'-depth')?.value);
  const ap    = parseFloat(document.getElementById(prefix+'-ap')?.value)||(type==='r'?2:0.5);
  const d = Blank.getData();
  let top = 0;
  if (d.params) { top = (d.params.z||d.params.h||0) - (d.params._off?d.params._off.z:0); }
  const remove = Math.max(0, top - (isNaN(depth)?-5:depth));
  const el = document.getElementById(prefix+'-steps');
  if (el) el.textContent = Math.max(1, Math.ceil(remove/ap))+' Schr.';
};
