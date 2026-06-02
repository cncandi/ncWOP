document.addEventListener('DOMContentLoaded', () => {
  Viewer.init();

  let blankType = 'box';
  let blankCreated = false;

  // ── Tabs ──
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(x => x.style.display='none');
      t.classList.add('active');
      document.getElementById('tab-'+t.dataset.tab).style.display='block';
    });
  });

  // ── Blank type toggle ──
  document.getElementById('tb-box').addEventListener('click', () => {
    blankType='box';
    document.getElementById('tb-box').classList.add('active');
    document.getElementById('tb-cyl').classList.remove('active');
    document.getElementById('blank-box').style.display='block';
    document.getElementById('blank-cyl').style.display='none';
  });
  document.getElementById('tb-cyl').addEventListener('click', () => {
    blankType='cylinder';
    document.getElementById('tb-cyl').classList.add('active');
    document.getElementById('tb-box').classList.remove('active');
    document.getElementById('blank-box').style.display='none';
    document.getElementById('blank-cyl').style.display='block';
  });

  // ── Create blank ──
  document.getElementById('btn-blank').addEventListener('click', () => {
    const p = blankType==='box'
      ? { x: +document.getElementById('bx').value, y: +document.getElementById('by').value, z: +document.getElementById('bz').value }
      : { d: +document.getElementById('bd').value, h: +document.getElementById('bh').value };
    // Compute offset so origin point = world 0,0,0
    var hx=(p.x||p.d||0)/2, hy=(p.y||p.d||0)/2, hz=(p.z||p.h||0);
    var ox=parseFloat(document.getElementById('origin-ox').value)||0;
    var oy=parseFloat(document.getElementById('origin-oy').value)||0;
    var oz=parseFloat(document.getElementById('origin-oz').value)||0;
    var wx=originX==='left'?-hx:originX==='right'?hx:0;
    var wy=originY==='front'?-hy:originY==='back'?hy:0;
    var wz=originZ==='top'?hz:originZ==='bottom'?0:hz/2;
    Blank.create(blankType, p, {x:wx+ox, y:wy+oy, z:wz+oz});
    blankCreated = true;
    // Switch to ops tab hint
    document.getElementById('panel-body').innerHTML = '<p class="hint">Operation hinzufügen und Unteroperation wählen.</p>';
  });

  // ── Add operation ──
  document.getElementById('btn-add-op').addEventListener('click', () => {
    if (!blankCreated) { alert('Bitte zuerst Rohteil erstellen.'); return; }
    const oi = Operations.addOp();
    Operations.generateFaceMilling(oi);
    rebuildTree();
    selectNode(oi, 'roughing');
    // Switch to ops tab
    document.querySelector('.tab[data-tab="ops"]').click();
  });

  function rebuildTree() {
    Operations.renderTree((oi, sub) => selectNode(oi, sub));
  }

  function selectNode(oi, sub) {
    Operations.setSelected(oi, sub);
    Operations.renderPanel(oi, sub, () => {});

    // Always show toolpath + result immediately
    Operations.showToolpath(oi);

    // Auto-recalc on any input change in panel
    setTimeout(() => {
      document.querySelectorAll('#panel-body input, #panel-body select').forEach(el => {
        el.addEventListener('input', () => {
          Operations.saveParams(oi, sub);
          Operations.generateFaceMilling(oi);
          rebuildTree();
          Operations.setSelected(oi, sub);
        });
        el.addEventListener('change', () => {
          Operations.saveParams(oi, sub);
          Operations.generateFaceMilling(oi);
          rebuildTree();
          Operations.setSelected(oi, sub);
        });
      });

      // Wire tool-select buttons
      document.querySelectorAll('.tool-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const span = btn.querySelector('span[id$="-tool"]');
          window.openToolSelector(tool => {
            // Display as "T1 D16mm"
            if (span) span.textContent = tool.id + ' D' + tool.diameter + 'mm';
            Operations.saveParams(oi, sub);
            Operations.generateFaceMilling(oi);
            rebuildTree();
            Operations.setSelected(oi, sub);
          });
        });
      });
    }, 0);
  }

  // ── Viewport buttons ──
  document.getElementById('v-top').addEventListener('click',   () => Viewer.setView('top'));
  document.getElementById('v-iso').addEventListener('click',   () => Viewer.setView('iso'));
  document.getElementById('v-front').addEventListener('click', () => Viewer.setView('front'));

  // ── Simulation ──
  document.getElementById('s-play').addEventListener('click', () => {
    Simulation.isRunning() ? Simulation.pause() : Simulation.play();
  });
  document.getElementById('s-stop').addEventListener('click',  () => Simulation.stop());
  document.getElementById('s-start').addEventListener('click', () => Simulation.toStart());
  document.getElementById('s-end').addEventListener('click',   () => Simulation.toEnd());
  document.getElementById('s-fwd').addEventListener('click',   () => Simulation.stepFwd());
  document.getElementById('s-back').addEventListener('click',  () => Simulation.stepBck());
  document.getElementById('sim-speed').addEventListener('input', e => Simulation.setSpeed(+e.target.value));

  // ── Reset ──
  document.getElementById('btn-reset').addEventListener('click', () => location.reload());

  // ── Export ──
  document.getElementById('btn-export').addEventListener('click', () => alert('G-Code Export folgt.'));
  // ── Origin picker ──
  var originX = 'center', originY = 'center', originZ = 'top';

  function applyOrigin() {
    if (!blankCreated) return;
    var d = Blank.getData();
    if (!d.params) return;
    var p = d.params;
    var hx=(p.x||p.d||0)/2, hy=(p.y||p.d||0)/2, hz=(p.z||p.h||0);
    var ox=parseFloat(document.getElementById('origin-ox').value)||0;
    var oy=parseFloat(document.getElementById('origin-oy').value)||0;
    var oz=parseFloat(document.getElementById('origin-oz').value)||0;
    var wx=originX==='left'?-hx:originX==='right'?hx:0;
    var wy=originY==='front'?-hy:originY==='back'?hy:0;
    var wz=originZ==='top'?hz:originZ==='bottom'?0:hz/2;
    Blank.setOffset({x:wx+ox, y:wy+oy, z:wz+oz});
  }

  function originLabel() {
    var xL = {left:'Links',center:'Mitte',right:'Rechts'}[originX]||originX;
    var yL = {front:'vorne',center:'',back:'hinten'}[originY]||originY;
    var zL = {top:'oben',center:'Mitte',bottom:'unten'}[originZ]||originZ;
    var el = document.getElementById('origin-label');
    if (el) el.textContent = (originX==='center'&&originY==='center') ? 'Mitte '+zL : [xL,yL,zL].filter(Boolean).join(' ');
  }

  ['oz-top','oz-mid','oz-bot'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function() {
      document.querySelectorAll('.origin-z-toggle .toggle-btn').forEach(function(b){b.classList.remove('active');});
      el.classList.add('active');
      originZ = id==='oz-top'?'top':id==='oz-mid'?'center':'bottom';
      originLabel();
      applyOrigin();
    });
  });

  document.querySelectorAll('.op-dot').forEach(function(dot) {
    dot.addEventListener('click', function() {
      document.querySelectorAll('.op-dot').forEach(function(d){d.classList.remove('active');});
      dot.classList.add('active');
      originX = dot.dataset.x;
      originY = dot.dataset.y;
      originLabel();
      applyOrigin();
    });
  });

  ['origin-ox','origin-oy','origin-oz'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function(){ originLabel(); applyOrigin(); });
  });

  originLabel();


  // ── Tool Manager ──
  let editingToolId = null;
  let toolSelectCallback = null; // set when opened in select mode

  Tools.load().then(renderToolList);

  // Open tool manager in SELECT mode — returns chosen tool via callback
  window.openToolSelector = function(cb) {
    toolSelectCallback = cb;
    document.getElementById('tool-modal').style.display = 'flex';
    renderToolList();
  };

  document.getElementById('btn-tools').addEventListener('click', () => {
    document.getElementById('tool-modal').style.display = 'flex';
    renderToolList();
  });
  document.getElementById('tool-modal-close').addEventListener('click', closeToolModal);
  document.getElementById('btn-tool-cancel').addEventListener('click', closeToolModal);
  document.getElementById('tool-modal-backdrop').addEventListener('click', closeToolModal);

  function closeToolModal() { document.getElementById('tool-modal').style.display = 'none'; toolSelectCallback = null; }

  document.getElementById('btn-new-tool').addEventListener('click', () => {
    const t = Tools.add(Tools.newTool());
    renderToolList();
    selectTool(t.id);
  });

  document.getElementById('btn-tool-save').addEventListener('click', async () => {
    saveToolEdit();
    const res = await Tools.save();
    if (res.error) { alert('Speichern fehlgeschlagen.'); }
    else { renderToolList(); }
  });

  function renderToolList() {
    const list = document.getElementById('tool-list');
    if (!list) return;
    list.innerHTML = '';
    Tools.getAll().forEach(t => {
      const item = document.createElement('div');
      item.className = 'tool-item' + (t.id === editingToolId ? ' active' : '');
      item.innerHTML = `
        <span class="tool-item-icon">⌀</span>
        <div class="tool-item-info">
          <div class="tool-item-name">${t.id} — ${t.name}</div>
          <div class="tool-item-meta">⌀${t.diameter}mm · L${t.length}mm</div>
        </div>
        ${toolSelectCallback ? `<button class="tool-item-select" data-id="${t.id}">Wählen</button>` : ''}
        <button class="tool-item-del" data-id="${t.id}">🗑</button>
      `;
      item.addEventListener('click', e => {
        if (e.target.classList.contains('tool-item-del')) return;
        selectTool(t.id);
      });
      item.querySelector('.tool-item-del').addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('Werkzeug '+t.id+' löschen?')) {
          Tools.remove(t.id);
          if (editingToolId === t.id) { editingToolId = null; document.getElementById('tool-edit-pane').innerHTML = '<p class="hint">Werkzeug wählen oder neu anlegen.</p>'; }
          renderToolList();
        }
      });
      const selBtn = item.querySelector('.tool-item-select');
      if (selBtn) selBtn.addEventListener('click', e => {
        e.stopPropagation();
        const cb = toolSelectCallback;
        toolSelectCallback = null;
        closeToolModal();
        if (cb) cb(t);
      });
      list.appendChild(item);
    });
  }

  function selectTool(id) {
    editingToolId = id;
    renderToolList();
    const t = Tools.getById(id);
    if (!t) return;
    document.getElementById('tool-edit-pane').innerHTML = `
      <div class="tool-edit-section">Allgemein</div>
      <div class="tool-edit-row"><label>ID</label><input type="text" id="te-id" value="${t.id}" readonly style="background:var(--surface2);"></div>
      <div class="tool-edit-row"><label>Bezeichnung</label><input type="text" id="te-name" value="${t.name}"></div>
      <div class="tool-edit-row"><label>Typ</label>
        <select id="te-type"><option value="endmill" ${t.type==='endmill'?'selected':''}>Schaftfräser</option></select>
      </div>
      <div class="tool-edit-section">Geometrie</div>
      <div class="tool-edit-row"><label>Durchmesser (mm)</label><input type="number" id="te-dia" value="${t.diameter}" step="0.1"></div>
      <div class="tool-edit-row"><label>Länge (mm)</label><input type="number" id="te-len" value="${t.length}" step="0.1"></div>
      <div class="tool-edit-row"><label>Schneiden</label><input type="number" id="te-flutes" value="${t.flutes}" step="1"></div>
      <div class="tool-edit-section">Schnittdaten</div>
      <div class="tool-edit-row"><label>Vorschub (mm/min)</label><input type="number" id="te-feed" value="${t.cutData.feed}"></div>
      <div class="tool-edit-row"><label>Drehzahl (RPM)</label><input type="number" id="te-speed" value="${t.cutData.speed}"></div>
      <div class="tool-edit-row"><label>Max. Schnitttiefe (mm)</label><input type="number" id="te-mch" value="${t.cutData.maxCutHeight}" step="0.1"></div>
      <div class="tool-edit-row"><label>Kühlung</label><input type="checkbox" id="te-coolant" ${t.cutData.coolant?'checked':''} style="width:18px;height:18px;accent-color:var(--accent);"></div>
    `;
  }

  function saveToolEdit() {
    if (!editingToolId) return;
    Tools.update(editingToolId, {
      name: document.getElementById('te-name').value,
      type: document.getElementById('te-type').value,
      diameter: parseFloat(document.getElementById('te-dia').value),
      length: parseFloat(document.getElementById('te-len').value),
      flutes: parseInt(document.getElementById('te-flutes').value),
      cutData: {
        feed: parseFloat(document.getElementById('te-feed').value),
        speed: parseFloat(document.getElementById('te-speed').value),
        maxCutHeight: parseFloat(document.getElementById('te-mch').value),
        coolant: document.getElementById('te-coolant').checked
      }
    });
  }

});
