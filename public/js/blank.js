const Blank = (() => {
  let type=null, orig=null, cur=null;
  const states = [];

  function mkMesh(t, p, color) {
    const geo = t==='box'
      ? new THREE.BoxGeometry(p.x, p.z, p.y)
      : new THREE.CylinderGeometry(p.d/2, p.d/2, p.h, 64);
    const m = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({color, transparent:true, opacity:0.82}));
    m.position.y = (t==='box' ? p.z : p.h) / 2;
    m.castShadow = true;
    m.add(new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({color:0x5580aa,wireframe:true,transparent:true,opacity:0.1})));
    return m;
  }

  function show(m) { if(cur) Viewer.remove(cur); cur=m; Viewer.add(cur); }

  function create(t, p) {
    type=t; orig={...p}; states.length=0;
    show(mkMesh(t, p, 0xc8d8e8));
  }

  function setOpState(idx, ap) {
    const prev = idx===0 ? {...orig} : {...(states[idx-1]||orig)};
    const next = {...prev};
    if (type==='box') next.z = Math.max(1, prev.z - ap);
    else next.h = Math.max(1, prev.h - ap);
    states[idx] = next;
  }

  function showOp(idx) {
    if (states[idx]) show(mkMesh(type, states[idx], 0xb8e0c8));
  }

  function getData() { return {type, params: orig}; }
  return { create, setOpState, showOp, getData };
})();
