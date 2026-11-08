export function createFinale(T) {
  const scene = new T.Scene();
  scene.background = new T.Color('#07131e');
  scene.fog = new T.FogExp2('#07131e', .035);
  const steel = new T.MeshStandardMaterial({ color: '#263746', roughness: .65, metalness: .3 });
  const trim = new T.MeshStandardMaterial({ color: '#456073', roughness: .42, metalness: .5 });
  const blue = new T.MeshStandardMaterial({ color: '#3298c1', emissive: '#42d8ff', emissiveIntensity: .7 });
  function mesh(geometry, material, x, y, z) {
    const object = new T.Mesh(geometry, material);
    object.position.set(x, y, z);
    scene.add(object);
    return object;
  }
  function box(material, w, h, d, x, y, z) {
    return mesh(new T.BoxGeometry(w, h, d), material, x, y, z);
  }
  const spawn = new T.Vector3(0, 0, 3.55);
  const consolePoint = { position: new T.Vector3(0, 1, -.75) };
  box(steel, 12, .2, 15, 0, -.1, .5);
  box(steel, 12, 6, .25, 0, 3, -7);
  for (const side of [-1, 1]) {
    box(steel, .24, 6, 14, side * 6, 3, 0);
    box(blue, .065, .012, 11, side * 2.65, .012, -.6);
    for (let z = -6; z < 6; z += 2.4) {
      box(trim, .48, 5.3, .42, side * 5.7, 2.65, z);
      box(blue, .04, 3.6, .045, side * 5.43, 2.6, z);
    }
  }
  for (const x of [-1.22, 1.22]) box(trim, .2, 2.8, .3, x, 1.4, 5.1);
  box(blue, 2.55, .1, .3, 0, 2.8, 5.1);
  box(blue, 2.2, .025, .45, 0, .015, 4.9);

  mesh(new T.CylinderGeometry(2.2, 2.45, .38, 48), trim, 0, .19, -3.8);
  const coreMaterial = blue.clone();
  coreMaterial.emissiveIntensity = .18;
  coreMaterial.roughness = .28;
  const core = mesh(new T.SphereGeometry(.84, 64, 40), coreMaterial, 0, 2.45, -3.8);
  const rings = [1.24, 1.52, 1.81].map((radius, index) => {
    const ring = mesh(new T.TorusGeometry(radius, .048, 12, 112), trim, 0, 2.45, -3.8);
    ring.rotation.set(index * .56, index * .76, 0);
    return ring;
  });
  box(trim, 3.18, .12, .8, 0, .06, -1.12);
  box(steel, 3.25, .66, .85, 0, .45, -1.12);
  box(trim, 3.32, .055, .88, 0, .79, -1.12);
  box(blue, 2.85, .023, .021, 0, .71, -.687);
  const slots = [-1.02, 0, 1.02].map(x => {
    const lamp = blue.clone();
    lamp.emissiveIntensity = .08;
    box(steel, .78, .075, .66, x, .845, -1.08);
    for (const side of [-1, 1]) box(trim, .047, .055, .55, x + side * .32, .9, -1.08);
    box(lamp, .53, .055, .07, x, .89, -.78);
    const conduit = box(blue.clone(), .055, .025, 2.4, x, .018, -1.31);
    conduit.scale.z = .12;
    conduit.material.emissiveIntensity = .12;
    return { x, lamp, conduit };
  });
  scene.add(new T.HemisphereLight('#bddbff', '#15202c', 1.45));
  const key = new T.DirectionalLight('#a5d4ff', 2.1);
  key.position.set(3, 6, 4);
  scene.add(key);
  const coreLight = new T.PointLight('#39caff', 3, 10);
  coreLight.position.copy(core.position);
  scene.add(coreLight);

  let inserted = 0, activation = 0;
  function insertAll(battery, collected, reducedMotion) {
    if (inserted || collected < slots.length) return false;
    for (const { x, lamp } of slots) {
      lamp.emissiveIntensity = 1.7;
      const installed = battery.clone();
      installed.position.set(x, .93, -1.08);
      installed.rotation.set(0, 0, 0);
      installed.scale.setScalar(.7);
      installed.visible = true;
      scene.add(installed);
    }
    inserted = slots.length;
    if (reducedMotion) update(1.4, true);
    return true;
  }
  function update(dt, reducedMotion) {
    if (inserted < slots.length) return;
    activation = Math.min(1.4, activation + dt);
    const strength = T.MathUtils.smoothstep(activation, .2, 1.4);
    for (const { conduit } of slots) {
      conduit.scale.z = .12 + .88 * strength;
      conduit.position.z = -1.16 - 1.2 * conduit.scale.z;
      conduit.material.emissiveIntensity = .12 + 2.2 * strength;
    }
    coreMaterial.emissiveIntensity = .18 + 1.65 * strength;
    coreLight.intensity = 3 + 29 * strength;
    if (!reducedMotion) {
      core.rotation.y += dt * .48;
      rings.forEach((ring, index) => {
        const speed = [.55, -.83, 1.12][index] * strength;
        ring.rotation.y += dt * speed;
        ring.rotation.x += dt * speed * .47;
      });
    }
  }
  function ground(x, z) {
    if (Math.abs(x) > 5.5 || z < -6.6 || z > 5.35) return;
    if (z < -.58 && z > -1.68 && Math.abs(x) < 1.8) return;
    if (Math.hypot(x, z + 3.8) < 2.43) return;
    return 0;
  }
  return { scene, spawn, consolePoint, ground, insertAll, update,
    get inserted() { return inserted; }, get active() { return activation >= 1.4; } };
}

