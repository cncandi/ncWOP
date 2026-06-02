const Viewer = (() => {
  let scene, camera, renderer, controls, root;

  function init() {
    const canvas = document.getElementById('canvas');
    const vp = document.getElementById('viewport');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f2f5);

    // Z-up convention (CNC)
    camera = new THREE.PerspectiveCamera(45, vp.clientWidth / vp.clientHeight, 0.1, 10000);
    camera.up.set(0, 0, 1);
    camera.position.set(250, -300, 250);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(vp.clientWidth, vp.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(300, -200, 400); dl.castShadow = true; scene.add(dl);

    // Grid in XY plane (Z up): rotate grid to lie flat on XY
    const grid = new THREE.GridHelper(500, 25, 0xd0d3db, 0xe2e4e9);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    // Axes: X=red, Y=green, Z=blue (Three.js default colors, now Z points up)
    const axes = new THREE.AxesHelper(60);
    scene.add(axes);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;

    window.addEventListener('resize', () => {
      camera.aspect = vp.clientWidth / vp.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(vp.clientWidth, vp.clientHeight);
    });

    (function loop(){ requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); })();
  }

  function add(o) { scene.add(o); }
  function remove(o) { scene.remove(o); }

  function setView(v) {
    if (v==='top')        camera.position.set(0, 0, 400);      // look down Z
    else if (v==='iso')   camera.position.set(250, -300, 250);
    else /* front */      camera.position.set(0, -400, 50);    // look along Y
    controls.target.set(0,0,0); controls.update();
  }

  return { init, add, remove, setView };
})();
