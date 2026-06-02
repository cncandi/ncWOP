// heightfield.js — material removal simulation via Z heightmap
const HeightField = (() => {
  let mesh = null;
  let grid = null;      // Float32Array of heights, size cols*rows
  let cols = 0, rows = 0;
  let minX, minY, cellX, cellY;
  let offset = {x:0,y:0,z:0};
  let baseColor = 0xc8d8e8;
  const RES = 120;      // grid resolution per axis (max)

  // Build heightfield for a box blank, top at topZ (world)
  function build(blankData) {
    dispose();
    const p = blankData.params;
    offset = p._off || {x:0,y:0,z:0};
    const w = p.x || p.d || 100;
    const d = p.y || p.d || 100;
    const topZ = (p.z || p.h || 30) - offset.z; // world Z of top surface

    // Grid resolution proportional to size
    cols = Math.min(RES, Math.max(40, Math.round(w)));
    rows = Math.min(RES, Math.max(40, Math.round(d)));

    minX = -(w/2) - offset.x;
    minY = -(d/2) - offset.y;
    cellX = w / (cols-1);
    cellY = d / (rows-1);

    grid = new Float32Array(cols*rows).fill(topZ);

    buildMesh();
  }

  function buildMesh() {
    if (mesh) Viewer.remove(mesh);
    const geo = new THREE.PlaneGeometry(
      (cols-1)*cellX, (rows-1)*cellY, cols-1, rows-1
    );
    // Plane is in XY by default (Z up after our convention)? PlaneGeometry is in XY plane, normal +Z. Good.
    const pos = geo.attributes.position;
    for (let r=0;r<rows;r++) {
      for (let c=0;c<cols;c++) {
        const i = r*cols+c;
        pos.setZ(i, grid[i]);
      }
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshPhongMaterial({color:baseColor, side:THREE.DoubleSide, flatShading:false});
    mesh = new THREE.Mesh(geo, mat);
    // Center the plane at grid center
    mesh.position.x = minX + (cols-1)*cellX/2;
    mesh.position.y = minY + (rows-1)*cellY/2;
    Viewer.add(mesh);
  }

  // Carve: lower all grid cells within tool radius below toolZ
  function carve(worldX, worldY, toolZ, toolR) {
    if (!grid) return;
    const c0 = Math.max(0, Math.floor((worldX - toolR - minX)/cellX));
    const c1 = Math.min(cols-1, Math.ceil((worldX + toolR - minX)/cellX));
    const r0 = Math.max(0, Math.floor((worldY - toolR - minY)/cellY));
    const r1 = Math.min(rows-1, Math.ceil((worldY + toolR - minY)/cellY));
    const r2 = toolR*toolR;
    let changed = false;
    for (let r=r0;r<=r1;r++) {
      const cy = minY + r*cellY;
      for (let c=c0;c<=c1;c++) {
        const cx = minX + c*cellX;
        const dx = cx-worldX, dy = cy-worldY;
        if (dx*dx+dy*dy <= r2) {
          const i = r*cols+c;
          if (grid[i] > toolZ) { grid[i] = toolZ; changed = true; }
        }
      }
    }
    return changed;
  }

  function updateMesh() {
    if (!mesh || !grid) return;
    const pos = mesh.geometry.attributes.position;
    for (let i=0;i<grid.length;i++) pos.setZ(i, grid[i]);
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  function dispose() {
    if (mesh) { Viewer.remove(mesh); mesh = null; }
    grid = null;
  }

  function setColor(col) { baseColor = col; if(mesh) mesh.material.color.set(col); }
  function isActive() { return !!grid; }

  return { build, carve, updateMesh, dispose, setColor, isActive };
})();
