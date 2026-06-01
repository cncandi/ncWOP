// simulation.js — Toolpath animation

const Simulation = (() => {
  let toolMesh = null;
  let pathPoints = [];
  let currentIndex = 0;
  let animFrame = null;
  let running = false;
  let speed = 2; // points per frame

  function init(points, toolDiameter, toolLength) {
    stop();
    pathPoints = points;
    currentIndex = 0;

    // Remove old tool
    if (toolMesh) Viewer.remove(toolMesh);

    const toolR = toolDiameter / 2;
    const geo = new THREE.CylinderGeometry(toolR, toolR, toolLength, 32);
    const mat = new THREE.MeshPhongMaterial({ color: 0xffb300, transparent: true, opacity: 0.85 });
    toolMesh = new THREE.Mesh(geo, mat);

    // Add shank
    const shankGeo = new THREE.CylinderGeometry(toolR * 0.6, toolR * 0.6, toolLength * 0.6, 16);
    const shankMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const shank = new THREE.Mesh(shankGeo, shankMat);
    shank.position.y = toolLength * 0.8;
    toolMesh.add(shank);

    if (pathPoints.length > 0) {
      const p = pathPoints[0];
      toolMesh.position.set(p.x, p.y + toolLength / 2, p.z);
    }

    Viewer.add(toolMesh);
  }

  function play() {
    if (!toolMesh || pathPoints.length === 0) return;
    running = true;
    animate();
  }

  function pause() {
    running = false;
    if (animFrame) cancelAnimationFrame(animFrame);
  }

  function stop() {
    running = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    currentIndex = 0;
    if (toolMesh && pathPoints.length > 0) {
      const p = pathPoints[0];
      toolMesh.position.set(p.x, p.y + (toolMesh.geometry.parameters.height || 60) / 2, p.z);
    }
  }

  function animate() {
    if (!running) return;

    for (let i = 0; i < speed; i++) {
      if (currentIndex >= pathPoints.length - 1) {
        running = false;
        updateButtons();
        return;
      }
      currentIndex++;
    }

    const p = pathPoints[currentIndex];
    const h = toolMesh.geometry.parameters.height || 60;
    toolMesh.position.set(p.x, p.y + h / 2, p.z);

    updateProgress();
    animFrame = requestAnimationFrame(animate);
  }

  function setSpeed(val) { speed = val; }

  function updateButtons() {
    const btn = document.getElementById('btn-sim-play');
    if (btn) btn.textContent = currentIndex >= pathPoints.length - 1 ? '↺ Neu' : '▶ Play';
  }

  function updateProgress() {
    const bar = document.getElementById('sim-progress');
    if (bar) {
      bar.style.width = ((currentIndex / (pathPoints.length - 1)) * 100) + '%';
    }
  }

  function isRunning() { return running; }
  function isDone() { return currentIndex >= pathPoints.length - 1; }

  return { init, play, pause, stop, setSpeed, isRunning, isDone };
})();
