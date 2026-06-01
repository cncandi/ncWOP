// operations.js — CAM operations

const Operations = (() => {
  const ops = [];
  let toolpathObjects = [];
  let lastPoints = [];
  let lastTool = {};

  function clearToolpaths() {
    toolpathObjects.forEach(o => Viewer.remove(o));
    toolpathObjects = [];
  }

  function generateFaceMilling(op, blankData) {
    clearToolpaths();
    const { tool, params } = op;
    const blank = blankData.params;
    const ae = params.ae;
    const ap = params.ap;
    const toolR = tool.diameter / 2;

    let x = blank.x || blank.dia;
    let y = blank.y || blank.dia;
    const z = blank.z || blank.h;
    const startZ = z - ap;
    const startX = -(x / 2) - toolR;
    const endX = (x / 2) + toolR;

    const points = [];
    let currentY = -(y / 2) - toolR;
    let dir = 1;

    while (currentY <= (y / 2) + toolR) {
      // Interpolate each line segment into small steps for smooth animation
      const fromX = dir > 0 ? startX : endX;
      const toX   = dir > 0 ? endX : startX;
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        points.push(new THREE.Vector3(
          fromX + (toX - fromX) * (i / steps),
          startZ,
          currentY
        ));
      }
      currentY += ae;
      dir *= -1;
    }

    // Draw toolpath lines
    const linePoints = [];
    for (let i = 0; i < points.length; i++) linePoints.push(points[i]);
    const geo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const mat = new THREE.LineBasicMaterial({ color: 0x0057ff });
    const line = new THREE.Line(geo, mat);
    Viewer.add(line);
    toolpathObjects.push(line);

    lastPoints = points;
    lastTool = tool;

    // Apply to blank for before/after
    Blank.applyOperation(ap);

    // Init simulation
    Simulation.init(points, tool.diameter, tool.length);

    return points;
  }

  function getLastPoints() { return lastPoints; }
  function getLastTool() { return lastTool; }

  function addOperation(op) { ops.push(op); }
  function getAll() { return ops; }

  function renderPanel(opIndex) {
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

  return { addOperation, getAll, generateFaceMilling, renderPanel, clearToolpaths, getLastPoints, getLastTool };
})();
