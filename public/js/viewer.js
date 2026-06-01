const Viewer = (() => {
  let scene, camera, renderer, controls;
  function init() {
    const canvas = document.getElementById('canvas');
    const vp = document.getElementById('viewport');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f2f5);
    camera = new THREE.PerspectiveCamera(45, vp.clientWidth / vp.clientHeight, 0.1, 10000);
    camera.position.set(200, 200, 300);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(vp.clientWidth, vp.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(300, 400, 200); dl.castShadow = true; scene.add(dl);
    scene.add(new THREE.GridHelper(500, 25, 0xd0d3db, 0xe2e4e9));
    scene.add(new THREE.AxesHelper(60));
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    window.addEventListener('resize', () => {
      camera.aspect = vp.clientWidth / vp.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(vp.clientWidth, vp.clientHeight);
    });
    (function loop() { requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); })();
  }
  function add(o) { scene.add(o); }
  function remove(o) { scene.remove(o); }
  function setView(v) {
    if (v==='top') camera.position.set(0,350,0.01);
    else if (v==='iso') camera.position.set(200,200,300);
    else camera.position.set(0,50,350);
    controls.target.set(0,0,0); controls.update();
  }
  return { init, add, remove, setView };
})();