export function createParticleFigure(T, scene, player, reforming = false) {
  player.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(player, true);
  const height = bounds.max.y - bounds.min.y;
  const plane = new T.Plane(new T.Vector3(0, 1, 0), -bounds.min.y);
  const sourceMaterials = new Map();
  const samples = [];
  const vertex = new T.Vector3();

  player.traverse(mesh => {
    if (!mesh.isMesh) return;
    sourceMaterials.set(mesh, mesh.material);
    const clip = material => {
      const copy = material.clone();
      copy.clippingPlanes = [plane];
      return copy;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clip) : clip(mesh.material);
    const count = mesh.geometry.attributes.position.count;
    for (let i = 0; i < Math.min(650, count); i++) {
      mesh.getVertexPosition(Math.floor(Math.random() * count), vertex);
      vertex.applyMatrix4(mesh.matrixWorld);
      samples.push({
        x: vertex.x,
        y: vertex.y,
        z: vertex.z,
        phase: T.MathUtils.clamp((vertex.y - bounds.min.y) / height, 0, 1) * .72,
        length: .07 + Math.random() * .25,
        drift: (Math.random() - .5) * .85
      });
    }
  });

  const coordinates = new Float32Array(samples.length * 6);
  const geometry = new T.BufferGeometry();
  const positions = new T.BufferAttribute(coordinates, 3).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('position', positions);
  const material = new T.LineBasicMaterial({
    color: '#a5edff', transparent: true, depthWrite: false, blending: T.AdditiveBlending
  });
  const particles = new T.LineSegments(geometry, material);
  particles.frustumCulled = false;
  scene.add(particles);
  return {
    update(progress) {
      const cut = reforming ? progress * 1.01 : Math.min(1.01, progress / .72);
      plane.constant = -bounds.min.y - height * cut;
      material.opacity = reforming ? .94 : 1 - T.MathUtils.smoothstep(progress, .72, 1);
      samples.forEach(({ x, y, z, phase, length, drift }, index) => {
        const age = reforming ? cut - phase / .72 : progress - phase;
        const lift = y + Math.max(0, age) * (reforming ? .09 : 1.65);
        const side = x + drift * Math.max(0, age) * (reforming ? .14 : 1);
        const lineLength = reforming
          ? length * .65 * T.MathUtils.smoothstep(age, 0, .09)
          : (age > 0 ? length : 0);
        coordinates.set([side, lift, z, side, lift + lineLength, z], index * 6);
      });
      positions.needsUpdate = true;
    },
    dispose() {
      particles.removeFromParent();
      geometry.dispose();
      material.dispose();
      for (const [mesh, original] of sourceMaterials) {
        for (const copy of [mesh.material].flat()) copy.dispose();
        mesh.material = original;
      }
    }
  };
}
