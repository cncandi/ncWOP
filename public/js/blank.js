// blank.js — Rohling (workpiece) logic

const Blank = (() => {
  let mesh = null;
  let currentData = null;

  function create(type, params) {
    // Remove existing
    if (mesh) {
      Viewer.remove(mesh);
      mesh = null;
    }

    let geometry;

    if (type === 'box') {
      geometry = new THREE.BoxGeometry(params.x, params.z, params.y);
    } else if (type === 'cylinder') {
      geometry = new THREE.CylinderGeometry(params.dia / 2, params.dia / 2, params.h, 64);
    }

    const material = new THREE.MeshPhongMaterial({
      color: 0xc8d8e8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = (type === 'box' ? params.z : params.h) / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Wireframe overlay
    const wireGeo = geometry.clone();
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x5580aa, wireframe: true, opacity: 0.15, transparent: true });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    mesh.add(wireMesh);

    Viewer.add(mesh);
    currentData = { type, params };
    return mesh;
  }

  function getData() { return currentData; }
  function getMesh() { return mesh; }

  return { create, getData, getMesh };
})();
