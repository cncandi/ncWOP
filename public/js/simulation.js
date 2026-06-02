const Simulation = (() => {
  let pts=[], idx=0, tool=null, running=false, raf=null, spd=3;

  function init(points, dia, len) {
    stop();
    pts=points; idx=0;
    if(tool) Viewer.remove(tool);
    const r=dia/2;
    const tGeo = new THREE.CylinderGeometry(r,r,len,32); tGeo.rotateX(Math.PI/2);
    const m = new THREE.Mesh(tGeo, new THREE.MeshPhongMaterial({color:0xffb300,transparent:true,opacity:0.85}));
    const shGeo = new THREE.CylinderGeometry(r*.6,r*.6,len*.6,16); shGeo.rotateX(Math.PI/2);
    const sh = new THREE.Mesh(shGeo, new THREE.MeshPhongMaterial({color:0x888888}));
    sh.position.z = len*.8; m.add(sh);
    tool=m; moveTo(0); Viewer.add(tool);
  }

  function moveTo(i) {
    idx = Math.max(0, Math.min(i, pts.length-1));
    if(!tool||!pts[idx]) return;
    const h=tool.geometry.parameters.height;
    tool.position.set(pts[idx].x, pts[idx].y, pts[idx].z + h/2);
    const el=document.getElementById('sim-prog');
    if(el) el.style.width = (pts.length>1 ? idx/(pts.length-1)*100 : 0)+'%';
  }

  function loop() {
    if(!running) return;
    for(let i=0;i<spd;i++) {
      if(idx>=pts.length-1){running=false;syncBtn();return;}
      idx++;
    }
    moveTo(idx);
    raf=requestAnimationFrame(loop);
  }

  function play() { if(!pts.length)return; if(idx>=pts.length-1)idx=0; running=true; loop(); syncBtn(); }
  function pause() { running=false; if(raf)cancelAnimationFrame(raf); syncBtn(); }
  function stop()  { pause(); moveTo(0); }
  function toStart(){ pause(); moveTo(0); }
  function toEnd()  { pause(); moveTo(pts.length-1); }
  function stepFwd(){ pause(); moveTo(idx+Math.max(1,Math.floor(pts.length/80))); }
  function stepBck(){ pause(); moveTo(idx-Math.max(1,Math.floor(pts.length/80))); }
  function setSpeed(v){ spd=v; }
  function syncBtn(){ const b=document.getElementById('s-play'); if(b)b.textContent=running?'⏸':'▶'; }
  function isRunning(){ return running; }

  return { init, play, pause, stop, toStart, toEnd, stepFwd, stepBck, setSpeed, isRunning };
})();
