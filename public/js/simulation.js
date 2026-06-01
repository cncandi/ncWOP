// simulation.js — Toolpath animation

const Simulation = (() => {
  let toolMesh = null;
  let pathPoints = [];
  let currentIndex = 0;
  let animFrame = null;
  let running = false;
  let speed = 3;

  function init(points, toolDiameter, toolLength) {
    stop();
    pathPoints = points;
    currentIndex = 0;

    if (toolMesh) Viewer.remove(toolMesh);

    const toolR = toolDiameter / 2;
    const geo = new THREE.CylinderGeometry(toolR, toolR, toolLength, 32);
    const mat = new THREE.MeshPhongMaterial({ color: 0xffb300, transparent: true, opacity: 0.85 });
    toolMesh = new THREE.Mesh(geo, mat);

    const shankGeo = new THREE.CylinderGeometry(toolR * 0.6, toolR * 0.6, toolLength * 0.6, 16);
    const shankMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const shank = new THREE.Mesh(shankGeo, shankMat);
    shank.position.y = toolLength * 0.8;
    toolMesh.add(shank);

    if (pathPoints.length > 0) moveToolTo(0);
    Viewer.add(toolMesh);
    updateProgress();
  }

  function moveToolTo(index) {
    if (!toolMesh || pathPoints.length === 0) return;
    currentIndex = Math.max(0, Math.min(index, pathPoints.length - 1));
    const p = pathPoints[currentIndex];
    const h = toolMesh.geometry.parameters.height || 60;
    toolMesh.position.set(p.x, p.y + h / 2, p.z);
    updateProgress();
  }

  function play() {
    if (!toolMesh || pathPoints.length === 0) return;
    if (currentIndex >= pathPoints.length - 1) currentIndex = 0;
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
    moveToolTo(0);
  }

  function toStart() {
    pause();
    moveToolTo(0);
    updateButtons();
  }

  function toEnd() {
    pause();
    moveToolTo(pathPoints.length - 1);
    updateButtons();
  }

  function stepForward() {
    pause();
    moveToolTo(currentIndex + Math.max(1, Math.floor(pathPoints.length / 100)));
    updateButtons();
  }

  function stepBackward() {
    pause();
    moveToolTo(currentIndex - Math.max(1, Math.floor(pathPoints.length / 100)));
    updateButtons();
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
    moveToolTo(currentIndex);
    animFrame = requestAnimationFrame(animate);
  }

  function setSpeed(val) { speed = val; }

  function updateButtons() {
    const btn = document.getElementById('btn-sim-play');
    if (btn) btn.innerHTML = running ? '⏸' : '▶';
  }

  function updateProgress() {
    const bar = document.getElementById('sim-progress');
    if (bar && pathPoints.length > 1) {
      bar.style.width = ((currentIndex / (pathPoints.length - 1)) * 100) + '%';
    }
  }

  function isRunning() { return running; }
  function isDone() { return currentIndex >= pathPoints.length - 1; }

  return { init, play, pause, stop, toStart, toEnd, stepForward, stepBackward, setSpeed, isRunning, isDone };
})();
