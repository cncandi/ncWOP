// viewer.js — Three.js scene setup

const Viewer = (() => {
  let scene, camera, renderer, controls;
  let gridHelper, axesHelper;

  function init() {
    const canvas = document.getElementById('three-canvas');
    const container = canvas.parentElement;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f5f7);

    // Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 10000);
    camera.position.set(200, 200, 300);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(300, 400, 200);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Grid
    gridHelper = new THREE.GridHelper(400, 20, 0xd0d3db, 0xe2e4e9);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Axes
    axesHelper = new THREE.AxesHelper(60);
    scene.add(axesHelper);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 50;
    controls.maxDistance = 2000;

    // Resize
    window.addEventListener('resize', onResize);

    animate();
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  function onResize() {
    const container = renderer.domElement.parentElement;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function setView(view) {
    const distance = 350;
    if (view === 'top') {
      camera.position.set(0, distance, 0.01);
    } else if (view === 'front') {
      camera.position.set(0, 50, distance);
    } else if (view === 'iso') {
      camera.position.set(200, 200, 300);
    }
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function add(object) { scene.add(object); }
  function remove(object) { scene.remove(object); }
  function getScene() { return scene; }

  return { init, add, remove, setView, getScene };
})();
