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

  function generateFaceMilling(op, blankData, opIndex, existingStateIndex) {
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

    // Store op state in blank — update if recalculating, append if new
    const opStateIndex = Blank.addOpState(ap, existingStateIndex);

    // Init simulation
    Simulation.init(points, tool.diameter, tool.length);

    return { points, opStateIndex };
  }

  function addOperation(op) { ops.push(op); }
  function getAll() { return ops; }

  function renderPanel(opIndex) {
    const op = ops[opIndex];
    const p = op && op.params ? op.params : {};

    // Defaults
    const safeZ    = p.safeZ    ?? 50;
    const refZ     = p.refZ     ?? 0;
    const dir      = p.dir      ?? 'climb';

    // Schruppen
    const rEnabled = p.rEnabled ?? true;
    const rTool    = p.rTool    ?? 'T1 D16mm';
    const rMode    = p.rMode    ?? 'parallel';
    const rAp      = p.rAp     ?? 2;
    const rAe      = p.rAe     ?? 12;

    // Schlichten
    const fEnabled = p.fEnabled ?? true;
    const fTool    = p.fTool    ?? 'T1 D16mm';
    const fMode    = p.fMode    ?? 'traditional';
    const fAllowance = p.fAllowance ?? 0;

    // Kanten brechen
    const cEnabled = p.cEnabled ?? false;
    const cTool    = p.cTool    ?? 'T2 D16mm 45°';
    const cDepth   = p.cDepth   ?? 0.5;
    const cSteps   = p.cSteps   ?? 1;

    return `
      <div class="param-section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>
        Planfräsen
        <button class="btn btn-primary btn-sm" id="btn-calc-toolpath" style="margin-left:auto; gap:4px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Berechnen
        </button>
      </div>

      <!-- Allgemein -->
      <div class="param-group">
        <div class="param-group-header">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3"/></svg>
          &nbsp;Allgemein
        </div>
        <div class="param-row">
          <span class="param-row-label">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" style="margin-right:4px;vertical-align:middle"><path d="M12 2v20M8 18l4 4 4-4"/></svg>
            Safe Z
          </span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-safeZ" value="${safeZ}" min="0">
            <span class="unit-badge">mm</span>
          </div>
        </div>
        <div class="param-row">
          <span class="param-row-label">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="2.5" style="margin-right:4px;vertical-align:middle"><path d="M5 12h14"/></svg>
            Referenz Z
          </span>
          <div class="form-control-unit param-row-input">
            <input type="number" id="op-refZ" value="${refZ}">
            <span class="unit-badge">mm</span>
          </div>
        </div>
        <div class="param-row">
          <span class="param-row-label">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="2.5" style="margin-right:4px;vertical-align:middle"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            Fräsrichtung
          </span>
          <select id="op-dir" class="form-control" style="height:26px; font-size:12px; width:100px;">
            <option value="climb" ${dir==='climb'?'selected':''}>Gleichlauf</option>
            <option value="conventional" ${dir==='conventional'?'selected':''}>Gegenlauf</option>
            <option value="auto" ${dir==='auto'?'selected':''}>Auto</option>
          </select>
        </div>
      </div>

      <!-- Schruppen -->
      <div class="param-group">
        <div class="param-group-header param-group-header--collapsible" data-target="grp-roughing">
          <input type="checkbox" id="chk-roughing" ${rEnabled?'checked':''} style="margin-right:6px; accent-color:var(--accent);" onclick="event.stopPropagation()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          Schruppen
          <span class="grp-chevron" style="margin-left:auto;">▾</span>
        </div>
        <div id="grp-roughing">
          <div class="param-row">
            <span class="param-row-label">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" style="margin-right:4px;vertical-align:middle"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Werkzeug
            </span>
            <input type="text" id="op-r-tool" value="${rTool}" class="form-control" style="width:110px; height:26px; font-size:12px;">
          </div>
          <div class="param-row">
            <span class="param-row-label">Modus</span>
            <select id="op-r-mode" class="form-control" style="height:26px; font-size:12px; width:100px;">
              <option value="parallel" ${rMode==='parallel'?'selected':''}>Parallel</option>
              <option value="contour" ${rMode==='contour'?'selected':''}>Konturparallel</option>
              <option value="spiral" ${rMode==='spiral'?'selected':''}>Spiralförmig</option>
            </select>
          </div>
          <div class="param-row">
            <span class="param-row-label">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" style="margin-right:4px;vertical-align:middle"><path d="M12 2v20M8 18l4 4 4-4"/></svg>
              Tiefenzust. ap
            </span>
            <div class="form-control-unit param-row-input">
              <input type="number" id="op-ap" value="${rAp}" min="0.1" step="0.1">
              <span class="unit-badge">mm</span>
            </div>
          </div>
          <div class="param-row">
            <span class="param-row-label">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" style="margin-right:4px;vertical-align:middle"><path d="M2 12h20M18 8l4 4-4 4"/></svg>
              Seitl. Zust. ae
            </span>
            <div class="form-control-unit param-row-input">
              <input type="number" id="op-ae" value="${rAe}" min="0.1" step="0.1">
              <span class="unit-badge">mm</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Schlichten -->
      <div class="param-group">
        <div class="param-group-header param-group-header--collapsible" data-target="grp-finishing">
          <input type="checkbox" id="chk-finishing" ${fEnabled?'checked':''} style="margin-right:6px; accent-color:var(--accent);" onclick="event.stopPropagation()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Schlichten
          <span class="grp-chevron" style="margin-left:auto;">▾</span>
        </div>
        <div id="grp-finishing">
          <div class="param-row">
            <span class="param-row-label">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" style="margin-right:4px;vertical-align:middle"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Werkzeug
            </span>
            <input type="text" id="op-f-tool" value="${fTool}" class="form-control" style="width:110px; height:26px; font-size:12px;">
          </div>
          <div class="param-row">
            <span class="param-row-label">Modus</span>
            <select id="op-f-mode" class="form-control" style="height:26px; font-size:12px; width:100px;">
              <option value="traditional" ${fMode==='traditional'?'selected':''}>Traditional</option>
              <option value="climb" ${fMode==='climb'?'selected':''}>Gleichlauf</option>
            </select>
          </div>
          <div class="param-row">
            <span class="param-row-label">Aufmaß</span>
            <div class="form-control-unit param-row-input">
              <input type="number" id="op-f-allowance" value="${fAllowance}" min="0" step="0.1">
              <span class="unit-badge">mm</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Kanten brechen -->
      <div class="param-group">
        <div class="param-group-header param-group-header--collapsible" data-target="grp-chamfer">
          <input type="checkbox" id="chk-chamfer" ${cEnabled?'checked':''} style="margin-right:6px; accent-color:var(--accent);" onclick="event.stopPropagation()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:5px"><path d="M3 21l18-18M9 3h12v12"/></svg>
          Kanten brechen
          <span class="grp-chevron" style="margin-left:auto;">▾</span>
        </div>
        <div id="grp-chamfer">
          <div class="param-row">
            <span class="param-row-label">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" style="margin-right:4px;vertical-align:middle"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Werkzeug
            </span>
            <input type="text" id="op-c-tool" value="${cTool}" class="form-control" style="width:110px; height:26px; font-size:12px;">
          </div>
          <div class="param-row">
            <span class="param-row-label">Fasentiefe</span>
            <div class="form-control-unit param-row-input">
              <input type="number" id="op-c-depth" value="${cDepth}" min="0.1" step="0.1">
              <span class="unit-badge">mm</span>
            </div>
          </div>
          <div class="param-row">
            <span class="param-row-label">Anzahl Schritte</span>
            <div class="form-control-unit param-row-input">
              <input type="number" id="op-c-steps" value="${cSteps}" min="1" step="1">
              <span class="unit-badge"></span>
            </div>
          </div>
        </div>
      </div>


    `;
  }
  return { addOperation, getAll, generateFaceMilling, renderPanel, showToolpath, hideAllToolpaths };
})();
