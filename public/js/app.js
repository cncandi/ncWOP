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
    Blank.create(blankType, p);
    blankCreated = true;
    // Switch to ops tab hint
    document.getElementById('panel-body').innerHTML = '<p class="hint">Operation hinzufügen und Unteroperation wählen.</p>';
  });

  // ── Add operation ──
  document.getElementById('btn-add-op').addEventListener('click', () => {
    if (!blankCreated) { alert('Bitte zuerst Rohteil erstellen.'); return; }
    const oi = Operations.addOp();
    rebuildTree();
    // Auto-select general of new op
    selectNode(oi, 'general');
    // Switch to ops tab
    document.querySelector('.tab[data-tab="ops"]').click();
  });

  function rebuildTree() {
    Operations.renderTree((oi, sub) => selectNode(oi, sub));
  }

  function selectNode(oi, sub) {
    Operations.setSelected(oi, sub);
    Operations.renderPanel(oi, sub, (calcOi) => {
      Operations.generateFaceMilling(calcOi);
      rebuildTree();
    });
    // Show toolpath if exists
    if (sub === 'roughing') Operations.showToolpath(oi);
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
});
