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

    // Custom CNC axes: X=red(right), Y=green(back), Z=blue(up)
    function axisLine(x,y,z,color) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(x,y,z)]);
      return new THREE.Line(g, new THREE.LineBasicMaterial({color}));
    }
    scene.add(axisLine(70,0,0,0xff3b30)); // X red
    scene.add(axisLine(0,70,0,0x00c48c)); // Y green
    scene.add(axisLine(0,0,70,0x0057ff)); // Z blue

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
