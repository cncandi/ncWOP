// app.js — Main application controller

document.addEventListener('DOMContentLoaded', () => {

  Viewer.init();

  let blankType = 'box';
  let blankCreated = false;

  // ── Blank type toggle ──
  document.querySelectorAll('#blank-type-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#blank-type-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      blankType = btn.dataset.type;
      document.getElementById('blank-box-params').style.display = blankType === 'box' ? 'block' : 'none';
      document.getElementById('blank-cylinder-params').style.display = blankType === 'cylinder' ? 'block' : 'none';
    });
  });

  // ── Create blank ──
  document.getElementById('btn-create-blank').addEventListener('click', () => {
    let params;
    if (blankType === 'box') {
      params = {
        x: parseFloat(document.getElementById('blank-x').value),
        y: parseFloat(document.getElementById('blank-y').value),
        z: parseFloat(document.getElementById('blank-z').value),
      };
    } else {
      params = {
        dia: parseFloat(document.getElementById('blank-dia').value),
        h: parseFloat(document.getElementById('blank-h').value),
      };
    }
    Blank.create(blankType, params);
    blankCreated = true;
    document.getElementById('section-ops').style.display = 'block';
    setStep(2);
    document.getElementById('panel-content').innerHTML = `
      <div style="color:var(--text-2); font-size:13px;">Rohling erstellt.<br>Operation hinzufügen.</div>
      <div style="margin-top:12px; padding:10px 12px; background:var(--surface2); border-radius:8px; font-size:12px; color:var(--text-3);">
        <strong style="color:var(--text-2);">Typ:</strong> ${blankType === 'box' ? 'Box' : 'Zylinder'}<br>
        ${blankType === 'box'
          ? `X: ${params.x}mm &nbsp; Y: ${params.y}mm &nbsp; Z: ${params.z}mm`
          : `⌀: ${params.dia}mm &nbsp; H: ${params.h}mm`}
      </div>
    `;
  });

  // ── Add operation ──
  document.getElementById('btn-add-op').addEventListener('click', () => {
    if (!blankCreated) return;
    const opIndex = Operations.getAll().length;
    Operations.addOperation({ type: 'face-milling', tool: {}, params: {}, opStateIndex: -1 });
    const opList = document.getElementById('op-list');
    const card = document.createElement('div');
    card.className = 'op-card active';
    card.dataset.index = opIndex;
    card.innerHTML = `<div class="op-card-title">Planfräsen</div><div class="op-card-sub">Parameter eingeben →</div>`;
    card.addEventListener('click', () => {
      showOpPanel(opIndex);
      const ops = Operations.getAll();
      if (ops[opIndex] && ops[opIndex].opStateIndex >= 0) {
        Blank.showOpState(ops[opIndex].opStateIndex);
        Operations.showToolpath(opIndex);
        // Show sim controls if toolpath exists
        document.getElementById('sim-controls').style.display = 'flex';
        document.getElementById('sim-progress').style.width = '0%';
        document.getElementById('btn-sim-play').innerHTML = '▶';
      }
    });
    opList.appendChild(card);
    showOpPanel(opIndex);
  });

  // ── Show operation panel ──
  function showOpPanel(index) {
    document.querySelectorAll('.op-card').forEach(c => c.classList.remove('active'));
    const card = document.querySelector(`.op-card[data-index="${index}"]`);
    if (card) card.classList.add('active');
    document.getElementById('panel-content').innerHTML = Operations.renderPanel(index);

    // Wire collapsible group headers
    document.querySelectorAll('.param-group-header--collapsible').forEach(header => {
      header.addEventListener('click', () => {
        const target = document.getElementById(header.dataset.target);
        if (!target) return;
        const collapsed = target.style.display === 'none';
        target.style.display = collapsed ? 'block' : 'none';
        header.classList.toggle('grp-collapsed', !collapsed);
      });
    });

    document.getElementById('btn-calc-toolpath').addEventListener('click', () => {
      // Use roughing tool diameter/length from tool name (placeholder until tool DB)
      const tool = { diameter: 16, length: 60 };
      const params = {
        safeZ: parseFloat(document.getElementById('op-safeZ')?.value) || 50,
        refZ:  parseFloat(document.getElementById('op-refZ')?.value)  || 0,
        dir:   document.getElementById('op-dir')?.value || 'climb',
        rEnabled: document.getElementById('chk-roughing')?.checked ?? true,
        rTool: document.getElementById('op-r-tool')?.value || '',
        rMode: document.getElementById('op-r-mode')?.value || 'parallel',
        aePct: parseFloat(document.getElementById('op-ae-pct')?.value)  || 45,
        depth: parseFloat(document.getElementById('op-depth')?.value)    || 5,
        ap:    parseFloat(document.getElementById('op-ap')?.value)        || 2,
        ae:    parseFloat(document.getElementById('op-ae')?.value)    || 12,
        fEnabled: document.getElementById('chk-finishing')?.checked ?? true,
        fTool: document.getElementById('op-f-tool')?.value || '',
        fMode: document.getElementById('op-f-mode')?.value || 'traditional',
        fAePct: parseFloat(document.getElementById('op-f-ae-pct')?.value) || 45,
        fDepth: parseFloat(document.getElementById('op-f-depth')?.value)  || 5,
        fAp:    parseFloat(document.getElementById('op-f-ap')?.value)     || 0.5,
        fAe: parseFloat(document.getElementById('op-f-ae')?.value) || 12,
        fAllowance: parseFloat(document.getElementById('op-f-allowance')?.value) || 0,
        cEnabled: document.getElementById('chk-chamfer')?.checked ?? false,
        cTool: document.getElementById('op-c-tool')?.value || '',
        cDepth: parseFloat(document.getElementById('op-c-depth')?.value) || 0.5,
        cSteps: parseInt(document.getElementById('op-c-steps')?.value)   || 1,
        feed: 800, speed: 3000,
      };
      const existingStateIndex = Operations.getAll()[index]?.opStateIndex >= 0
        ? Operations.getAll()[index].opStateIndex
        : undefined;
      const result = Operations.generateFaceMilling({ tool, params }, Blank.getData(), index, existingStateIndex);
      const ops = Operations.getAll();
      ops[index].opStateIndex = result.opStateIndex;
      ops[index].tool = tool;
      ops[index].params = { ...params };
      setStep(3);
      document.getElementById('btn-export').disabled = false;

      // Show simulation controls
      document.getElementById('sim-controls').style.display = 'flex';
    });
  }

  // ── Simulation controls ──
  document.getElementById('btn-sim-play').addEventListener('click', () => {
    const btn = document.getElementById('btn-sim-play');
    if (Simulation.isRunning()) {
      Simulation.pause();
      btn.innerHTML = '▶';
    } else {
      Simulation.play();
      btn.innerHTML = '⏸';
      // Auto-reset button when done
      const check = setInterval(() => {
        if (!Simulation.isRunning()) { btn.innerHTML = '▶'; clearInterval(check); }
      }, 200);
    }
  });

  document.getElementById('btn-sim-stop').addEventListener('click', () => {
    Simulation.stop();
    document.getElementById('btn-sim-play').innerHTML = '▶';
  });

  document.getElementById('btn-sim-start').addEventListener('click', () => {
    Simulation.toStart();
    document.getElementById('btn-sim-play').innerHTML = '▶';
  });

  document.getElementById('btn-sim-end').addEventListener('click', () => {
    Simulation.toEnd();
    document.getElementById('btn-sim-play').innerHTML = '▶';
  });

  document.getElementById('btn-sim-stepfwd').addEventListener('click', () => {
    Simulation.stepForward();
    document.getElementById('btn-sim-play').innerHTML = '▶';
  });

  document.getElementById('btn-sim-stepback').addEventListener('click', () => {
    Simulation.stepBackward();
    document.getElementById('btn-sim-play').innerHTML = '▶';
  });

  document.getElementById('sim-speed').addEventListener('input', (e) => {
    Simulation.setSpeed(parseInt(e.target.value));
  });

  // ── Viewport buttons ──
  document.getElementById('btn-view-top').addEventListener('click', () => Viewer.setView('top'));
  document.getElementById('btn-view-iso').addEventListener('click', () => Viewer.setView('iso'));
  document.getElementById('btn-view-front').addEventListener('click', () => Viewer.setView('front'));

  // ── Reset ──
  document.getElementById('btn-reset').addEventListener('click', () => location.reload());

  // ── Export placeholder ──
  document.getElementById('btn-export').addEventListener('click', () => {
    alert('G-Code Export folgt in nächster Version.');
  });

  // ── Step indicator ──
  function setStep(active) {
    for (let i = 1; i <= 3; i++) {
      const el = document.getElementById(`step-${i}`);
      el.classList.remove('active', 'done');
      if (i < active) el.classList.add('done');
      else if (i === active) el.classList.add('active');
    }
  }

  // ── Panel resize & collapse ──
  const shell = document.querySelector('.app-shell');

  // Sidebar toggle
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    const hidden = shell.classList.toggle('sidebar-hidden');
    document.getElementById('sidebar-toggle').textContent = hidden ? '›' : '‹';
  });

  // Right panel toggle
  document.getElementById('panel-toggle').addEventListener('click', () => {
    const hidden = shell.classList.toggle('panel-hidden');
    document.getElementById('panel-toggle').textContent = hidden ? '‹' : '›';
  });

  // Sidebar resize drag
  (function() {
    const handle = document.getElementById('sidebar-resize');
    let dragging = false, startX, startW;
    handle.addEventListener('mousedown', e => {
      dragging = true; startX = e.clientX;
      startW = parseInt(getComputedStyle(document.getElementById('sidebar')).width);
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const w = Math.max(180, Math.min(500, startW + e.clientX - startX));
      shell.style.setProperty('--sidebar-w', w + 'px');
    });
    document.addEventListener('mouseup', () => {
      dragging = false;
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  })();

  // Right panel resize drag
  (function() {
    const handle = document.getElementById('panel-resize');
    let dragging = false, startX, startW;
    handle.addEventListener('mousedown', e => {
      dragging = true; startX = e.clientX;
      startW = parseInt(getComputedStyle(document.getElementById('right-panel')).width);
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const w = Math.max(200, Math.min(600, startW - (e.clientX - startX)));
      shell.style.setProperty('--panel-w', w + 'px');
    });
    document.addEventListener('mouseup', () => {
      dragging = false;
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  })();

  // ── ae % → mm live update ──
  window.updateAeMm = function(type) {
    if (type === 'r') {
      const pct = parseFloat(document.getElementById('op-ae-pct')?.value) || 45;
      const dia = parseFloat(document.getElementById('op-r-tool')?.value.match(/D(\d+)/)?.[1]) || 16;
      const mm = (pct / 100 * dia).toFixed(1);
      const el = document.getElementById('op-ae-mm-r');
      if (el) el.textContent = mm + ' mm';
    } else {
      const pct = parseFloat(document.getElementById('op-f-ae-pct')?.value) || 45;
      const dia = parseFloat(document.getElementById('op-f-tool')?.value.match(/D(\d+)/)?.[1]) || 16;
      const mm = (pct / 100 * dia).toFixed(1);
      const el = document.getElementById('op-ae-mm-f');
      if (el) el.textContent = mm + ' mm';
    }
  };

  // ── depth / ap → steps live update ──
  window.updateSteps = function(type) {
    if (type === 'r') {
      const depth = parseFloat(document.getElementById('op-depth')?.value) || 5;
      const ap    = parseFloat(document.getElementById('op-ap')?.value)    || 2;
      const el = document.getElementById('op-steps-r');
      if (el) el.textContent = Math.ceil(depth / ap) + ' Schr.';
    } else {
      const depth = parseFloat(document.getElementById('op-f-depth')?.value) || 5;
      const ap    = parseFloat(document.getElementById('op-f-ap')?.value)    || 0.5;
      const el = document.getElementById('op-steps-f');
      if (el) el.textContent = Math.ceil(depth / ap) + ' Schr.';
    }
  };

});
