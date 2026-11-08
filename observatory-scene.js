export const tunnelJoinDepth = 25;

export function observatoryArchPoint(T, angle, depth, target) {
  const chamber = T.MathUtils.smoothstep(depth, 25.5, 32);
  const noise = .15 * Math.sin(angle * 17 + depth) + .09 * Math.sin(angle * 31 - depth * 2);
  const width = T.MathUtils.lerp(3.05, 14.8, chamber) + noise;
  const height = T.MathUtils.lerp(4.65, 11.8, chamber) + noise;
  const end = 1 - T.MathUtils.smoothstep(depth, 52, 56) * .95;
  target.set(Math.cos(angle) * width * end - chamber * 2, -.7 + Math.sin(angle) * height * end);
}

export function createObservatory(T, parent, stone, moss, originX, originZ, Reflector) {
  const root = new T.Group();
  root.name = '地下观测站';
  parent.add(root);
  const room = new T.Scene();
  room.name = '观测站实验室';
  room.background = new T.Color('#10151f');
  room.fog = new T.FogExp2('#1a2130', .0065);
  const roomRoot = new T.Group();
  roomRoot.position.set(originX, 0, originZ);
  room.add(roomRoot, new T.HemisphereLight('#8fa6d8', '#3a3026', 1.05));
  let buildTarget = root;
  const world = (x, y, depth) => new T.Vector3(originX + x, y, originZ - depth);
  const material = (color, roughness = .85, metalness = 0) =>
    new T.MeshStandardMaterial({ color, roughness, metalness });
  const glow = (color, intensity) =>
    new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity });
  const concrete = stone.clone();
  concrete.color.set('#757d67');
  concrete.roughness = .64;
  const wetRock = stone.clone();
  wetRock.roughness = .53;
  const metal = material('#324247', .42, .65);
  let brass = material('#bc8847', .32, .76);
  const darkBrass = material('#684731', .51, .65);
  const paper = material('#c8b58c');
  const cyan = glow('#35bcd4', 1.25);
  const amber = glow('#ffc064', 1.8);
  const green = glow('#bfdc51', 1.25);
  const ceiling = material('#273639');
  const glass = new T.MeshPhysicalMaterial({
    color: '#5ad5e0', emissive: '#14798e', emissiveIntensity: .55,
    metalness: .25, roughness: .22, transparent: true, opacity: .44, depthWrite: false, side: T.DoubleSide
  });
  function mesh(geometry, surface, x, y, depth) {
    const object = new T.Mesh(geometry, surface);
    object.position.set(x, y, -depth);
    buildTarget.add(object);
    return object;
  }
  const boxGeometry = new T.BoxGeometry(1, 1, 1);
  function box(surface, width, height, length, x, y, depth) {
    const object = mesh(boxGeometry, surface, x, y, depth);
    object.scale.set(width, height, length);
    return object;
  }
  function light(color, intensity, range, x, y, depth) {
    const lamp = new T.PointLight(color, intensity, range);
    lamp.position.set(x, y, -depth);
    buildTarget.add(lamp);
  }
  const rockGeometry = new T.IcosahedronGeometry(1, 2);
  const rockPositions = rockGeometry.attributes.position;
  for (let i = 0; i < rockPositions.count; i++) {
    const x = rockPositions.getX(i), y = rockPositions.getY(i), z = rockPositions.getZ(i);
    const shape = 1 + .13 * Math.sin(x * 9 + y * 5) * Math.cos(z * 8 - y * 3);
    rockPositions.setXYZ(i, x * shape + .12 * y, y * shape, z * shape);
  }
  rockGeometry.computeVertexNormals();
  let seed = 871;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  function rock(x, y, depth, width, height, length) {
    const object = mesh(rockGeometry, wetRock, x, y, depth);
    object.scale.set(width, height, length);
    object.rotation.set(random() * .3, random() * Math.PI, random() * .3);
  }

  const opening = 27, stairStart = 34, stepDepth = .47, stepRise = .18, steps = 9;
  const stairEnd = stairStart + stepDepth * steps;
  const floor = stepRise * steps, door = 40.15, back = 49;
  const left = -3.6, right = 7;
  const roomWidth = right - left, roomCenter = (right + left) / 2;

  const vault = new T.PlaneGeometry(1, 1, 56, 72);
  const vertices = vault.attributes.position;
  const uv = vault.attributes.uv;
  const section = new T.Vector2();
  for (let i = 0; i < vertices.count; i++) {
    const angle = uv.getX(i) * Math.PI;
    const depth = tunnelJoinDepth + uv.getY(i) * (56 - tunnelJoinDepth);
    observatoryArchPoint(T, angle, depth, section);
    vertices.setXYZ(i, section.x, section.y, -depth);
    uv.setXY(i, angle * 2.3, -depth * .38);
  }
  vault.computeVertexNormals();
  const vaultMaterial = wetRock.clone();
  vaultMaterial.side = T.DoubleSide;
  vaultMaterial.flatShading = false;
  mesh(vault, vaultMaterial, 0, 0, 0);

  box(wetRock, 3.8, .34, 4.05, 0, -.17, 25.05);
  box(wetRock, 9.6, .44, 7.1, .8, -.22, 30.5);
  box(wetRock, 2.5, .44, 3, -2.95, -.22, 35.25);
  box(wetRock, 3.1, .44, 3, 3.3, -.22, 35.25);
  box(moss, 3.1, .13, 6, 3.5, -.068, 31.5);
  for (let i = 0; i < steps; i++) {
    const height = (i + 1) * stepRise;
    box(concrete, 3.4, height, stepDepth + .018, 0, height / 2, stairStart + (i + .5) * stepDepth);
    box(darkBrass, 3.27, .025, .043, 0, height - .016, stairStart + i * stepDepth + .045);
  }
  box(concrete, roomWidth, floor + .24, door + .5 - stairEnd, roomCenter, (floor - .24) / 2, (door + .5 + stairEnd) / 2);
  for (const [x, depth, width, height, length] of [
    [-2.9, 28.2, .92, .44, .88], [-2.47, 29.65, .53, .25, .64],
    [-3.24, 31.55, 1.03, .48, 1.06], [-2.35, 33.25, .46, .21, .62],
    [-3.04, 35.35, .78, .33, .87],
    [3.75, 28.45, .92, .39, .86], [2.64, 30.1, .61, .24, .65],
    [4.12, 31.75, 1.18, .51, .98], [2.69, 33.65, .58, .24, .65],
    [3.26, 35.65, .82, .34, .79]
  ]) {
    rock(x, -.09, depth, width, height, length);
  }

  const pool = mesh(new T.PlaneGeometry(11, 23), material('#124d58', .16, .78), -8.8, -.37, 41);
  pool.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 20; i++) {
    const line = box(cyan, .15 + random() * 1.5, .008, .016, -4.2 - random() * 8, -.354, 32 + random() * 18);
    line.rotation.y = .15 - random() * .3;
  }
  light('#37d5ed', 74, 18, -6, 3.8, 34);
  light('#76c9ef', 102, 18, -1, 8.4, 29);
  light('#89e6ec', 62, 15, -3, 7, 46);
  light('#f5bd68', 8, 5, 0, 2.55, 24);
  for (const depth of [25, 27.5, 31.7, 34.5, 36.6]) {
    const x = depth < opening ? 1.3 : 2.05;
    const y = depth >= stairStart ? (depth - stairStart) / stepDepth * stepRise : 0;
    for (const side of [-1, 1]) {
      const stem = mesh(new T.CylinderGeometry(.023, .035, .28, 7), darkBrass, side * x, y + .14, depth);
      const cap = mesh(new T.SphereGeometry(.16, 10, 6), depth < opening ? amber : green, side * x, y + .3, depth);
      cap.scale.y = .28;
      stem.rotation.z = .13 * side;
    }
  }

  // The tower and dish silhouette sit above the water on the left.
  const exteriorTower = new T.Group();
  root.add(exteriorTower);
  buildTarget = exteriorTower;
  const towerX = -5.1, towerDepth = 44.8;
  mesh(new T.CylinderGeometry(2, 2.3, 2.3, 24), concrete, towerX, .65, towerDepth);
  mesh(new T.CylinderGeometry(1.5, 1.5, 6.4, 32, 1, true), glass, towerX, 4.9, towerDepth);
  for (const y of [1.7, 3.25, 4.8, 6.35, 8.1]) {
    mesh(new T.CylinderGeometry(1.63, 1.63, .18, 32), metal, towerX, y, towerDepth);
    mesh(new T.CylinderGeometry(1.44, 1.44, .055, 32), cyan, towerX, y - .14, towerDepth);
  }
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI / 5;
    box(metal, .11, 6.5, .11, towerX + 1.52 * Math.cos(angle), 4.9, towerDepth + 1.52 * Math.sin(angle));
  }
  light('#48d7ed', 39, 12, towerX, 5.2, towerDepth);
  const exteriorDish = new T.Group();
  root.add(exteriorDish);
  buildTarget = exteriorDish;
  const dishX = -8.8, dishDepth = 37.8;
  box(concrete, 4.8, 1.15, 4, dishX, .2, dishDepth);
  box(metal, .47, 2.6, .47, dishX, 2.02, dishDepth);
  const dishProfile = Array.from({ length: 13 }, (_, i) => {
    const radius = i / 12 * 2.05;
    return new T.Vector2(radius, .28 * radius * radius);
  });
  const dishSurface = metal.clone();
  dishSurface.side = T.DoubleSide;
  const dish = mesh(new T.LatheGeometry(dishProfile, 36), dishSurface, dishX, 3.25, dishDepth);
  dish.rotation.set(.78, 0, -.48);
  const rim = new T.Mesh(new T.TorusGeometry(2.05, .055, 8, 48), brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.18;
  dish.add(rim);
  const receiver = new T.Mesh(new T.CylinderGeometry(.055, .095, 1.72, 8), brass);
  receiver.position.y = .87;
  dish.add(receiver);

  // Split the facade at the doorway so the opening matches the collision bounds.
  const fallbackHouse = new T.Group();
  root.add(fallbackHouse);
  buildTarget = fallbackHouse;
  const wallHeight = 3.85, wallY = floor + wallHeight / 2;
  const halfDoor = 1.25;
  for (const [a, b] of [[left, -halfDoor], [halfDoor, right]]) {
    box(concrete, b - a, wallHeight, .42, (a + b) / 2, wallY, door);
  }
  box(concrete, 2.5, 1.05, .48, 0, floor + 3.325, door);
  for (const x of [left, right]) box(concrete, .32, wallHeight, back - door, x, wallY, (back + door) / 2);
  box(concrete, roomWidth, wallHeight, .32, roomCenter, wallY, back);
  box(ceiling, roomWidth + .64, .33, back - door + .75, roomCenter, floor + wallHeight, (back + door) / 2);
  box(concrete, roomWidth + .7, .26, 1.23, roomCenter, floor + 3.05, door - .52);
  for (const x of [-1.19, 1.19]) box(metal, .16, 2.8, .23, x, floor + 1.4, door);
  box(amber, .52, .075, .2, 0, floor + 2.83, door - .58);
  buildTarget = root;
  light('#ffc075', 48, 11, 0, floor + 2.65, door - 1.1);
  box(new T.MeshBasicMaterial({ color: '#10191d' }), 2.5, 2.8, .14, 0, floor + 1.4, door + .48);
  buildTarget = fallbackHouse;
  for (const x of [-2.4, 2.35, 3.75, 5.15, 6.25]) {
    box(metal, .85, 1.02, .1, x, floor + 1.7, door - .25);
    box(cyan, .71, .77, .08, x, floor + 1.73, door - .31);
    box(metal, .045, .81, .055, x, floor + 1.73, door - .37);
  }
  const vineMaterial = material('#4a6133');
  const leaf = new T.SphereGeometry(1, 5, 4);
  for (let i = 0; i < 34; i++) {
    const x = left - .18 + random() * (roomWidth + .37);
    const depth = door - 1.15;
    const y = floor + 3.19;
    const length = Math.abs(x) < 1.3 ? .16 : .22 + random() * 1.45;
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(x, y, -depth - .16),
      new T.Vector3(x - .11, y - length * .52, -depth + .09),
      new T.Vector3(x + .13, y - length, -depth + .08)
    ]);
    mesh(new T.TubeGeometry(curve, 5, .019, 4, false), vineMaterial, 0, 0, 0);
    for (const t of [.27, .55, .81]) {
      const p = curve.getPoint(t);
      const sprig = mesh(leaf, vineMaterial, p.x + (t === .55 ? -.07 : .07), p.y, -p.z);
      sprig.scale.set(.11, .045, .064);
      sprig.rotation.z = t === .55 ? -.42 : .46;
    }
  }
  const fallbackObstacles = fallbackHouse.children.filter(object => object.material === concrete);
  const cameraObstacles = [...root.children, ...fallbackObstacles].filter(object =>
    object.isMesh && [vaultMaterial, wetRock, concrete].includes(object.material));
  buildTarget = roomRoot;
  const labLeft = -5.1, labRight = 8.5;
  const labWidth = labRight - labLeft;
  const labHeight = 5.4, labWallY = floor + labHeight / 2;
  brass = material('#c08a3e', .30, 1);
  brass.envMapIntensity = .66;
  const charcoal = material('#20262b', .8);
  const warmStrip = glow('#ffdba1', 2.7);
  const coolInk = glow('#73ddf0', .85);
  const floorStart = door - 3;
  const tile = document.createElement('canvas');
  tile.width = tile.height = 256;
  const paint = tile.getContext('2d');
  paint.fillStyle = '#514840';
  paint.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      paint.fillStyle = ['#a79889', '#a09286', '#a99c90', '#9e9083'][(row * 3 + col + row * col) % 4];
      paint.fillRect(col * 64 + 1, row * 64 + 1, 62, 62);
    }
  }
  const tiles = new T.CanvasTexture(tile);
  tiles.colorSpace = T.SRGBColorSpace;
  tiles.wrapS = tiles.wrapT = T.RepeatWrapping;
  tiles.repeat.set(labWidth / 4, (back - floorStart) / 4);
  const floorGeometry = new T.PlaneGeometry(labWidth, back - floorStart);
  const tileFloor = mesh(floorGeometry, new T.MeshStandardMaterial({ map: tiles, roughness: .48 }),
    roomCenter, floor, (floorStart + back) / 2);
  tileFloor.rotation.x = -Math.PI / 2;
  tileFloor.receiveShadow = true;
  const mirrorShader = Reflector.ReflectorShader;
  const reflection = new Reflector(floorGeometry, {
    textureWidth: 512, textureHeight: 384, multisample: 0, clipBias: .003,
    shader: {
      ...mirrorShader,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec4 vUv;
        void main() {
          vec2 uv = vUv.xy / vUv.w;
          vec2 blur = vec2(.004, .003);
          vec3 reflected = (texture2D(tDiffuse, uv).rgb * 2.0
            + texture2D(tDiffuse, uv + blur).rgb + texture2D(tDiffuse, uv - blur).rgb) * .25;
          gl_FragColor = vec4(reflected, .16);
        }`
    }
  });
  reflection.position.copy(tileFloor.position);
  reflection.position.y += .003;
  reflection.rotation.copy(tileFloor.rotation);
  reflection.material.transparent = true;
  reflection.material.depthWrite = false;
  roomRoot.add(reflection);
  const sideWindowStart = 44.8;
  box(charcoal, .3, labHeight, back - door, labLeft, labWallY, (back + door) / 2);
  box(charcoal, .3, labHeight, sideWindowStart - door, labRight, labWallY, (sideWindowStart + door) / 2);
  const centerWallLeft = -.82, centerWallRight = 3.52;
  box(charcoal, centerWallRight - centerWallLeft, labHeight, .3,
    (centerWallLeft + centerWallRight) / 2, labWallY, back);
  const ceilingDepth = (back + door) / 2;
  box(material('#303746', .79), labWidth, .26, back - door, roomCenter, floor + labHeight, ceilingDepth);
  const ceilingPanel = material('#3c4654', .72);
  ceilingPanel.emissive.set('#536073');
  ceilingPanel.emissiveIntensity = .16;
  const ceilingTrim = material('#1b2330', .65);
  const ceilingStrip = glow('#ffe3b6', 1.65);
  for (const offset of [-4.25, 0, 4.25]) {
    const x = roomCenter + offset;
    box(ceilingTrim, 3.93, .12, 7.7, x, floor + labHeight - .19, ceilingDepth);
    box(ceilingPanel, 3.68, .1, 7.42, x, floor + labHeight - .25, ceilingDepth);
    for (const edge of [-1, 1]) {
      box(ceilingStrip, .032, .018, 7.1, x + edge * 1.75, floor + labHeight - .306, ceilingDepth);
    }
  }
  for (const depth of [door + .65, back - .65]) {
    box(ceilingTrim, labWidth - .55, .16, .24, roomCenter, floor + labHeight - .28, depth);
  }
  const sky = new T.ShaderMaterial({
    vertexShader: `varying vec2 pane; varying vec3 viewToGlass; void main() {
      pane = uv;
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      viewToGlass = vec3(dot(-viewPosition.xyz, normalize(normalMatrix * normal)), length(viewPosition.xyz), 0.0);
      gl_Position = projectionMatrix * viewPosition;
    }`,
    fragmentShader: `varying vec2 pane; varying vec3 viewToGlass; void main() {
      float ridge = .38 + .12 * sin(pane.x * 6.0) + .06 * sin(pane.x * 17.0);
      float horizon = exp(-abs(pane.y - .51) * 5.5);
      vec3 dusk = mix(vec3(.009,.016,.04), vec3(.13,.075,.19), horizon);
      dusk *= mix(.22, 1.0, smoothstep(ridge - .07, ridge + .06, pane.y));
      float grazing = 1.0 - clamp(viewToGlass.x / viewToGlass.y, 0.0, 1.0);
      float stripe = fract((pane.x + pane.y * .32) * 3.0);
      float sheen = smoothstep(.16, .27, stripe) * (1.0 - smoothstep(.28, .49, stripe));
      dusk += vec3(.075,.092,.14) * sheen * (.23 + .55 * grazing);
      gl_FragColor = vec4(dusk, 1.0);
    }`
  });
  const frame = material('#161a24', .34, .55);
  const frameEdge = material('#766455', .37, .5);
  function windowBank(x, depth, width, rotation) {
    const bank = new T.Group();
    bank.position.set(x, floor, -depth);
    bank.rotation.y = rotation;
    roomRoot.add(bank);
    buildTarget = bank;
    const paneHeight = labHeight - .28;
    mesh(new T.PlaneGeometry(width, paneHeight), sky, 0, labHeight / 2, 0);
    for (let i = 0; i <= 3; i++) {
      const mullionX = width * (i / 3 - .5);
      box(frame, .075, paneHeight, .13, mullionX, labHeight / 2, -.07);
      box(frameEdge, .012, paneHeight, .012, mullionX + .028, labHeight / 2, -.14);
    }
    for (const y of [.14, .98, labHeight - .14]) box(frame, width, .08, .13, 0, y, -.07);
    for (const y of [.07, labHeight - .07]) box(charcoal, width, .14, .18, 0, y, 0);
    buildTarget = roomRoot;
  }
  windowBank((labLeft + centerWallLeft) / 2, back - .16, centerWallLeft - labLeft, 0);
  windowBank((labRight + centerWallRight) / 2, back - .16, labRight - centerWallRight, 0);
  windowBank(labRight - .15, (sideWindowStart + back) / 2, back - sideWindowStart, -Math.PI / 2);
  function directional(color, intensity, x, y, depth) {
    const lamp = new T.DirectionalLight(color, intensity);
    lamp.position.set(x, floor + y, -depth);
    lamp.target.position.set(.8, floor + 1, -45);
    roomRoot.add(lamp, lamp.target);
    return lamp;
  }
  const key = directional('#ffc98f', 2, 5, 8, 40);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6, far: 25 });
  key.shadow.normalBias = .025;
  key.shadow.bias = -.00025;
  directional('#8fd8ff', .9, -4, 4, 48);
  directional('#fff1e0', .55, -4, 4, 42);

  const tableX = 1.05;
  box(material('#0c0e13'), 7.45, .13, 1.72, tableX, floor + .065, 45.55);
  box(material('#29282d', .52), 7.6, .76, 1.85, tableX, floor + .49, 45.55);
  box(material('#434a55', .36), 7.78, .12, 1.96, tableX, floor + .94, 45.55);
  box(warmStrip, 7.55, .025, .032, tableX, floor + .89, 44.54);
  box(warmStrip, 7.35, .016, .027, tableX, floor + .12, 44.61);

  const foliage = material('#455a23', .92);
  const planters = [[-4.37, 47.6]];
  for (const [x, depth] of planters) {
    box(frame, .72, .75, .72, x, floor + .375, depth);
    box(darkBrass, .08, .45, .08, x, floor + .97, depth);
    const crown = mesh(new T.IcosahedronGeometry(.39, 0), foliage, x, floor + 1.35, depth);
    crown.scale.y = 1.22;
  }
  const treeX = 7.5, treeDepth = 47.55;
  const portalPad = world(6.55, floor, 46.15);
  const portalReturn = world(6.55, floor, 44.65);
  mesh(new T.CylinderGeometry(.82, .88, .035, 32), frame, 6.55, floor + .012, 46.15);
  const padRing = mesh(new T.TorusGeometry(.73, .026, 8, 36), coolInk, 6.55, floor + .045, 46.15);
  padRing.rotation.x = -Math.PI / 2;
  light('#48cfff', 15, 4, treeX, floor + 1.5, treeDepth);
  function treeSegment(from, to, radius, surface) {
    const start = new T.Vector3(treeX + from[0], floor + from[1], -treeDepth + from[2]);
    const end = new T.Vector3(treeX + to[0], floor + to[1], -treeDepth + to[2]);
    const axis = end.clone().sub(start);
    const middle = start.addScaledVector(axis, .5);
    const segment = mesh(new T.CylinderGeometry(radius * .66, radius, axis.length(), 7),
      surface, middle.x, middle.y, -middle.z);
    segment.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis.normalize());
  }
  treeSegment([0, 0, 0], [-.12, 1.25, 0], .29, frame);
  treeSegment([-.12, 1.25, 0], [.05, 2.45, -.12], .2, frame);
  for (const [dx, dz] of [[-.8,.2],[-.25,.55],[.7,.25],[.45,-.55],[-.58,-.5]]) {
    treeSegment([0,.28,0], [dx, .035, dz], .11, frame);
    const joint = [dx * .65, 2.15, dz * .8];
    const tip = [dx * 1.26, 2.8 + dz * .65, dz * 1.45];
    treeSegment([-.09, 1.35, 0], joint, .1, darkBrass);
    treeSegment(joint, tip, .06, coolInk);
    treeSegment(joint, [dx * .63, 2.82, dz * .4], .032, coolInk);
  }

  const wheelX = .65, wheelY = floor + 2.12, wheelDepth = 45.28;
  box(darkBrass, 2.25, .12, .87, wheelX, floor + 1.05, wheelDepth);
  box(brass, .19, .44, .22, wheelX, floor + 1.28, wheelDepth);
  const dial = mesh(new T.CylinderGeometry(.94, .94, .12, 64), metal, wheelX, wheelY, wheelDepth);
  dial.rotation.x = Math.PI / 2;
  mesh(new T.TorusGeometry(.98, .085, 12, 64), brass, wheelX, wheelY, wheelDepth - .08);
  mesh(new T.TorusGeometry(.82, .014, 8, 64), darkBrass, wheelX, wheelY, wheelDepth - .17);
  for (let i = 0; i < 36; i++) {
    const angle = i * Math.PI / 18;
    const tick = box(brass, .05, .011, .012, wheelX + .86*Math.cos(angle),
      wheelY + .86*Math.sin(angle), wheelDepth - .174);
    tick.rotation.z = angle;
  }
  for (const x of [wheelX - 1.06, wheelX + 1.06]) {
    box(brass, .043, 2.15, .065, x, wheelY, wheelDepth - .27);
    for (const y of [wheelY - 1.04, wheelY + 1.04]) box(darkBrass, .16, .14, .16, x, y, wheelDepth - .27);
  }
  for (const y of [wheelY - 1.04, wheelY + 1.04]) box(brass, 2.12, .04, .065, wheelX, y, wheelDepth - .27);
  const wheel = new T.Group();
  wheel.position.set(wheelX, wheelY, -wheelDepth + .23);
  roomRoot.add(wheel);
  const arm = new T.Mesh(boxGeometry, brass);
  arm.position.x = .36;
  arm.scale.set(.8, .063, .07);
  wheel.add(arm, new T.Mesh(new T.SphereGeometry(.105, 16, 10), darkBrass));
  const pin = new T.Mesh(new T.SphereGeometry(.065, 14, 8), coolInk);
  pin.position.x = .73;
  wheel.add(pin);
  const horizontal = box(brass, 2.05, .027, .044, wheelX, wheelY, wheelDepth - .38);
  const vertical = box(brass, .027, 2.02, .043, wheelX, wheelY, wheelDepth - .39);

  const paperX = -1.67, paperDepth = 45.37;
  box(paper, 2.63, 1.53, .035, paperX, wheelY, paperDepth);
  for (const x of [paperX - 1.37, paperX + 1.37]) {
    mesh(new T.CylinderGeometry(.067, .067, 1.66, 16), brass, x, wheelY, paperDepth);
  }
  const paperRule = material('#938366');
  for (let i = -5; i <= 5; i++) box(paperRule, .009, 1.47, .003, paperX + i*.23, wheelY, paperDepth - .02);
  box(paperRule, 2.55, .01, .004, paperX, wheelY, paperDepth - .021);
  const cosineX = .59;
  box(paper, 1.47, .83, .028, cosineX, floor + .48, 44.51);
  box(paperRule, .009, .8, .004, cosineX, floor + .48, 44.49);
  box(paper, 1.47, .023, .51, cosineX, floor + 1.008, 44.76);
  box(paper, 1.47, .15, .028, cosineX, floor + .943, 44.51);
  box(paperRule, .009, .003, .49, cosineX, floor + 1.022, 44.76);
  box(darkBrass, 1.55, .034, .045, cosineX, floor + .07, 44.48);

  function lineTrace(color) {
    const geometry = new T.BufferGeometry();
    const points = new T.BufferAttribute(new Float32Array(300), 3).setUsage(T.DynamicDrawUsage);
    geometry.setAttribute('position', points);
    geometry.setDrawRange(0, 0);
    const line = new T.Line(geometry, new T.LineBasicMaterial({ color }));
    line.frustumCulled = false;
    roomRoot.add(line);
    return { geometry, points };
  }
  const sineTrace = lineTrace('#28a7c2');
  const cosineTrace = lineTrace('#f7cd65');
  for (const [trace, color, isSine] of [[sineTrace, '#719aa2', true], [cosineTrace, '#aa9260', false]]) {
    const points = Array.from({ length: 100 }, (_, i) => {
      const t = i / 99;
      return isSine
        ? new T.Vector3(paperX + 1.25 - 2.5 * t, wheelY + .63 * Math.sin(t * 4 * Math.PI), -paperDepth + .025)
        : new T.Vector3(cosineX + .59 * Math.cos(t * 4 * Math.PI), floor + .87 - .78 * t, -44.487);
    });
    trace.guide = new T.Line(new T.BufferGeometry().setFromPoints(points), new T.LineBasicMaterial({ color }));
    roomRoot.add(trace.guide);
  }
  const pen = box(brass, .27, .027, .04, paperX + 1.38, wheelY, paperDepth - .04);

  const modelX = 3.61, modelY = floor + 1.94, modelDepth = 45.44;
  box(darkBrass, 1.9, .12, 1.28, modelX, floor + 1.06, modelDepth);
  const modelWheel = new T.Group();
  modelWheel.position.set(modelX, modelY, -modelDepth);
  roomRoot.add(modelWheel);
  for (const offset of [-.11, .11]) {
    const rim = new T.Mesh(new T.TorusGeometry(.66, .021, 8, 48), brass);
    rim.position.z = offset;
    modelWheel.add(rim);
  }
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const spoke = new T.Mesh(boxGeometry, brass);
    spoke.position.set(.33*Math.cos(angle), .33*Math.sin(angle), 0);
    spoke.rotation.z = angle;
    spoke.scale.set(.66, .017, .026);
    modelWheel.add(spoke);
    const seat = new T.Mesh(boxGeometry, darkBrass);
    seat.position.set(.64*Math.cos(angle), .64*Math.sin(angle), .015);
    seat.scale.set(.11,.082,.24);
    modelWheel.add(seat);
  }
  for (const side of [-1, 1]) {
    const leg = box(brass, .048, .94, .07, modelX + side*.26, floor + 1.52, modelDepth);
    leg.rotation.z = side * .4;
  }
  const cover = new T.MeshPhysicalMaterial({
    color:'#bac9c7', roughness:.2, transparent:true, opacity:.085, depthWrite:false
  });
  box(cover, 1.8, 1.71, .025, modelX, floor + 1.92, modelDepth - .67);

  const boardX = .9, boardY = floor + 3.02, boardDepth = 46.75;
  box(darkBrass, 6.9, 1.13, .075, boardX, boardY, boardDepth);
  box(material('#122833'), 6.74, 1.02, .055, boardX, boardY, boardDepth - .035);
  const boardInk = glow('#438198', .38);
  for (let i = 0; i < 27; i++) box(boardInk,.008,.86,.005,boardX-3.23+i*.248,boardY,boardDepth-.067);
  for (let i = 0; i < 7; i++) box(boardInk,6.47,.008,.005,boardX,boardY-.42+i*.14,boardDepth-.067);
  mesh(new T.TorusGeometry(.37, .013, 8, 48), coolInk, -1.42, boardY, boardDepth - .077);
  const diagram = new T.Line(new T.BufferGeometry().setFromPoints(Array.from({ length: 80 }, (_, i) =>
    new T.Vector3(-.75 + i / 79 * 4.9, boardY + .32 * Math.sin(i / 79 * 4*Math.PI), -boardDepth + .079))),
    new T.LineBasicMaterial({ color:'#a0e5f1' }));
  roomRoot.add(diagram);

  const buttonX = -.74, trayX = 2.4, panelDepth = 43.78;
  const trayDepth = 43.88, trayTop = floor + .76;
  const trayWidth = .85, trayLength = .51;
  box(metal, .63, .9, .54, buttonX, floor + .45, panelDepth);
  mesh(new T.CylinderGeometry(.125, .15, .085, 18), amber, buttonX, floor + .94, panelDepth);
  box(metal, .69, .68, .49, trayX, floor + .34, 44.04);
  box(brass, trayWidth, .08, trayLength, trayX, trayTop - .04, trayDepth);
  box(cyan, .58, .04, .07, trayX, floor + .75, 43.61);
  roomRoot.traverse(object => {
    if (!object.isMesh || object.isReflector || object.material.transparent || object.material === sky) return;
    object.castShadow = object !== tileFloor;
    object.receiveShadow = true;
  });

  const id = 'observatory-brass-machine';
  const button = { position: world(buttonX, floor + .99, panelDepth) };
  const point = {
    id, position: world(trayX, trayTop, trayDepth),
    releaseDirection: new T.Vector3(0, 0, 1)
  };
  let phase = 'idle', elapsed = 0, display;
  const duration = 3;
  const angleAt = progress => Math.PI * 4 * progress * progress;
  function showMechanism(progress) {
    const angle = angleAt(progress);
    wheel.rotation.z = angle;
    modelWheel.rotation.z = angle;
    horizontal.position.y = wheelY + .73 * Math.sin(angle);
    vertical.position.x = wheelX + .73 * Math.cos(angle);
    pen.position.y = wheelY + .63 * Math.sin(angle);
    const count = Math.floor(progress * 99) + 1;
    for (let i = 0; i < count; i++) {
      const sample = i / 99;
      sineTrace.points.setXYZ(i, paperX + 1.25 - 2.5 * (progress - sample),
        wheelY + .63 * Math.sin(angleAt(sample)), -paperDepth + .027);
      cosineTrace.points.setXYZ(i, cosineX + .59 * Math.cos(angleAt(sample)),
        floor + .87 - .78 * (progress - sample), -44.485);
    }
    for (const { geometry, points } of [sineTrace, cosineTrace]) {
      points.needsUpdate = true;
      geometry.setDrawRange(0, count);
    }
  }
  function update(dt) {
    if (phase !== 'running') return;
    elapsed = Math.min(duration, elapsed + dt);
    const progress = elapsed / duration;
    showMechanism(progress);
    const emerge = T.MathUtils.smoothstep(progress, .8, 1);
    display.visible = emerge > 0;
    display.position.y = point.position.y + .14 * (1 - emerge);
    if (progress === 1) phase = 'ready';
  }
  function start(battery, reducedMotion) {
    if (phase !== 'idle') return;
    display = battery.clone();
    display.position.set(0, 0, 0);
    display.scale.setScalar(1);
    display.rotation.set(0, 0, 0);
    const bounds = new T.Box3().setFromObject(display);
    const size = bounds.getSize(new T.Vector3());
    const scale = Math.min(1, (trayWidth - .06) / size.x, (trayLength - .06) / size.z);
    const center = bounds.getCenter(new T.Vector3());
    display.scale.setScalar(scale);
    display.position.set(trayX - center.x * scale, trayTop - bounds.min.y * scale,
      -trayDepth - center.z * scale);
    point.position.y = display.position.y;
    point.releasePosition = world(display.position.x, display.position.y, -display.position.z);
    display.visible = false;
    roomRoot.add(display);
    sineTrace.guide.visible = cosineTrace.guide.visible = false;
    phase = 'running';
    if (reducedMotion) update(duration);
  }
  function take() {
    phase = 'collected';
    display.removeFromParent();
    display = undefined;
  }
  function placeRobot(model) {
    const pivot = new T.Group();
    pivot.add(model);
    const bounds = new T.Box3().setFromObject(pivot);
    const size = bounds.getSize(new T.Vector3());
    if (size.y <= 0 || !Number.isFinite(size.y)) return;
    model.position.sub(new T.Vector3((bounds.min.x + bounds.max.x) / 2, bounds.min.y,
      (bounds.min.z + bounds.max.z) / 2));
    pivot.scale.setScalar(2.3 / size.y);
    pivot.position.set(3.75, floor, -(stairEnd + .93));
    pivot.rotation.y = -.26;
    root.add(pivot);
  }

  function ground(x, depth, bankHeight) {
    const side = Math.abs(x);
    if (depth <= 21.1 && depth >= 16 && side <= 5.35) return bankHeight(x, -depth);
    if (depth < opening && depth > 21.1 && side <= 1.57) {
      return bankHeight(x, -depth) * (1 - T.MathUtils.smoothstep(depth, 21.1, 23));
    }
    if (depth >= opening && depth < stairStart && x > -3.85 && x < 5.25) return 0;
    if (depth >= stairStart && depth < stairEnd && side <= 1.51) {
      return (Math.floor((depth - stairStart) / stepDepth) + 1) * stepRise;
    }
    if (depth >= stairEnd && depth < door - .39 && x > -2.9 && x < 2.44) return floor;
    if (depth >= door - .39 && depth <= door + .38 && side <= .98) return floor;
  }

  function roomGround(x, z) {
    const localX = x - originX, depth = originZ - z;
    if (depth < door + .03 || depth > back - .4 || localX < labLeft + .4 || localX > labRight - .5) return;
    if (planters.some(([x, z]) => Math.abs(localX - x) < .53 && Math.abs(depth - z) < .53)) return;
    if (Math.hypot(localX - treeX, depth - treeDepth) < .46) return;
    if (depth < door + .56 && Math.abs(localX) > .98) return;
    if (depth > 44.22 && depth < 46.77 && localX > -3.05 && localX < 5.18) return;
    if (Math.abs(localX - buttonX) < .42 && Math.abs(depth - panelDepth) < .36) return;
    if (Math.abs(localX - trayX) < .48 && Math.abs(depth - 43.98) < .37) return;
    return floor;
  }

  function view(position) {
    const depth = originZ - position.z;
    return {
      tunnel: depth >= 21.5 && depth < opening + 1,
      elevated: depth >= stairStart - .5,
      entered: depth >= door + .08 && Math.abs(position.x - originX) <= .98
    };
  }
  function placeHouse(model, obstacles) {
    // Coordinates measured at the opening and sill of the exported GLB.
    const scale = 14.5;
    model.scale.multiplyScalar(scale);
    model.position.set(-.26 * scale, floor + .31 * scale, -door - .31 * scale);
    root.add(model);
    model.updateWorldMatrix(true, true);
    for (const object of fallbackObstacles) {
      const index = obstacles.indexOf(object);
      if (index >= 0) obstacles.splice(index, 1);
    }
    model.traverse(object => {
      if (!object.isMesh) return;
      obstacles.push(object);
      if (!object.material?.map) return;
      const towerMaterial = object.material.clone();
      towerMaterial.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 housePosition;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nhousePosition = position;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying vec3 housePosition;')
          .replace('#include <emissivemap_fragment>', `
            #include <emissivemap_fragment>
            float tower = smoothstep(-.16, -.125, housePosition.x)
              * (1.0 - smoothstep(.15, .19, housePosition.x))
              * smoothstep(-.29, -.25, housePosition.y)
              * (1.0 - smoothstep(.235, .275, housePosition.y));
            vec3 paint = diffuseColor.rgb;
            float teal = smoothstep(.12, .43, (min(paint.g, paint.b) - paint.r)
              / max(.035, max(paint.g, paint.b)));
            vec3 grid = housePosition * vec3(44.0, 42.0, 44.0);
            float speck = fract(sin(dot(floor(grid), vec3(12.99, 78.23, 37.72))) * 43758.55);
            float glint = smoothstep(.78, .98, speck)
              * (1.0 - smoothstep(.14, .49, length(fract(grid) - .5)));
            vec3 innerGlow = vec3(.035, .53, .72) * (.68 + .95 * max(paint.g, paint.b));
            vec3 lightPoints = vec3(.25, .87, 1.0) * 4.2 * glint;
            totalEmissiveRadiance += tower * teal * (innerGlow + lightPoints);
          `);
      };
      object.material = towerMaterial;
    });
    const towerFill = new T.PointLight('#45c9db', 11, 5);
    towerFill.position.set(-3.25, floor + .85, -door + .25);
    root.add(towerFill);
    fallbackHouse.visible = false;
    exteriorDish.visible = false;
    // The imported station includes its own tower; keep the original clear of its footprint.
    exteriorTower.position.x = -7.6;
  }

  const doorwayZ = originZ - door;
  const roomSpawn = world(0, floor, door + 1.3);
  const outsideSpawn = world(0, floor, door - .85);
  const lookAtMachine = world(1, floor + 1.94, 45);
  return { ground, view, placeHouse, placeRobot, button, point, start, update, take,
    room, roomGround, doorwayZ, roomSpawn, outsideSpawn, lookAtMachine, portalPad, portalReturn, cameraObstacles,
    get phase() { return phase; } };
}
