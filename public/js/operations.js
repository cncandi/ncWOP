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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        Planfräsen
      </div>

      <!-- Misc -->
      <div class="param-group">
        <div class="param-group-header">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
          &nbsp;Allgemein
        </div>
        <div class="param-row">
          <span class="param-row-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" style="margin-right:5px;vertical-align:middle"><path d="M12 2v20M2 12h20"/></svg>
            Safe Z
          </span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-safeZ" value="${safeZ}" min="0">
            <span class="unit-badge">mm</span>
          </div>
        </div>
        <div class="param-row">
          <span class="param-row-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="2.5" style="margin-right:5px;vertical-align:middle"><path d="M5 12h14"/></svg>
            Referenz Z
          </span>
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          Werkzeug
        </div>
        <div class="param-row">
          <span class="param-row-label">⌀ Durchmesser</span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-tool-dia" value="${dia}" min="1">
            <span class="unit-badge">mm</span>
          </div>
        </div>
        <div class="param-row">
          <span class="param-row-label">↕ Länge</span>
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          Schruppen
        </div>
        <div class="param-row">
          <span class="param-row-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" style="margin-right:4px;vertical-align:middle"><path d="M12 2v20M8 18l4 4 4-4"/></svg>
            Tiefenzust. ap
          </span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-ap" value="${ap}" min="0.1" step="0.1">
            <span class="unit-badge">mm</span>
          </div>
        </div>
        <div class="param-row">
          <span class="param-row-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" style="margin-right:4px;vertical-align:middle"><path d="M2 12h20M18 8l4 4-4 4"/></svg>
            Seitl. Zust. ae
          </span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-ae" value="${ae}" min="0.1" step="0.1">
            <span class="unit-badge">mm</span>
          </div>
        </div>
        <div class="param-row">
          <span class="param-row-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="2.5" style="margin-right:4px;vertical-align:middle"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            Vorschub
          </span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-feed" value="${feed}" min="1">
            <span class="unit-badge">mm/m</span>
          </div>
        </div>
        <div class="param-row">
          <span class="param-row-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="2.5" style="margin-right:4px;vertical-align:middle"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12"/></svg>
            Drehzahl
          </span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-speed" value="${spd}" min="1">
            <span class="unit-badge">RPM</span>
          </div>
        </div>
      </div>

      <div style="padding:12px 16px;">
        <button class="btn btn-primary btn-full" id="btn-calc-toolpath">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Werkzeugweg berechnen
        </button>
      </div>
    `;
  }

  return { addOperation, getAll, generateFaceMilling, renderPanel, showToolpath, hideAllToolpaths };
})();
