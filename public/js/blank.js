const Blank = (() => {
  let type=null, orig=null, cur=null;
  const states = [];

  function mkMesh(t, p, color) {
    let geo;
    if (t==='box') {
      // Z-up: width X, depth Y, height Z
      geo = new THREE.BoxGeometry(p.x, p.y, p.z);
    } else {
      // Cylinder default axis is Y; rotate so axis = Z
      geo = new THREE.CylinderGeometry(p.d/2, p.d/2, p.h, 64);
      geo.rotateX(Math.PI/2);
    }
    const m = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({color, transparent:true, opacity:0.82}));
    // Sit on XY plane: center is at half height in Z
    m.position.z = (t==='box' ? p.z : p.h) / 2;
    m.castShadow = true;
    m.add(new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({color:0x5580aa,wireframe:true,transparent:true,opacity:0.1})));
    return m;
  }

  function applyOffset(m) {
    const off = orig._off || {x:0,y:0,z:0};
    m.position.x -= off.x;
    m.position.y -= off.y;
    m.position.z -= off.z;
  }

  function show(m) { if(cur) Viewer.remove(cur); cur=m; Viewer.add(cur); }

  function create(t, p, offset) {
    type=t; orig=Object.assign({},p); orig._off=offset||{x:0,y:0,z:0}; states.length=0;
    const m=mkMesh(t,p,0xc8d8e8);
    applyOffset(m);
    show(m);
  }

  function setOpState(idx, ap) {
    const prev = idx===0 ? {...orig} : {...(states[idx-1]||orig)};
    const next = {...prev};
    if (type==='box') next.z = Math.max(1, prev.z - ap);
    else next.h = Math.max(1, prev.h - ap);
    states[idx] = next;
  }

  function showOp(idx) {
    if (!states[idx]) return;
    const m=mkMesh(type,states[idx],0xb8e0c8);
    applyOffset(m);
    show(m);
  }

  function setOffset(offset) {
    orig._off = offset || {x:0,y:0,z:0};
    if (cur) {
      const baseZ = (type==='box' ? orig.z : orig.h) / 2;
      cur.position.x = -orig._off.x;
      cur.position.y = -orig._off.y;
      cur.position.z = baseZ - orig._off.z;
    }
  }

  function getData() { return {type, params: orig}; }
  return { create, setOpState, showOp, getData, setOffset };
})();
