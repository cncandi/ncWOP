document.addEventListener('DOMContentLoaded', () => {
  Viewer.init();

  let blankType = 'box';
  let blankCreated = false;
  let originX = 'center', originY = 'center', originZ = 'top';

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

    // Calculate offset: shift blank so chosen origin = world 0,0,0
    const hx = (p.x||p.d||0)/2, hy = (p.y||p.d||0)/2, hz = (p.z||p.h||0);
    const ox = parseFloat(document.getElementById('origin-ox')?.value)||0;
    const oy = parseFloat(document.getElementById('origin-oy')?.value)||0;
    const oz = parseFloat(document.getElementById('origin-oz')?.value)||0;
    const wx = originX==='left'?-hx : originX==='right'?hx : 0;
    const wy = originY==='front'?-hy : originY==='back'?hy : 0;
    const wz = originZ==='top'?hz : originZ==='bottom'?0 : hz/2;
    const offset = { x: wx+ox, y: wz+oz, z: wy+oy };

    Blank.create(blankType, p, offset);
    blankCreated = true;
    updateOriginMarker();
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
    }, 0);
  }


  // ── Origin picker ──

  const zBtns = { top: document.getElementById('oz-top'), center: document.getElementById('oz-center'), bottom: document.getElementById('oz-bottom') };
  Object.entries(zBtns).forEach(([z, btn]) => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      Object.values(zBtns).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      originZ = z;
      updateOriginLabel();
      updateOriginMarker();
    });
  });

  document.querySelectorAll('.op-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.op-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      originX = dot.dataset.x;
      originY = dot.dataset.y;
      if (originX === 'center' && originY === 'center') { originX = 'center'; originY = 'center'; }
      updateOriginLabel();
      updateOriginMarker();
    });
  });

  // Set center dot active by default
  const centerDot = document.querySelector('.op-dot[data-x="center"]');
  if (centerDot) centerDot.classList.add('active');

  ['origin-ox','origin-oy','origin-oz'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateOriginMarker);
  });

  function updateOriginLabel() {
    const xL = {left:'Links', center:'Mitte', right:'Rechts'}[originX] || originX;
    const yL = {front:'vorne', center:'', back:'hinten'}[originY] || originY;
    const zL = {top:'oben', center:'Mitte', bottom:'unten'}[originZ] || originZ;
    const parts = [xL, yL, zL].filter(s => s && s !== 'Mitte' || (originX==='center'&&originY==='center'&&originZ==='top'));
    const el = document.getElementById('origin-label');
    if (el) el.textContent = originX==='center'&&originY==='center' ? 'Mitte '+zL : parts.join(' ');
  }

  function getOriginWorld() {
    const blank = Blank.getData();
    if (!blank.params) return {x:0,y:0,z:0};
    const p = blank.params;
    const hx = (p.x||p.d||0)/2, hy = (p.y||p.d||0)/2, hz = (p.z||p.h||0);
    const ox = parseFloat(document.getElementById('origin-ox')?.value)||0;
    const oy = parseFloat(document.getElementById('origin-oy')?.value)||0;
    const oz = parseFloat(document.getElementById('origin-oz')?.value)||0;
    const wx = originX==='left'?-hx : originX==='right'?hx : 0;
    const wy = originY==='front'?-hy : originY==='back'?hy : 0;
    const wz = originZ==='top'?hz : originZ==='bottom'?0 : hz/2;
    return { x: wx+ox, y: wz+oz, z: wy+oy };
  }

  let originMarker = null;
  function updateOriginMarker() {
    if (!window.THREE) return;
    if (originMarker) Viewer.remove(originMarker);
    // Origin is always at world 0,0,0 after blank offset
    const axGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-20,0,0), new THREE.Vector3(20,0,0),
      new THREE.Vector3(0,-20,0), new THREE.Vector3(0,20,0),
      new THREE.Vector3(0,0,-20), new THREE.Vector3(0,0,20),
    ]);
    const axMat = new THREE.LineBasicMaterial({color:0xff3b30, opacity:0.8, transparent:true});
    originMarker = new THREE.LineSegments(axGeo, axMat);
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 8, 8),
      new THREE.MeshBasicMaterial({color:0xff3b30})
    );
    originMarker.add(sphere);
    Viewer.add(originMarker);
  }

  window.getOriginWorld = getOriginWorld;

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
