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
    const safeZ= op && op.params && op.params.safeZ? op.params.safeZ  : 50;
    const refZ = op && op.params && op.params.refZ ? op.params.refZ   : 0;

    return `
      <div class="param-section-title">
        <span class="param-section-icon">◧</span> Planfräsen
      </div>

      <!-- Misc -->
      <div class="param-group">
        <div class="param-group-header">Allgemein</div>
        <div class="param-row">
          <span class="param-row-label">Safe Z</span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-safeZ" value="${safeZ}" min="0">
            <span class="unit-badge">mm</span>
          </div>
        </div>
        <div class="param-row">
          <span class="param-row-label">Referenz Z</span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-refZ" value="${refZ}">
            <span class="unit-badge">mm</span>
          </div>
        </div>
      </div>

      <!-- Tool -->
      <div class="param-group">
        <div class="param-group-header">
          <input type="checkbox" checked style="margin-right:6px; accent-color:var(--accent);">
          Werkzeug
        </div>
        <div class="param-row">
          <span class="param-row-label">Durchmesser</span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-tool-dia" value="${dia}" min="1">
            <span class="unit-badge">mm</span>
          </div>
        </div>
        <div class="param-row">
          <span class="param-row-label">Länge</span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-tool-len" value="${len}" min="1">
            <span class="unit-badge">mm</span>
          </div>
        </div>
      </div>

      <!-- Roughing -->
      <div class="param-group">
        <div class="param-group-header">
          <input type="checkbox" id="chk-roughing" checked style="margin-right:6px; accent-color:var(--accent);">
          Schruppen
        </div>
        <div class="param-row">
          <span class="param-row-label">Tiefenzust. ap</span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-ap" value="${ap}" min="0.1" step="0.1">
            <span class="unit-badge">mm</span>
          </div>
        </div>
        <div class="param-row">
          <span class="param-row-label">Seitl. Zust. ae</span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-ae" value="${ae}" min="0.1" step="0.1">
            <span class="unit-badge">mm</span>
          </div>
        </div>
        <div class="param-row">
          <span class="param-row-label">Vorschub</span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-feed" value="${feed}" min="1">
            <span class="unit-badge">mm/m</span>
          </div>
        </div>
        <div class="param-row">
          <span class="param-row-label">Drehzahl</span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-speed" value="${spd}" min="1">
            <span class="unit-badge">RPM</span>
          </div>
        </div>
      </div>

      <button class="btn btn-primary btn-full" id="btn-calc-toolpath" style="margin-top:4px;">
        Werkzeugweg berechnen
      </button>
    `;
  }

  return { addOperation, getAll, generateFaceMilling, renderPanel, showToolpath, hideAllToolpaths };
})();
