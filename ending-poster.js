export function setupEndingPoster(T, GLTFLoader, characterFile, model, idleClip) {
  const dialog = document.querySelector('#ending-poster');
  const canvas = dialog.querySelector('canvas');
  const message = dialog.querySelector('#poster-model-status');
  const stage = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 1, .1, 20);
  camera.position.set(0, 1.05, 4.2);
  camera.lookAt(0, .9, 0);
  stage.add(new T.HemisphereLight('#c3eaff', '#70637d', 2));
  const key = new T.DirectionalLight('#ffe1bd', 2.9);
  key.position.set(-3, 4, 4);
  stage.add(key);
  const rim = new T.DirectionalLight('#6bdbff', 3.5);
  rim.position.set(2, 3, -4);
  stage.add(rim);

  const turntable = new T.Group();
  stage.add(turntable);
  let renderer, loading, pointer, lastX;
  function draw() {
    if (!renderer || !dialog.open) return;
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.render(stage, camera);
  }
  new ResizeObserver(draw).observe(canvas);

  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    pointer = event.pointerId;
    lastX = event.clientX;
    canvas.setPointerCapture(pointer);
    canvas.focus();
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    turntable.rotation.y += (event.clientX - lastX) * .014;
    lastX = event.clientX;
    draw();
  });
  canvas.addEventListener('lostpointercapture', () => { pointer = undefined; });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    turntable.rotation.y += event.key === 'ArrowLeft' ? -.14 : .14;
    draw();
  });

  return {
    get open() { return dialog.open; },
    show() {
      dialog.showModal();
      if (loading) return draw();
      message.textContent = '正在加载角色…';
      loading = Promise.resolve().then(async () => {
        renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.toneMapping = T.ACESFilmicToneMapping;
        const { scene: portrait } = await new GLTFLoader().loadAsync('./' + characterFile);
        portrait.position.copy(model.position);
        portrait.scale.copy(model.scale);
        turntable.add(portrait);
        turntable.rotation.y = -.25;
        const mixer = new T.AnimationMixer(portrait);
        mixer.clipAction(idleClip).play();
        mixer.update(0);
        message.hidden = true;
        draw();
      }).catch(error => {
        message.textContent = '角色预览加载失败，请关闭后重试。';
        renderer?.dispose();
        renderer = undefined;
        loading = undefined;
        console.warn(error);
      });
    }
  };
}
