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

  function create(t, p, offset) {
    type=t; orig=Object.assign({},p); orig._off=offset||{x:0,y:0,z:0}; states.length=0;
    var m=mkMesh(t,p,0xc8d8e8);
    m.position.x -= orig._off.x;
    m.position.y -= orig._off.y;
    m.position.z -= orig._off.z;
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
    var m=mkMesh(type,states[idx],0xb8e0c8);
    var off=orig._off||{x:0,y:0,z:0};
    m.position.x -= off.x;
    m.position.y -= off.y;
    m.position.z -= off.z;
    show(m);
  }

  function getData() { return {type, params: orig}; }
  return { create, setOpState, showOp, getData };
})();
