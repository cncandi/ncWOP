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
    Operations.addOperation({ type: 'face-milling', tool: {}, params: {} });
    const opList = document.getElementById('op-list');
    const card = document.createElement('div');
    card.className = 'op-card active';
    card.dataset.index = opIndex;
    card.innerHTML = `<div class="op-card-title">Planfräsen</div><div class="op-card-sub">Parameter eingeben →</div>`;
    card.addEventListener('click', () => showOpPanel(opIndex));
    opList.appendChild(card);
    showOpPanel(opIndex);
  });

  // ── Show operation panel ──
  function showOpPanel(index) {
    document.querySelectorAll('.op-card').forEach(c => c.classList.remove('active'));
    const card = document.querySelector(`.op-card[data-index="${index}"]`);
    if (card) card.classList.add('active');
    document.getElementById('panel-content').innerHTML = Operations.renderPanel(index);

    document.getElementById('btn-calc-toolpath').addEventListener('click', () => {
      const tool = {
        diameter: parseFloat(document.getElementById('op-tool-dia').value),
        length: parseFloat(document.getElementById('op-tool-len').value),
      };
      const params = {
        feed: parseFloat(document.getElementById('op-feed').value),
        speed: parseFloat(document.getElementById('op-speed').value),
        ae: parseFloat(document.getElementById('op-ae').value),
        ap: parseFloat(document.getElementById('op-ap').value),
      };
      Operations.generateFaceMilling({ tool, params }, Blank.getData());
      setStep(3);
      document.getElementById('btn-export').disabled = false;

      // Show simulation controls
      const simCtrl = document.getElementById('sim-controls');
      simCtrl.style.display = 'flex';

      // Show before/after toggle
      document.getElementById('before-after-ctrl').style.display = 'block';
    });
  }

  // ── Simulation controls ──
  document.getElementById('btn-sim-play').addEventListener('click', () => {
    const btn = document.getElementById('btn-sim-play');
    if (Simulation.isDone()) {
      Simulation.stop();
      Simulation.play();
      btn.textContent = '⏸ Pause';
    } else if (Simulation.isRunning()) {
      Simulation.pause();
      btn.textContent = '▶ Play';
    } else {
      Simulation.play();
      btn.textContent = '⏸ Pause';
    }
  });

  document.getElementById('btn-sim-stop').addEventListener('click', () => {
    Simulation.stop();
    document.getElementById('btn-sim-play').textContent = '▶ Play';
    document.getElementById('sim-progress').style.width = '0%';
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

});
