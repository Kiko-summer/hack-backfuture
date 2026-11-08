export function createCave(T, shorelineZ) {
  const scene = new T.Scene();
  scene.background = new T.Color('#08232d');
  scene.fog = new T.FogExp2('#0b303c', .039);
  function makeSparkleMaterial(color, opacity) {
    return new T.ShaderMaterial({
      transparent:true, depthWrite:false, blending:T.AdditiveBlending,
      uniforms:{uColor:{value:new T.Color(color)},uOpacity:{value:opacity},uTime:{value:0}},
      vertexShader:`
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        varying float pulse;
        void main(){
          vec4 viewPosition=modelViewMatrix*vec4(position,1.);
          gl_Position=projectionMatrix*viewPosition;
          float shimmer=.72+.28*(.5+.5*sin(uTime*2.7+aPhase));
          gl_PointSize=min(16.,aSize*(600./max(1.,-viewPosition.z))*shimmer);
          pulse=shimmer;
        }
      `,
      fragmentShader:`
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float pulse;
        void main(){
          vec2 p=(gl_PointCoord-.5)*2.;
          float horizontal=exp(-abs(p.y)*12.)*exp(-abs(p.x)*1.8);
          float vertical=exp(-abs(p.x)*12.)*exp(-abs(p.y)*1.8);
          float core=exp(-dot(p,p)*90.);
          float halo=exp(-dot(p,p)*5.)*.12;
          float star=max(core,max(horizontal,vertical)*.72)+halo;
          gl_FragColor=vec4(uColor,star*uOpacity*pulse);
        }
      `
    });
  }
  const loader = new T.TextureLoader();
  let seed = 307;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  function surface(asset, color, repeat, roughness) {
    const material = new T.MeshStandardMaterial({ color, roughness });
    for (const [suffix, slot] of [['diff', 'map'], ['nor_gl', 'normalMap'], ['rough', 'roughnessMap']]) {
      loader.load(new URL('./cave-assets/' + asset + '-' + suffix + '.jpg', import.meta.url).href, texture => {
        texture.wrapS = texture.wrapT = T.RepeatWrapping;
        if (Array.isArray(repeat)) texture.repeat.set(repeat[0], repeat[1]);
        else texture.repeat.setScalar(repeat);
        texture.anisotropy = 4;
        if (slot === 'map') texture.colorSpace = T.SRGBColorSpace;
        material[slot] = texture;
        material.needsUpdate = true;
      }, undefined, () => console.warn('Cave texture unavailable:', asset, suffix));
    }
    return material;
  }
  const rock = surface('mossy_rock', '#88988a', 1, .82);
  const boulder = surface('mossy_rock', '#839484', 1.6, .85);
  const mossFloor = surface('grass_ground', '#83aa64', [8, 18], .94);
  mossFloor.normalScale.set(.4, .4);
  mossFloor.vertexColors = true;
  mossFloor.emissive.set('#182a14');
  mossFloor.emissiveIntensity = .2;
  const root = surface('mossy_rock', '#5e5940', 2, .89);
  const rubble = new T.IcosahedronGeometry(1, 3);
  const rubblePoints = rubble.attributes.position;
  for (let i = 0; i < rubblePoints.count; i++) {
    const x = rubblePoints.getX(i), y = rubblePoints.getY(i), z = rubblePoints.getZ(i);
    const scale = 1 + .16 * Math.sin(8*x + 5*z) * Math.cos(7*y - 6*z) + .09*Math.sin(18*x + 9*y);
    rubblePoints.setXYZ(i, x*scale, y*scale, z*scale);
  }
  rubble.computeVertexNormals();

  function mesh(geometry, material, x, y, z, sx = 1, sy = 1, sz = 1, parent = scene) {
    const object = new T.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.scale.set(sx, sy, sz);
    parent.add(object);
    return object;
  }
  function tube(points, radius, material, parent = scene) {
    const path = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)));
    const geometry = new T.TubeGeometry(path, 18, radius, 7);
    const positions = geometry.attributes.position;
    for (let i = 0; i <= 18; i++) {
      const center = path.getPointAt(i / 18);
      const taper = 1 - .88 * (i / 18) ** 1.45;
      for (let j = 0; j <= 7; j++) {
        const id = i * 8 + j;
        positions.setXYZ(id,
          center.x + (positions.getX(id) - center.x) * taper,
          center.y + (positions.getY(id) - center.y) * taper,
          center.z + (positions.getZ(id) - center.z) * taper);
      }
    }
    geometry.computeVertexNormals();
    return mesh(geometry, material, 0, 0, 0, 1, 1, 1, parent);
  }

  function groundHeight(x, z) {
    // Keep the playable ground gently uneven without making the character's
    // root and follow camera bob as they cross the floor.
    return .045 * Math.sin(x*.57 + z*.16) + .035 * Math.sin(z*.48) * Math.cos(x*.36);
  }

  const floor = new T.PlaneGeometry(28, 14 - shorelineZ, 86, 54).rotateX(-Math.PI / 2)
    .translate(-3, 0, (14 + shorelineZ) / 2);
  const floorPoints = floor.attributes.position;
  const floorColors = [];
  const mossTint = new T.Color();
  for (let i = 0; i < floorPoints.count; i++) {
    const x = floorPoints.getX(i), z = floorPoints.getZ(i);
    floorPoints.setY(i, groundHeight(x, z));
    const patch = .5 + .29 * Math.sin(x * .84 + z * .42) + .21 * Math.cos(z * 1.17 - x * .56);
    mossTint.setRGB(.53 + patch * .34, .64 + patch * .36, .51 + patch * .24);
    floorColors.push(mossTint.r, mossTint.g, mossTint.b);
  }
  floor.setAttribute('color', new T.Float32BufferAttribute(floorColors, 3));
  floor.computeVertexNormals();
  mesh(floor, mossFloor, 0, 0, 0);

  function archPoint(angle, z, target) {
    const distance = Math.max(0, -z - 6);
    const center = -1.2 - Math.min(distance * .29, 7);
    const radius = 9.5 - 4.6 * Math.min(distance / 25, 1);
    const height = 9.8 - 4.4 * Math.min(distance / 26, 1);
    const rough = .57 * Math.sin(angle * 13 + z * .42) + .35 * Math.cos(angle * 24 - z * .79)
      + .17 * Math.sin(angle * 42 + z * 2.9);
    return target.set(center + (radius + rough) * Math.cos(angle), -.45 + (height + rough) * Math.sin(angle));
  }

  // The lake vault uses this same profile at the join.
  const positions = [], uvs = [], indices = [];
  const rings = 52, sections = 56;
  const arch = new T.Vector2();
  for (let ring = 0; ring <= rings; ring++) {
    const z = T.MathUtils.lerp(14, shorelineZ, ring / rings);
    for (let section = 0; section <= sections; section++) {
      archPoint(section / sections * Math.PI, z, arch);
      positions.push(arch.x, arch.y, z);
      uvs.push(section/sections*8.3, ring*.15);
      if (ring && section) {
        const p = ring*(sections+1)+section;
        indices.push(p, p-1, p-sections-2, p, p-sections-2, p-sections-1);
      }
    }
  }
  const shell = new T.BufferGeometry();
  shell.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  shell.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  shell.setIndex(indices);
  shell.computeVertexNormals();
  rock.side = T.DoubleSide;
  mesh(shell, rock, 0, 0, 0);

  for (let i = 0; 6 - i * 1.45 > shorelineZ + .9; i++) {
    const z = 6 - i * 1.45;
    const curve = Math.min(Math.max(0, -z - 6) * .29, 7);
    const width = 9.4 - Math.min(Math.max(0, -z - 6) / 25, 1)*4.6;
    for (const side of [-1, 1]) {
      const x = -1.2-curve+side*(width-.25-random()*.85);
      const stone = mesh(rubble, boulder, x, 1.4+random()*2.3, z, 1.4+random(), 2+random()*3.6, 1.25+random()*1.35);
      stone.rotation.set(random()*.6, random()*5, (random()-.5)*.55);
    }
  }
  for (let i = 0; i < 46; i++) {
    const z = 8-random()*15;
    const x = (random() < .55 ? 1 : -1)*(4.8+random()*3.8) - Math.max(0,-z-8)*.22;
    const size = .25 + random()*.8;
    mesh(rubble, boulder, x, groundHeight(x,z)-.12, z, size*1.8,size*.65,size).rotation.y=random()*6;
  }
  for (let i = 0; i < 7; i++) {
    const z = 3 - i*1.8;
    const right = i % 2 === 0;
    const x = right ? 7.2 : -10.5-Math.max(0,-z-8)*.17;
    tube([[x,8,z],[x+(right?-.4:.8),5,z+.3],[x+(right?-1:1.4),2,z+.65],
      [x+(right?-3:3),groundHeight(x,z)+.05,z+2.4]], .22+random()*.48, root);
  }
  for (let i = 0; i < 38; i++) {
    const x = (random()-.5)*14;
    const z = 5-random()*12;
    const top = 8.8 - Math.abs(x)*.24;
    tube([[x,top,z],[x+.12,top-1,z+.13],[x-.21,top-1.5-random()*1.55,z+.17]], .018+random()*.028, root);
  }

  const robotX = 3.6, robotZ = -4.9;
  const robotRadiusX = 1.7, robotRadiusZ = 1.35;
  let robot;

  function insideRobotFootprint(x, z) {
    return Math.hypot((x - robotX) / robotRadiusX, (z - robotZ) / robotRadiusZ) <= 1;
  }

  function placeRobot(model, player) {
    const display = new T.Group();
    display.name = '苔藓机器人';
    display.add(model);
    model.rotation.y += Math.atan2(-robotX, -robotZ);
    const bounds = new T.Box3().setFromObject(display);
    const scale = 4.6 / (bounds.max.y - bounds.min.y);
    if (!Number.isFinite(scale) || scale <= 0) throw new Error('苔藓机器人模型尺寸无效');
    const center = bounds.getCenter(new T.Vector3());
    model.position.sub(new T.Vector3(center.x, bounds.min.y, center.z));
    display.scale.setScalar(scale);
    display.position.set(robotX, groundHeight(robotX, robotZ), robotZ);
    const forward = new T.Vector3(-robotX, 0, -robotZ).normalize();
    const chest = display.position.clone().add(new T.Vector3(0, 3.28, 0));
    const rayOrigin = chest.clone().addScaledVector(forward, 3);
    display.updateMatrixWorld(true);
    const surface = new T.Raycaster(rayOrigin, forward.clone().negate(), 0, 3.5)
      .intersectObject(model, true)[0];
    batteryPoints[0].releasePosition = surface?.point ?? chest.addScaledVector(forward, .68);
    batteryPoints[0].releaseDirection = forward;
    robot = display;
    if (!insideRobotFootprint(player.position.x, player.position.z)) scene.add(robot);
  }

  function lathe(profile) {
    return new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x,y)),32);
  }

  const stem = lathe([[0,0],[.085,0],[.072,.15],[.052,.35],[.065,.64],[.097,.79],[0,.8]]);
  stem.scale(1, .62, 1);
  const cap = lathe([[0,0],[.12,.012],[.34,.02],[.46,.052],[.49,.082],[.43,.13],[.3,.245],[.12,.29],[0,.3]]);
  const stemMaterial = new T.MeshStandardMaterial({ color:'#a2b05c', emissive:'#718329', emissiveIntensity:.28, roughness:.68 });
  const capMaterial = new T.MeshStandardMaterial({ color:'#b3d75b', emissive:'#a8e43b', emissiveIntensity:1.12, roughness:.35, transparent:true, opacity:.94 });
  const gills = new T.MeshStandardMaterial({ color:'#d1e88c', emissive:'#ccff63', emissiveIntensity:.66 });
  const mushroomMaterials = [.26, .48, .79, 1.28].map(glow =>
    [stemMaterial, capMaterial, gills].map(material => {
      const variant = material.clone();
      variant.emissiveIntensity *= glow;
      return variant;
    })
  );
  const gillGeometry = new T.TorusGeometry(.29,.015,5,26).rotateX(Math.PI/2);
  function mushroom(x,z,size,group = scene) {
    const y = groundHeight(x,z);
    const plant = new T.Group();
    plant.position.set(x,y,z);
    plant.scale.setScalar(size * .8);
    plant.rotation.z=(random()-.5)*.31;
    group.add(plant);
    const brightness = random();
    const level = brightness < .4 ? 0 : brightness < .75 ? 1 : brightness < .94 ? 2 : 3;
    const [stalk, canopy, underside] = mushroomMaterials[level];
    mesh(stem,stalk,0,0,0,1,1,1,plant);
    mesh(cap,canopy,0,.46,0,1,.85,1,plant);
    mesh(gillGeometry,underside,0,.474,0,1,1,1,plant);
    return plant;
  }
  for(let i=0;i<19;i++) mushroom(4.15+random()*1.75,-3.8+random()*2,[.25,.49,.82][i%3]*(.8+random()*.3));
  for(let i=0;i<10;i++) mushroom(-4.7+random()*2.6,-1.7-i*.58,.14+random()*.27);

  // Leaf blades share geometry and draw in batches, while their shapes and tints vary by patch.
  const foliageMaterial = new T.MeshStandardMaterial({ roughness: .88, side: T.DoubleSide });
  function leafGeometry(fern) {
    const vertices = [];
    function leaf(x, y, z, tipX, tipY, tipZ, width) {
      const midX = (x + tipX) / 2, midY = (y + tipY) / 2, midZ = (z + tipZ) / 2;
      vertices.push(x,y,z, midX-width,midY,midZ, tipX,tipY,tipZ,
        x,y,z, tipX,tipY,tipZ, midX+width,midY,midZ);
    }
    if (fern) {
      leaf(0,0,0, 0,.37,.52, .014);
      for (let i = 1; i <= 6; i++) {
        const t = i / 7;
        for (const side of [-1, 1]) {
          leaf(0,.37*t,.52*t, side*.18*(1-t*.72),.37*t+.05,.52*t+.12, .032*(1-t*.5));
        }
      }
    } else {
      for (const offset of [-.16, -.08, .025, .09, .16]) {
        leaf(offset*.25,0,0, offset,.42 + Math.abs(offset),.08 + offset*.2, .021);
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  const patches = [];
  for (const [near, far, count] of [[6.7, 8.5, 9], [3.5, 6.7, 22], [.48, 3.5, 47]]) {
    for (let i = 0; i < count; i++) {
      const z = shorelineZ + T.MathUtils.lerp(near, far, random());
      const x = -.85 + (i % 2 ? 1 : -1) * (1.8 + random()*2.65);
      patches.push({ x, z, reeds: near < 3.5 && i % 3 !== 0 });
    }
  }
  const plant = new T.Object3D();
  const color = new T.Color();
  for (const reeds of [false, true]) {
    const plants = patches.filter(patch => patch.reeds === reeds);
    const leaves = new T.InstancedMesh(leafGeometry(!reeds), foliageMaterial, plants.length * 5);
    let index = 0;
    for (const { x, z } of plants) {
      const rotation = random() * Math.PI * 2;
      for (let i = 0; i < 5; i++) {
        const px = x + (random() - .5)*.42, pz = z + (random() - .5)*.38;
        plant.position.set(px, groundHeight(px, pz), pz);
        plant.rotation.set(0, rotation + i * 1.26, 0);
        plant.scale.setScalar(.48 + random() * (reeds ? .76 : .94));
        plant.updateMatrix();
        leaves.setMatrixAt(index, plant.matrix);
        leaves.setColorAt(index++, color.setHSL(.24 + random()*.12, .32 + random()*.24, .22 + random()*.19));
      }
    }
    scene.add(leaves);
  }
  const mossStone = boulder.clone();
  mossStone.color.set('#728450');
  const stones = new T.InstancedMesh(rubble, mossStone, 26);
  for (let i = 0; i < stones.count; i++) {
    const { x, z } = patches[patches.length - 1 - i * 2];
    plant.position.set(x, groundHeight(x, z) - .035, z);
    plant.rotation.set(0, random() * Math.PI, 0);
    const size = .11 + random()*.24;
    plant.scale.set(size*1.5, size*.52, size);
    plant.updateMatrix();
    stones.setMatrixAt(i, plant.matrix);
  }
  scene.add(stones);
  for (let i = 0; i < 12; i++) {
    const { x, z } = patches[patches.length - 1 - i * 4];
    const side = x < -.85 ? -1 : 1;
    const y = groundHeight(x, z);
    tube([[x,y+.05,z],[x+side*.35,y+.17,z+.31],[x+side*.87,y+.06,z+.65]], .055, root);
    tube([[x+side*.32,y+.14,z+.3],[x+side*.53,y+.21,z+.22],[x+side*.67,y+.24,z+.15]], .024, root);
  }

  const trail = new Map();
  const growth = [];
  let lastStep = new T.Vector2(0,0);
  function leaveTrail(player) {
    const {x,z}=player.position;
    if (lastStep.distanceToSquared(new T.Vector2(x,z)) < .28) return;
    lastStep.set(x,z);
    const behindX=x-Math.sin(player.rotation.y)*.44;
    const behindZ=z-Math.cos(player.rotation.y)*.44;
    const key=Math.round(behindX*2)+','+Math.round(behindZ*2);
    if (trail.has(key)) return;
    const cluster = new T.Group();
    scene.add(cluster);
    for(let i=0;i<3;i++) mushroom(behindX+(random()-.5)*.35,behindZ+(random()-.5)*.29,.13+random()*.22,cluster);
    for(const plant of cluster.children) {
      plant.userData.size=plant.scale.x;
      plant.scale.setScalar(.01);
    }
    trail.set(key,cluster);
    growth.push({cluster,age:0});
    if (trail.size>220) {
      const oldest=trail.keys().next().value;
      trail.get(oldest).removeFromParent();
      trail.delete(oldest);
    }
  }

  const coreX = robotX - 1.55, coreZ = robotZ + .6;
  const coreAnchor = new T.Vector3(coreX, groundHeight(coreX, coreZ) + 1.24, coreZ);
  const batteryPoints = [{ id: 'cave-gardener', position: coreAnchor }];

  scene.add(new T.HemisphereLight('#a5d6e2','#51602b',1.03));
  const light = (color, intensity, distance, x,y,z) => {
    const lamp = new T.PointLight(color,intensity,distance);
    lamp.position.set(x,y,z);
    scene.add(lamp);
  };
  const leftBeamZ = -7.4;
  light('#91dbff',143,24,-3.7,6.6,leftBeamZ+2.7);
  light('#82bfce',77,15,2.6,4.25,1.8);
  light('#b6e65c',16,7.1,5.25,.8,-2.3);
  light('#dac8a3',26,7.3,2.6,4.7,-2.35);
  light('#3cbedf',57,14,-4,4,shorelineZ-2);

  const beam = new T.ShaderMaterial({
    transparent:true, depthWrite:false, side:T.DoubleSide, blending:T.AdditiveBlending,
    uniforms:{phase:{value:0}},
    vertexShader:`
      varying vec2 tex;
      void main(){tex=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
    `,
    fragmentShader:`
      uniform float phase;
      varying vec2 tex;
      void main(){
        float edge=pow(max(0.,1.-abs(tex.x*2.-1.)),1.7);
        float fade=smoothstep(0.,.38,tex.y)*(1.-smoothstep(.86,1.,tex.y));
        float threads=.65+.24*sin(tex.x*37.+tex.y*8.+phase*.3)+.1*sin(tex.x*95.-phase*.4);
        gl_FragColor=vec4(.22,.64,.84,edge*fade*threads*.15);
      }
    `
  });
  for(let i=0;i<4;i++) {
    const shaft=mesh(new T.PlaneGeometry(2.4+i*.22,9),beam,-4.3+i*.25,4.8,leftBeamZ+i*.31);
    shaft.rotation.set(-.12,.4*i,.31);
  }
  const haze = new T.ShaderMaterial({
    transparent:true, depthWrite:false, side:T.DoubleSide, blending:T.AdditiveBlending,
    vertexShader:beam.vertexShader,
    fragmentShader:`
      varying vec2 tex;
      void main(){
        vec2 p=(tex-.5)*2.;
        float veil=pow(max(0.,1.-dot(p,p)),2.1);
        float drift=.73+.15*sin(p.x*13.+p.y*8.)+.12*cos(p.x*26.-p.y*18.);
        gl_FragColor=vec4(.055,.29,.36,veil*drift*.31);
      }
    `
  });
  for(let i=0;i<6;i++) mesh(new T.PlaneGeometry(13-i*.7,1.85),haze,-3-i*.83,.68,-8.5-i*4.5);
  const dust = new Float32Array(320*3);
  const dustSizes = new Float32Array(320);
  const dustPhases = new Float32Array(320);
  for(let i=0;i<dust.length;i+=3) {
    dust[i]=(random()-.5)*14-2;
    dust[i+1]=.3+random()*6.8;
    dust[i+2]=5-random()*13;
    dustSizes[i/3]=.07+random()*.13;
    dustPhases[i/3]=random()*Math.PI*2;
  }
  const dustGeometry=new T.BufferGeometry()
    .setAttribute('position',new T.BufferAttribute(dust,3))
    .setAttribute('aSize',new T.BufferAttribute(dustSizes,1))
    .setAttribute('aPhase',new T.BufferAttribute(dustPhases,1));
  const spores=new T.Points(dustGeometry,makeSparkleMaterial('#b5f4ff',.68));
  scene.add(spores);

  function canMove(x,z) {
    if (z < shorelineZ || z > 5.8 || x < -7.2 || x > 5.2) return false;
    return !robot?.parent || !insideRobotFootprint(x, z);
  }
  function update(time,dt,player) {
    if (robot && !robot.parent && !insideRobotFootprint(player.position.x, player.position.z)) scene.add(robot);
    beam.uniforms.phase.value=time;
    spores.material.uniforms.uTime.value=time;
    spores.position.set(.2*Math.sin(time*.21),.16*Math.sin(time*.39),0);
    for (let i=growth.length-1;i>=0;i--) {
      const item=growth[i];
      item.age+=dt;
      const fraction=T.MathUtils.smoothstep(item.age,0,.55);
      for(const plant of item.cluster.children) plant.scale.setScalar(plant.userData.size*Math.max(.01,fraction));
      if(fraction===1) growth.splice(i,1);
    }
  }
  return { scene, placeRobot, makeSparkleMaterial, groundHeight, archPoint, canMove, leaveTrail, batteryPoints, update };
}
