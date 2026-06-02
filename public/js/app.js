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


});
