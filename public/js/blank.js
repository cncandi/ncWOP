// blank.js — Rohling with per-operation states

const Blank = (() => {
  let originalParams = null;
  let blankType = null;

  // All meshes currently in scene
  let activeMesh = null;

  // Per-operation resulting params: [{ z/h after op }]
  const opStates = [];

  function buildMesh(type, params, color, opacity) {
    let geometry;
    if (type === 'box') {
      geometry = new THREE.BoxGeometry(params.x, params.z, params.y);
    } else {
      geometry = new THREE.CylinderGeometry(params.dia / 2, params.dia / 2, params.h, 64);
    }
    const mat = new THREE.MeshPhongMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.y = (type === 'box' ? params.z : params.h) / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const wm = new THREE.Mesh(geometry.clone(),
      new THREE.MeshBasicMaterial({ color: 0x5580aa, wireframe: true, opacity: 0.12, transparent: true }));
    mesh.add(wm);
    return mesh;
  }

  function setMesh(mesh) {
    if (activeMesh) Viewer.remove(activeMesh);
    activeMesh = mesh;
    Viewer.add(activeMesh);
  }

  function create(type, params) {
    blankType = type;
    originalParams = { ...params };
    opStates.length = 0;
    setMesh(buildMesh(type, params, 0xc8d8e8, 0.85));
    return activeMesh;
  }

  // Called after calculating an operation — stores resulting params
  function addOpState(ap) {
    const prev = opStates.length > 0
      ? opStates[opStates.length - 1]
      : { ...originalParams };

    const next = { ...prev };
    if (blankType === 'box') {
      next.z = Math.max(1, prev.z - ap);
    } else {
      next.h = Math.max(1, prev.h - ap);
    }
    opStates.push(next);
    return opStates.length - 1;
  }

  // Update state for existing op index (recalculate)
  function updateOpState(index, ap) {
    const prev = index > 0 ? opStates[index - 1] : { ...originalParams };
    const next = { ...prev };
    if (blankType === 'box') {
      next.z = Math.max(1, prev.z - ap);
    } else {
      next.h = Math.max(1, prev.h - ap);
    }
    opStates[index] = next;
    // Recalculate all subsequent states
    for (let i = index + 1; i < opStates.length; i++) {
      const p = opStates[i - 1];
      const n = { ...p };
      if (blankType === 'box') n.z = Math.max(1, p.z - ap);
      else n.h = Math.max(1, p.h - ap);
      opStates[i] = n;
    }
  }

  function showBefore() {
    setMesh(buildMesh(blankType, originalParams, 0xc8d8e8, 0.85));
  }

  function showAfter() {
    if (opStates.length === 0) return;
    showOpState(opStates.length - 1);
  }

  // Show the "after" state for a specific operation index
  function showOpState(index) {
    if (index < 0 || index >= opStates.length) return;
    setMesh(buildMesh(blankType, opStates[index], 0xb8e0c8, 0.85));
  }

  function getData() {
    return { type: blankType, params: originalParams };
  }

  function getOpCount() { return opStates.length; }
  function hasAfter() { return opStates.length > 0; }

  return { create, addOpState, updateOpState, showBefore, showAfter, showOpState, getData, getOpCount, hasAfter };
})();
