// operations.js — CAM operations

const Operations = (() => {
  const ops = [];
  let toolpathObjects = [];

  // Remove all toolpath visualization
  function clearToolpaths() {
    toolpathObjects.forEach(o => Viewer.remove(o));
    toolpathObjects = [];
  }

  // Generate face milling toolpath lines
  function generateFaceMilling(op, blankData) {
    clearToolpaths();

    const { tool, params } = op;
    const blank = blankData.params;

    const ae = params.ae; // lateral stepover
    const ap = params.ap; // depth of cut
    const toolR = tool.diameter / 2;

    let x = blank.x || blank.dia;
    let y = blank.y || blank.dia;
    const z = (blank.z || blank.h);

    const startZ = z - ap; // first pass Z level
    const startX = -(x / 2) - toolR;
    const endX = (x / 2) + toolR;

    const points = [];
    let currentY = -(y / 2) - toolR;
    let dir = 1;

    while (currentY <= (y / 2) + toolR) {
      points.push(new THREE.Vector3(dir > 0 ? startX : endX, startZ, currentY));
      points.push(new THREE.Vector3(dir > 0 ? endX : startX, startZ, currentY));
      currentY += ae;
      dir *= -1;
    }

    // Draw lines
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x0057ff, linewidth: 2 });
    const line = new THREE.Line(geometry, material);
    Viewer.add(line);
    toolpathObjects.push(line);

    // Draw tool start position (cylinder)
    const toolGeo = new THREE.CylinderGeometry(toolR, toolR, tool.length, 32);
    const toolMat = new THREE.MeshPhongMaterial({ color: 0xffb300, transparent: true, opacity: 0.7 });
    const toolMesh = new THREE.Mesh(toolGeo, toolMat);
    toolMesh.position.set(points[0].x, startZ + tool.length / 2, points[0].z);
    Viewer.add(toolMesh);
    toolpathObjects.push(toolMesh);
  }

  function addOperation(op) {
    ops.push(op);
  }

  function getAll() { return ops; }

  function renderPanel(opIndex) {
    // Returns HTML for operation parameter panel
    return `
      <div class="sidebar-label" style="margin-bottom:14px">Planfräsen</div>

      <div class="sidebar-label">Werkzeug</div>
      <div class="param-grid">
        <div class="form-group">
          <label class="form-label">Durchmesser</label>
          <div class="form-control-unit">
            <input type="number" id="op-tool-dia" value="16" min="1">
            <span class="unit-badge">mm</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Länge</label>
          <div class="form-control-unit">
            <input type="number" id="op-tool-len" value="60" min="1">
            <span class="unit-badge">mm</span>
          </div>
        </div>
      </div>

      <div class="divider"></div>
      <div class="sidebar-label">Schnittparameter</div>

      <div class="param-grid">
        <div class="form-group">
          <label class="form-label">Vorschub</label>
          <div class="form-control-unit">
            <input type="number" id="op-feed" value="800" min="1">
            <span class="unit-badge">mm/m</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Drehzahl</label>
          <div class="form-control-unit">
            <input type="number" id="op-speed" value="3000" min="1">
            <span class="unit-badge">RPM</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Seitl. Zust. ae</label>
          <div class="form-control-unit">
            <input type="number" id="op-ae" value="12" min="0.1" step="0.1">
            <span class="unit-badge">mm</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Tiefenzust. ap</label>
          <div class="form-control-unit">
            <input type="number" id="op-ap" value="2" min="0.1" step="0.1">
            <span class="unit-badge">mm</span>
          </div>
        </div>
      </div>

      <div class="divider"></div>
      <button class="btn btn-primary btn-full" id="btn-calc-toolpath">Werkzeugweg berechnen</button>
    `;
  }

  return { addOperation, getAll, generateFaceMilling, renderPanel, clearToolpaths };
})();
