import { createObservatory, observatoryArchPoint, tunnelJoinDepth } from './observatory-scene.js';

export function createJellyfishLake(T, modelLoader, cave, originX, originZ, Reflector) {
  const lakeGroup = new T.Group();
  lakeGroup.position.set(originX, 0, originZ);
  cave.scene.add(lakeGroup);
  const rockLight = new T.PointLight('#8edaf3', 36, 12, 2);
  rockLight.position.set(1, 4, -2.5);
  lakeGroup.add(rockLight);

  function mesh(geometry, material, parent, x, y, z) {
    const object = new T.Mesh(geometry, material);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }

  const waterY = -.47;
  const waterTime = { value: 0 };
  const waterGlow = new T.Vector3(originX, originZ, 0);
  // Draw water in the main pass so it cannot change the active render target.
  const water = new T.Mesh(new T.PlaneGeometry(26, 16), new T.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: waterTime,
        uGlow: { value: waterGlow }
      },
      vertexShader: `
        varying vec3 worldPosition;
        void main() {
          worldPosition = (modelMatrix * vec4(position, 1.)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uGlow;
        varying vec3 worldPosition;

        vec2 wave(vec2 p, vec2 direction, float frequency, float speed, float steepness) {
          return direction * cos(dot(p, direction) * frequency - uTime * speed) * steepness;
        }

        void main() {
          vec2 p = worldPosition.xz;
          vec2 slope = wave(p, vec2(.31, .95), 3.4, 1.55, .082);
          slope += wave(p, vec2(-.77, .64), 6.6, 1.13, .048);
          slope += wave(p, vec2(.91, .41), 10.1, 1.7, .017);
          vec3 view = normalize(cameraPosition - worldPosition);
          vec3 normal = normalize(vec3(-slope.x, 1., -slope.y));
          float facing = clamp(dot(normal, view), 0., 1.);
          float fresnel = .12 + .82 * pow(1. - facing, 3.);
          vec3 reflected = mix(vec3(.014, .055, .068), vec3(.026, .083, .105),
            .5 + .5 * sin(p.x * .4 + slope.x * 2.));
          vec3 color = mix(vec3(.006, .031, .036), reflected, fresnel);

          vec3 light = normalize(vec3(-.38, .5, -.78));
          float sheen = pow(max(dot(normal, normalize(light + view)), 0.), 40.);
          color += sheen * vec3(.018, .07, .09);

          float glow = exp(-length(p - uGlow.xy) * .48) * (.38 + sheen * .62);
          color += glow * uGlow.z * vec3(.02, .36, .5);
          gl_FragColor = vec4(color, mix(.35, .77, fresnel));
          #include <colorspace_fragment>
        }`
  }));
  water.position.set(0, waterY, -8);
  water.rotation.x = -Math.PI / 2;
  water.renderOrder = 1;
  lakeGroup.add(water);

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
  const lakebed = new T.PlaneGeometry(20, 16, 24, 24).rotateX(-Math.PI / 2);
  const bedPoints = lakebed.attributes.position;
  for (let i = 0; i < bedPoints.count; i++) {
    const x = bedPoints.getX(i), z = bedPoints.getZ(i);
    const depth = .75 + 1.7 * Math.cos(z * Math.PI / 16);
    bedPoints.setY(i, -depth + .12 * Math.sin(x * 1.6 + z) * Math.cos(z * 1.4));
  }
  lakebed.computeVertexNormals();
  const bedMaterial = new T.MeshStandardMaterial({
    color: '#2b4d47', map: moss.map, roughness: 1, emissive: '#163b36', emissiveIntensity: .28
  });
  mesh(lakebed, bedMaterial, lakeGroup, 0, 0, -8);
  const rockGeometry = new T.IcosahedronGeometry(1, 2);
  const random = T.MathUtils.seededRandom;
  random(818);
  function rock(x, y, z, width, height, depth) {
    const object = mesh(rockGeometry, stone, lakeGroup, x, y, z);
    object.scale.set(width, height, depth);
    object.rotation.set(random() * .4, random() * Math.PI, random() * .4);
  }

  function bankHeight(x, z) {
    return .045 * Math.sin(x * 1.1 + z) + .025 * Math.cos(z * 2);
  }

  for (const [edge, outer] of [[0, 8], [-16, -23]]) {
    if (edge < 0) {
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
      mesh(geometry, moss, lakeGroup, 0, 0, 0);
    }
    for (let i = 0; i < 30; i++) {
      const x = random() * 13 - 6.5;
      rock(x, -.29, edge + (random() - .5) * .55, .24 + random() * .55, .24, .28 + random() * .36);
    }
  }

  // A continuous, uneven vault closes the silhouette above the lake.
  const vault = new T.PlaneGeometry(1, 1, 56, 72);
  const vaultPoints = vault.attributes.position;
  const vaultUV = vault.attributes.uv;
  const arch = new T.Vector2();
  const tunnelSection = new T.Vector2();
  for (let i = 0; i < vaultPoints.count; i++) {
    const angle = vaultUV.getX(i) * Math.PI;
    const z = -tunnelJoinDepth * (1 - vaultUV.getY(i));
    const relief = .45 * Math.sin(angle * 11 + z * .68)
      + .31 * Math.sin(angle * 21 - z * 1.41) + .19 * Math.cos(angle * 39 + z * 2.4);
    const width = 7.25 + .57 * Math.sin(z * .34) + relief;
    const height = 6.35 + .82 * Math.cos(z * .25) + relief;
    const blend = T.MathUtils.smoothstep(z, -4, 0);
    cave.archPoint(angle, z + originZ, arch);
    const tunnelBlend = T.MathUtils.smoothstep(-z, 19, tunnelJoinDepth);
    observatoryArchPoint(T, angle, -z, tunnelSection);
    const lakeX = T.MathUtils.lerp(Math.cos(angle) * width, arch.x - originX, blend);
    const lakeY = T.MathUtils.lerp(Math.sin(angle) * height - .84, arch.y, blend);
    vaultPoints.setXYZ(i, T.MathUtils.lerp(lakeX, tunnelSection.x, tunnelBlend),
      T.MathUtils.lerp(lakeY, tunnelSection.y, tunnelBlend), z);
    vaultUV.setXY(i, angle * 2.3, z * .38);
  }
  vault.computeVertexNormals();
  const vaultStone = stone.clone();
  vaultStone.side = T.DoubleSide;
  vaultStone.flatShading = false;
  const lakeVault = mesh(vault, vaultStone, lakeGroup, 0, 0, 0);

  const farFill = new T.PointLight('#367c90', 39, 12, 2);
  farFill.position.set(3.2, 3.5, -13);
  lakeGroup.add(farFill);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 15; i++) {
      const z = -.55 - i * 1.7 + random() * .6;
      rock(side * (6.3 + random() * .9), -.1 + random() * 1.25, z,
        .8 + random() * 1.05, .7 + random() * 2.6, .7 + random() * 1.05);
    }
    const vineMaterial = new T.MeshStandardMaterial({ color: '#3d5838', roughness: 1 });
    for (let i = 0; i < 16; i++) {
      const x = side * (1.8 + random() * 3.8), z = -.8 - random() * 1.5;
      const length = .3 + random() * 1.85;
      const vine = new T.CatmullRomCurve3([
        new T.Vector3(x, 4.9, z),
        new T.Vector3(x + .11, 4.9 - length * .6, z + .08),
        new T.Vector3(x - .09, 4.9 - length, z)
      ]);
      mesh(new T.TubeGeometry(vine, 6, .024, 4, false), vineMaterial, lakeGroup, 0, 0, 0);
    }
  }
  for (const side of [-1, 1]) {
    rock(side * 2.55, -.08, -22.6, .52, .31, .58);
    rock(side * 2.4, -.08, -24.1, .37, .24, .46);
  }
  const observatory = createObservatory(T, lakeGroup, stone, moss, originX, originZ, Reflector);
  const cameraObstacles = [lakeVault, ...lakeGroup.children.filter(object =>
    object.geometry === rockGeometry && object.position.z < -13), ...observatory.cameraObstacles];
  lakeGroup.updateWorldMatrix(true, true);

  const amber = new T.MeshBasicMaterial({ color: new T.Color(1.8, .95, .32) });
  for (const x of [-1.6, 1.6]) {
    rock(x, .22, -17.4, .22, .55, .25);
    mesh(new T.OctahedronGeometry(.13), amber, lakeGroup, x, .68, -17.4);
    const light = new T.PointLight('#ffbc69', 6, 4);
    light.position.set(x, .73, -17.4);
    lakeGroup.add(light);
  }

  const radius = 4.23;
  const midLake = -8;
  const deckY = .13;
  const centers = [-4, -12];
  const deckMaterial = new T.MeshStandardMaterial({
    color: '#39717b', map: stone.map, normalMap: stone.normalMap,
    normalScale: new T.Vector2(.32, .32), roughness: .8,
    emissive: '#1a505a', emissiveIntensity: .32, transparent: true, opacity: .79
  });

  function surfaceHeight(x, z) {
    if (z > -1.4) {
      return T.MathUtils.lerp(cave.groundHeight(x + originX, originZ), deckY,
        T.MathUtils.smoothstep(-z, 0, 1.4));
    }
    if (z < -14.6) {
      return T.MathUtils.lerp(bankHeight(x, -16), deckY, T.MathUtils.smoothstep(z, -16, -14.6));
    }
    return deckY;
  }

  for (const centerZ of centers) {
    const top = new T.CircleGeometry(radius, 96).rotateX(-Math.PI / 2);
    // Subdivide the disk radially so the banks can meet the deck on a slope.
    const surface = new T.PlaneGeometry(radius * 2, radius * 2, 48, 48).rotateX(-Math.PI / 2);
    const points = surface.attributes.position;
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i), z = points.getZ(i);
      const diskX = x * Math.sqrt(1 - z*z / (2*radius*radius));
      const diskZ = z * Math.sqrt(1 - x*x / (2*radius*radius));
      // Opposite edges meet on the same plane, without overlapping deck faces.
      const worldZ = centerZ < midLake ? T.MathUtils.clamp(centerZ + diskZ, -16, midLake)
        : T.MathUtils.clamp(centerZ + diskZ, midLake, 0);
      points.setXYZ(i, diskX, surfaceHeight(diskX, worldZ), worldZ - centerZ);
    }
    surface.computeVertexNormals();
    mesh(surface, deckMaterial, lakeGroup, 0, 0, centerZ).renderOrder = 2;

    const rimPoints = top.attributes.position;
    const vertices = [];
    for (let i = 1; i < rimPoints.count - 1; i++) {
      const x1 = rimPoints.getX(i), x2 = rimPoints.getX(i + 1);
      const z1 = rimPoints.getZ(i) + centerZ, z2 = rimPoints.getZ(i + 1) + centerZ;
      if ((centerZ < midLake && Math.max(z1, z2) > midLake) ||
          (centerZ > midLake && Math.min(z1, z2) < midLake)) continue;
      if (Math.min(z1, z2) < -16 || Math.max(z1, z2) > 0) continue;
      const y1 = surfaceHeight(x1, z1), y2 = surfaceHeight(x2, z2);
      vertices.push(x1,y1,z1, x2,y2,z2, x1,-.8,z1, x2,y2,z2, x2,-.8,z2, x1,-.8,z1);
    }
    top.dispose();
    const wall = new T.BufferGeometry();
    wall.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    wall.computeVertexNormals();
    const rimMaterial = stone.clone();
    rimMaterial.map = null;
    rimMaterial.normalMap = null;
    rimMaterial.side = T.DoubleSide;
    mesh(wall, rimMaterial, lakeGroup, 0, 0, 0);
  }

  const veins = [];
  for (const centerZ of centers) {
    for (let i = 0; i < 24; i++) {
      const angle = i * Math.PI / 12;
      const x = Math.cos(angle) * 1.9, z = centerZ + Math.sin(angle) * 1.9;
      const path = new T.CatmullRomCurve3([.78, 1.65, 2.65, 3.62].map((distance, step) => {
        const theta = angle + Math.sin(step * 1.2 + i) * .08;
        const px = Math.cos(theta) * distance, pz = centerZ + Math.sin(theta) * distance;
        return new T.Vector3(px, surfaceHeight(px, pz) + .052, pz);
      }));
      const material = new T.MeshBasicMaterial({
        color: new T.Color(.10, .72, .95), transparent: true, opacity: .16,
        depthWrite: false, blending: T.AdditiveBlending
      });
      mesh(new T.TubeGeometry(path, 8, .024, 6, false), material, lakeGroup, 0, 0, 0).renderOrder = 3;
      veins.push({ x, z, material });
    }
  }

  modelLoader.loadAsync('./cave-assets/models/glowing-island.glb').then(({ scene: model }) => {
    const bounds = new T.Box3().setFromObject(model);
    const size = bounds.getSize(new T.Vector3());
    const scale = 1.55 / Math.max(size.x, size.z);
    if (!Number.isFinite(scale) || scale <= 0) return;
    const center = bounds.getCenter(new T.Vector3());
    model.scale.multiplyScalar(scale);
    model.position.addScaledVector(new T.Vector3(center.x, bounds.min.y, center.z), -scale);
    for (const centerZ of centers) {
      for (const side of [-1, 1]) {
        const detail = new T.Group();
        detail.position.set(side * 3, deckY, centerZ + side * .65);
        detail.rotation.y = side * 1.25;
        detail.add(model.clone(true));
        lakeGroup.add(detail);
      }
    }
  }).catch(error => console.warn('浮岛装饰加载失败', error));

  function canWalk(x, z) {
    const localX = x - originX, localZ = z - originZ;
    if (localZ >= 0) return cave.canMove(x, z);
    if (localZ <= -16) return observatory.ground(localX, -localZ, bankHeight) !== undefined;
    return centers.some(centerZ => Math.hypot(localX, localZ - centerZ) <= radius - .13);
  }

  function update(player, direction, dt, time, walkingSpeed) {
    waterTime.value = time;
    if (direction.lengthSq()) player.rotation.y = Math.atan2(direction.x, direction.y);
    const { x, z } = player.position;
    let nextX = x + direction.x * walkingSpeed * dt;
    let nextZ = z + direction.y * walkingSpeed * dt;
    if (!canWalk(nextX, z)) nextX = x;
    if (!canWalk(nextX, nextZ)) nextZ = z;
    const localX = nextX - originX, localZ = nextZ - originZ;
    const onNearBank = localZ >= 0;
    const arrived = localZ <= -16;
    const onDeck = !onNearBank && !arrived;
    const y = onNearBank ? cave.groundHeight(nextX, nextZ)
      : arrived ? observatory.ground(localX, -localZ, bankHeight) : surfaceHeight(localX, localZ);
    player.position.set(nextX, y, nextZ);

    for (const vein of veins) {
      const distance = Math.hypot(localX - vein.x, localZ - vein.z);
      const target = onDeck ? .16 + .82 * (1 - T.MathUtils.smoothstep(distance, .6, 3.6)) : .16;
      vein.material.opacity = T.MathUtils.damp(vein.material.opacity, target, 5, dt);
    }
    if (onDeck) {
      waterGlow.x = nextX;
      waterGlow.y = nextZ;
    }
    waterGlow.z = T.MathUtils.damp(waterGlow.z, onDeck ? .85 : 0, 4, dt);
    const speed = Math.hypot(nextX - x, nextZ - z) / Math.max(dt, .001);
    return { speed, arrived, onNearBank };
  }

  function enterFarBank(player) {
    player.position.set(originX, bankHeight(0, -16.2), originZ - 16.2);
  }

  const batteryPoints = [{ id: 'far-bank-cache', position: new T.Vector3(originX - 1.35, .86, originZ - 18.5) }];
  return { update, observatory, enterFarBank, batteryPoints, cameraObstacles, farBankZ: originZ - 16, shoreZ: originZ,
    spawn: new T.Vector3(originX, 0, originZ + 1.3) };
}
