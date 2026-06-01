// operations.js — CAM operations

const Operations = (() => {
  const ops = [];
  // Per-op stored toolpath line objects and points
  const opToolpaths = {}; // index -> { lineObj, points, tool }
  let activeIndex = -1;

  function hideAllToolpaths() {
    Object.values(opToolpaths).forEach(t => {
      if (t.lineObj) t.lineObj.visible = false;
    });
  }

  function showToolpath(index) {
    hideAllToolpaths();
    if (opToolpaths[index]) {
      opToolpaths[index].lineObj.visible = true;
      // Re-init simulation with this op's points/tool
      const { points, tool } = opToolpaths[index];
      Simulation.init(points, tool.diameter, tool.length);
    }
  }

  function generateFaceMilling(op, blankData, opIndex) {
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
    const endX   = (x / 2) + toolR;

    const points = [];
    let currentY = -(y / 2) - toolR;
    let dir = 1;

    while (currentY <= (y / 2) + toolR) {
      const fromX = dir > 0 ? startX : endX;
      const toX   = dir > 0 ? endX   : startX;
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

    // Remove old line for this op if exists
    if (opToolpaths[opIndex] && opToolpaths[opIndex].lineObj) {
      Viewer.remove(opToolpaths[opIndex].lineObj);
    }

    // Draw line
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x0057ff });
    const lineObj = new THREE.Line(geo, mat);
    Viewer.add(lineObj);

    // Hide all others, show this one
    hideAllToolpaths();
    opToolpaths[opIndex] = { lineObj, points, tool };
    activeIndex = opIndex;

    // Store op state in blank
    const opStateIndex = Blank.addOpState(ap);

    // Init simulation
    Simulation.init(points, tool.diameter, tool.length);

    return { points, opStateIndex };
  }

  function addOperation(op) { ops.push(op); }
  function getAll() { return ops; }

  function renderPanel(opIndex) {
    const op = ops[opIndex];
    const dia  = op && op.tool && op.tool.diameter ? op.tool.diameter : 16;
    const len  = op && op.tool && op.tool.length   ? op.tool.length   : 60;
    const feed = op && op.params && op.params.feed ? op.params.feed   : 800;
    const spd  = op && op.params && op.params.speed? op.params.speed  : 3000;
    const ae   = op && op.params && op.params.ae   ? op.params.ae     : 12;
    const ap   = op && op.params && op.params.ap   ? op.params.ap     : 2;

    return `
      <div class="sidebar-label" style="margin-bottom:14px">Planfräsen</div>
      <div class="sidebar-label">Werkzeug</div>
      <div class="param-grid">
        <div class="form-group">
          <label class="form-label">Durchmesser</label>
          <div class="form-control-unit"><input type="number" id="op-tool-dia" value="${dia}" min="1"><span class="unit-badge">mm</span></div>
        </div>
        <div class="form-group">
          <label class="form-label">Länge</label>
          <div class="form-control-unit"><input type="number" id="op-tool-len" value="${len}" min="1"><span class="unit-badge">mm</span></div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="sidebar-label">Schnittparameter</div>
      <div class="param-grid">
        <div class="form-group">
          <label class="form-label">Vorschub</label>
          <div class="form-control-unit"><input type="number" id="op-feed" value="${feed}" min="1"><span class="unit-badge">mm/m</span></div>
        </div>
        <div class="form-group">
          <label class="form-label">Drehzahl</label>
          <div class="form-control-unit"><input type="number" id="op-speed" value="${spd}" min="1"><span class="unit-badge">RPM</span></div>
        </div>
        <div class="form-group">
          <label class="form-label">Seitl. Zust. ae</label>
          <div class="form-control-unit"><input type="number" id="op-ae" value="${ae}" min="0.1" step="0.1"><span class="unit-badge">mm</span></div>
        </div>
        <div class="form-group">
          <label class="form-label">Tiefenzust. ap</label>
          <div class="form-control-unit"><input type="number" id="op-ap" value="${ap}" min="0.1" step="0.1"><span class="unit-badge">mm</span></div>
        </div>
      </div>
      <div class="divider"></div>
      <button class="btn btn-primary btn-full" id="btn-calc-toolpath">Werkzeugweg berechnen</button>
    `;
  }

  return { addOperation, getAll, generateFaceMilling, renderPanel, showToolpath, hideAllToolpaths };
})();
