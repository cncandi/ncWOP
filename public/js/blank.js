// blank.js — Rohling (workpiece) logic

const Blank = (() => {
  let meshBefore = null;
  let meshAfter = null;
  let currentData = null;
  let showingAfter = false;

  function buildMesh(type, params, color, opacity) {
    let geometry;
    if (type === 'box') {
      geometry = new THREE.BoxGeometry(params.x, params.z, params.y);
    } else {
      geometry = new THREE.CylinderGeometry(params.dia / 2, params.dia / 2, params.h, 64);
    }
    const material = new THREE.MeshPhongMaterial({
      color, transparent: true, opacity, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = (type === 'box' ? params.z : params.h) / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Wireframe
    const wm = new THREE.Mesh(geometry.clone(),
      new THREE.MeshBasicMaterial({ color: 0x5580aa, wireframe: true, opacity: 0.12, transparent: true }));
    mesh.add(wm);
    return mesh;
  }

  function create(type, params) {
    if (meshBefore) Viewer.remove(meshBefore);
    if (meshAfter) Viewer.remove(meshAfter);
    meshAfter = null;
    showingAfter = false;

    meshBefore = buildMesh(type, params, 0xc8d8e8, 0.85);
    Viewer.add(meshBefore);
    currentData = { type, params };
    return meshBefore;
  }

  // Build "after" mesh: box with ap removed from top
  function applyOperation(ap) {
    if (!currentData) return;
    if (meshAfter) Viewer.remove(meshAfter);

    const { type, params } = currentData;
    const newParams = { ...params };

    if (type === 'box') {
      newParams.z = Math.max(1, params.z - ap);
    } else {
      newParams.h = Math.max(1, params.h - ap);
    }

    meshAfter = buildMesh(type, newParams, 0xb8e0c8, 0.85);
    meshAfter.visible = false;
    Viewer.add(meshAfter);
  }

  function showBefore() {
    if (meshBefore) meshBefore.visible = true;
    if (meshAfter) meshAfter.visible = false;
    showingAfter = false;
  }

  function showAfter() {
    if (!meshAfter) return;
    if (meshBefore) meshBefore.visible = false;
    meshAfter.visible = true;
    showingAfter = true;
  }

  function toggle() {
    showingAfter ? showBefore() : showAfter();
    return !showingAfter;
  }

  function getData() { return currentData; }
  function getMesh() { return meshBefore; }
  function hasAfter() { return !!meshAfter; }

  return { create, applyOperation, showBefore, showAfter, toggle, getData, getMesh, hasAfter };
})();
