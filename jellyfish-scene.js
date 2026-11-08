const crossing = [
  [0, -2.4], [-1.1, -5.1], [.35, -8], [1.2, -10.9], [0, -13.5],
  [2.7, -3.8], [-3.6, -6.6], [-2.5, -9.5], [3.9, -9.2], [2.8, -13.4]
];
const nearEdge = [0, .2];
const farEdge = [0, -16.2];
const jumpRange = 3.8;

export function checkCrossing() {
  const points = [nearEdge, ...crossing, farEdge];
  const reached = new Set([farEdge]);
  for (const point of reached) {
    for (const other of points) {
      if (Math.hypot(point[0] - other[0], point[1] - other[1]) <= jumpRange) reached.add(other);
    }
  }
  return points.every(point => reached.has(point));
}

export function createJellyfishLake(T, Reflector) {
  const scene = new T.Scene();
  scene.background = new T.Color('#061920');
  scene.fog = new T.FogExp2('#09262e', .052);
  scene.add(new T.HemisphereLight('#a0e7ff', '#233d2e', 1.5));
  const skylight = new T.DirectionalLight('#75d7ff', 2);
  skylight.position.set(-5, 10, -6);
  scene.add(skylight);

  function mesh(geometry, material, parent, x, y, z) {
    const object = new T.Mesh(geometry, material);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }

  const waterY = -.47;
  const waterTime = { value: 0 };
  const pools = crossing.map(([x, z]) => new T.Vector3(x, z, .2));
  const water = new Reflector(new T.PlaneGeometry(26, 23), {
    textureWidth: 768,
    textureHeight: 512,
    shader: {
      uniforms: {
        ...Reflector.ReflectorShader.uniforms,
        uTime: waterTime,
        uPools: { value: pools }
      },
      vertexShader: `
        uniform mat4 textureMatrix;
        varying vec4 reflectionUV;
        varying vec3 worldPosition;
        void main() {
          reflectionUV = textureMatrix * vec4(position, 1.);
          worldPosition = (modelMatrix * vec4(position, 1.)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        }`,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform vec3 uPools[10];
        varying vec4 reflectionUV;
        varying vec3 worldPosition;

        vec2 wave(vec2 p, vec2 direction, float frequency, float speed, float steepness) {
          return direction * cos(dot(p, direction) * frequency - uTime * speed) * steepness;
        }

        void main() {
          vec2 p = worldPosition.xz;
          vec2 slope = wave(p, vec2(.31, .95), 3.4, 1.55, .082);
          slope += wave(p, vec2(-.77, .64), 6.6, 1.13, .048);
          slope += wave(p, vec2(.91, .41), 11.2, 2.1, .026);
          slope += wave(p, vec2(-.45, .89), 22.3, 3.4, .017);
          vec3 view = normalize(cameraPosition - worldPosition);
          vec3 normal = normalize(vec3(-slope.x, 1., -slope.y));
          float facing = clamp(dot(normal, view), 0., 1.);
          float fresnel = .12 + .82 * pow(1. - facing, 3.);
          vec2 uv = reflectionUV.xy / reflectionUV.w + slope * (.085 + .04 * (1. - facing));
          vec3 reflected = texture2D(tDiffuse, clamp(uv, .002, .998)).rgb;
          vec3 color = mix(vec3(.006, .031, .036), reflected * vec3(.76, .94, 1.), fresnel);

          vec3 light = normalize(vec3(-.38, .5, -.78));
          float sheen = pow(max(dot(normal, normalize(light + view)), 0.), 72.);
          color += sheen * vec3(.024, .1, .13);

          for (int i = 0; i < 10; i++) {
            vec2 delta = p - uPools[i].xy;
            float distance = length(delta);
            float glow = exp(-distance * 1.65) * (.35 + sheen * .65);
            color += glow * uPools[i].z * vec3(.025, .28, .38);
          }
          gl_FragColor = vec4(color, mix(.56, .96, fresnel));
        }`
    }
  });
  water.material.transparent = true;
  water.material.uniforms.uTime = waterTime;
  water.material.uniforms.uPools.value = pools;
  water.position.set(0, waterY, -8);
  water.rotation.x = -Math.PI / 2;
  water.renderOrder = 1;
  scene.add(water);

  const stone = new T.MeshStandardMaterial({ color: '#172c2c', roughness: .97, flatShading: true });
  const moss = new T.MeshStandardMaterial({ color: '#34472b', roughness: 1, vertexColors: true });
  const loader = new T.TextureLoader();
  function map(material, name, repeat) {
    const texture = loader.load(new URL('./cave-assets/' + name + '-diff.jpg', import.meta.url).href);
    texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.repeat.set(...repeat);
    material.map = texture;
    material.needsUpdate = true;
  }
  map(stone, 'mossy_rock', [1, 1]);
  stone.normalMap = loader.load(new URL('./cave-assets/mossy_rock-nor_gl.jpg', import.meta.url).href);
  stone.normalMap.wrapS = stone.normalMap.wrapT = T.RepeatWrapping;
  stone.normalScale.set(1.1, 1.1);
  map(moss, 'short_grass', [11, 6]);
  stone.color.set('#4e6a62');
  moss.color.set('#738e52');
  const rockGeometry = new T.IcosahedronGeometry(1, 2);
  const random = T.MathUtils.seededRandom;
  random(818);
  function rock(x, y, z, width, height, depth) {
    const object = mesh(rockGeometry, stone, scene, x, y, z);
    object.scale.set(width, height, depth);
    object.rotation.set(random() * .4, random() * Math.PI, random() * .4);
  }

  function bankHeight(x, z) {
    return .045 * Math.sin(x * 1.1 + z) + .025 * Math.cos(z * 2);
  }

  for (const [edge, outer] of [[0, 8], [-16, -23]]) {
    const geometry = new T.PlaneGeometry(14, Math.abs(outer - edge), 38, 20).rotateX(-Math.PI / 2);
    geometry.translate(0, 0, (edge + outer) / 2);
    const positions = geometry.attributes.position;
    const colors = [];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      positions.setY(i, bankHeight(x, z));
      const shade = .44 + random() * .56;
      colors.push(shade * .8, shade, shade * .7);
    }
    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    mesh(geometry, moss, scene, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const x = random() * 13 - 6.5;
      rock(x, -.29, edge + (random() - .5) * .55, .24 + random() * .55, .24, .28 + random() * .36);
    }
  }

  // A continuous, uneven vault closes the silhouette above the lake.
  const vault = new T.PlaneGeometry(1, 1, 64, 72);
  const vaultPoints = vault.attributes.position;
  const vaultUV = vault.attributes.uv;
  for (let i = 0; i < vaultPoints.count; i++) {
    const angle = vaultUV.getX(i) * Math.PI;
    const z = -25 + vaultUV.getY(i) * 36;
    const relief = .45 * Math.sin(angle * 11 + z * .68)
      + .31 * Math.sin(angle * 21 - z * 1.41) + .19 * Math.cos(angle * 39 + z * 2.4);
    const width = 7.25 + .57 * Math.sin(z * .34) + relief;
    const height = 6.35 + .82 * Math.cos(z * .25) + relief;
    vaultPoints.setXYZ(i, Math.cos(angle) * width, Math.sin(angle) * height - .84, z);
    vaultUV.setXY(i, angle * 2.3, z * .38);
  }
  vault.computeVertexNormals();
  const vaultStone = stone.clone();
  vaultStone.side = T.DoubleSide;
  vaultStone.flatShading = false;
  mesh(vault, vaultStone, scene, 0, 0, 0);

  const rockLight = new T.PointLight('#559eb4', 58, 13, 2);
  rockLight.position.set(-3.8, 4, -5.6);
  scene.add(rockLight);
  const farFill = new T.PointLight('#367c90', 39, 12, 2);
  farFill.position.set(3.2, 3.5, -13);
  scene.add(farFill);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 18; i++) {
      const z = 7 - i * 1.7 + random() * .6;
      rock(side * (6.3 + random() * .9), -.1 + random() * 1.25, z,
        .8 + random() * 1.05, .7 + random() * 2.6, .7 + random() * 1.05);
    }
    for (let i = 0; i < 9; i++) {
      const z = 4 - i * 2.6 + random();
      const x = side * (2.6 + random() * 2.1);
      rock(x, 4.2 + random() * .9, z, .24 + random() * .5, 1 + random() * 1.35, .4 + random() * .46);
    }
    const vineMaterial = new T.MeshStandardMaterial({ color: '#3d5838', roughness: 1 });
    for (let i = 0; i < 16; i++) {
      const x = side * (1.8 + random() * 3.8), z = 2.5 + random() * 1.5;
      const length = .3 + random() * 1.85;
      const vine = new T.CatmullRomCurve3([
        new T.Vector3(x, 4.9, z),
        new T.Vector3(x + .11, 4.9 - length * .6, z + .08),
        new T.Vector3(x - .09, 4.9 - length, z)
      ]);
      mesh(new T.TubeGeometry(vine, 6, .024, 4, false), vineMaterial, scene, 0, 0, 0);
    }
  }
  for (let i = 0; i < 12; i++) rock(i - 5.5, 4, -23, 1.8, 5, 1.9);

  const amber = new T.MeshBasicMaterial({ color: new T.Color(1.8, .95, .32) });
  for (const x of [-1.6, 1.6]) {
    rock(x, .22, -17.4, .22, .55, .25);
    mesh(new T.OctahedronGeometry(.13), amber, scene, x, .68, -17.4);
    const light = new T.PointLight('#ffbc69', 6, 4);
    light.position.set(x, .73, -17.4);
    scene.add(light);
  }

  function ring(radius, thickness, color, opacity, parent, x, y, z) {
    const material = new T.MeshBasicMaterial({
      color, opacity, transparent: true, depthWrite: false, side: T.DoubleSide,
      blending: T.AdditiveBlending
    });
    const object = mesh(new T.RingGeometry(radius - thickness, radius, 56), material, parent, x, y, z);
    object.rotation.x = -Math.PI / 2;
    object.renderOrder = 3;
    return object;
  }

  const tentacleMaterial = new T.MeshBasicMaterial({
    color: '#4cc5df', transparent: true, opacity: .46, depthWrite: false
  });
  const jellyfish = crossing.map(([x, z], index) => {
    const radius = .74 + random() * .25;
    const root = new T.Group();
    root.position.set(x, -.15, z);
    scene.add(root);
    const bellHeight = .37 + radius * .12;
    const bellGeometry = new T.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI * .65);
    const bell = mesh(bellGeometry, new T.MeshPhysicalMaterial({
      color: '#4ac7eb', emissive: '#1c9ece', emissiveIntensity: .36,
      roughness: .28, transparent: true, opacity: .63, depthWrite: false, side: T.DoubleSide
    }), root, 0, 0, 0);
    bell.scale.set(radius, bellHeight, radius);
    bell.renderOrder = 2;
    const rim = ring(radius * .9, .025, '#69e9ff', .64, root, 0, -bellHeight * .44, 0);
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2 + .45;
      ring(.12, .018, '#9aefff', .62, root, Math.cos(angle) * .23, bellHeight + .013, Math.sin(angle) * .23);
    }

    const tentacles = new T.Group();
    root.add(tentacles);
    for (let i = 0; i < 15; i++) {
      const angle = i * 2.39996, spread = radius * (.33 + random() * .5);
      const x = Math.cos(angle) * spread, z = Math.sin(angle) * spread;
      const length = .55 + random() * .93;
      const curve = new T.CatmullRomCurve3([
        new T.Vector3(x, -.1, z),
        new T.Vector3(x * .83 + .08, -length * .42, z * .9),
        new T.Vector3(x * .7 - .06, -length * .78, z * .72),
        new T.Vector3(x * .66 + .06, -length, z * .6)
      ]);
      mesh(new T.TubeGeometry(curve, 10, i < 4 ? .032 : .013, 4, false), tentacleMaterial, tentacles, 0, 0, 0);
    }
    const halo = ring(radius * 1.15, .035, '#b3f5ff', 0, root, 0, bellHeight + .03, 0);
    const ripple = ring(1, .025, '#6ae9ff', 0, scene, x, waterY + .012, z);
    return { x, z, root, bellHeight, bell, rim, tentacles, halo, ripple, glow: 0, landedAt: -10, index };
  });

  const shore = { x: farEdge[0], z: farEdge[1], halo: ring(.46, .035, '#ffd28c', .42, scene, 0, .08, farEdge[1]) };
  const targets = [...jellyfish, shore];
  let standing, flight, selected, arrived = false;

  function height(target) {
    return target === shore ? bankHeight(target.x, target.z) : target.root.position.y + target.bellHeight;
  }

  function findTarget(player) {
    if (arrived) return;
    let best, score = Math.cos(T.MathUtils.degToRad(35));
    const facingX = Math.sin(player.rotation.y), facingZ = Math.cos(player.rotation.y);
    for (const target of targets) {
      if (target === standing) continue;
      const dx = target.x - player.position.x, dz = target.z - player.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < .01 || distance > jumpRange) continue;
      const alignment = (dx * facingX + dz * facingZ) / distance;
      if (alignment >= score) {
        best = target;
        score = alignment;
      }
    }
    return best;
  }

  function jump(player, direction) {
    if (flight) return;
    if (direction.lengthSq()) player.rotation.y = Math.atan2(direction.x, direction.y);
    const target = findTarget(player);
    if (!target) return false;
    flight = { target, from: player.position.clone(), elapsed: 0 };
    standing = undefined;
    return true;
  }

  function update(player, direction, dt, time, walkingSpeed, reducedMotion) {
    waterTime.value = time;
    for (const fish of jellyfish) {
      fish.root.position.y = -.15 + (reducedMotion ? 0 : Math.sin(time * 1.5 + fish.index * 1.17) * .048);
      fish.tentacles.rotation.z = reducedMotion ? 0 : Math.sin(time * 1.25 + fish.index) * .075;
    }

    let speed = 0;
    if (flight) {
      const { target, from } = flight;
      flight.elapsed += dt;
      const progress = Math.min(1, flight.elapsed / .54);
      player.position.set(T.MathUtils.lerp(from.x, target.x, progress),
        T.MathUtils.lerp(from.y, height(target), progress) + Math.sin(Math.PI * progress) * .88,
        T.MathUtils.lerp(from.z, target.z, progress));
      player.rotation.y = Math.atan2(target.x - from.x, target.z - from.z);
      if (progress === 1) {
        if (target === shore) arrived = true;
        else {
          standing = target;
          standing.landedAt = time;
          standing.glow = 1;
        }
        flight = undefined;
      }
    } else {
      if (direction.lengthSq()) player.rotation.y = Math.atan2(direction.x, direction.y);
      if (standing) {
        player.position.y = height(standing);
      } else {
        const { x, z } = player.position;
        const onFarBank = z <= -16;
        player.position.x = T.MathUtils.clamp(x + direction.x * walkingSpeed * dt, -5.35, 5.35);
        player.position.z = T.MathUtils.clamp(z + direction.y * walkingSpeed * dt,
          onFarBank ? -21 : .2, onFarBank ? -16.2 : 6);
        player.position.y = bankHeight(player.position.x, player.position.z);
        speed = Math.hypot(player.position.x - x, player.position.z - z) / Math.max(dt, .001);
      }
    }

    selected = flight ? flight.target : findTarget(player);
    for (const fish of jellyfish) {
      fish.glow = T.MathUtils.damp(fish.glow, fish === standing ? .73 : 0, 3.4, dt);
      fish.bell.material.emissiveIntensity = .36 + fish.glow * 2.1;
      fish.rim.material.opacity = .64 + fish.glow * .36;
      fish.halo.material.opacity = fish === selected ? .9 : 0;
      pools[fish.index].z = .2 + fish.glow * .7;
      const ripple = T.MathUtils.clamp((time - fish.landedAt) / 1.05, 0, 1);
      fish.ripple.scale.setScalar(.64 + ripple * 1.45);
      fish.ripple.material.opacity = (1 - ripple) * .86;
    }
    shore.halo.material.opacity = arrived ? 0 : selected === shore ? .94 : .42;
    return { speed, selected: Boolean(selected), jumping: Boolean(flight), arrived };
  }

  return { scene, jump, update, spawn: new T.Vector3(0, bankHeight(0, 4.1), 4.1) };
}
