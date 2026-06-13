import * as THREE from "three";

export function createWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.0018);

  const hemi = new THREE.HemisphereLight(0xddddff, 0x666688, 1.5);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
  dirLight.position.set(50, 100, 40);
  scene.add(dirLight);

  const groundGeo = new THREE.PlaneGeometry(400, 400, 30, 30);
  groundGeo.rotateX(-Math.PI / 2);
  const gpos = groundGeo.attributes.position;
  for (let i = 0; i < gpos.count; i++) {
    gpos.setY(i, gpos.getY(i) + (Math.random() - 0.5) * 1.8);
  }
  gpos.needsUpdate = true;
  groundGeo.computeVertexNormals();

  const ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshLambertMaterial({ color: 0x3a8a3a }),
  );
  scene.add(ground);

  const collidables: THREE.Mesh[] = [];

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(6, 6, 6),
    new THREE.MeshLambertMaterial({ color: 0xff2222 }),
  );
  cube.position.set(3, 4, -12);
  scene.add(cube);
  collidables.push(cube);

  for (let i = 0; i < 25; i++) {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 4, 3.5),
      new THREE.MeshLambertMaterial({ color: 0x777799 }),
    );
    const angle = Math.random() * Math.PI * 2;
    const r = 6 + Math.random() * 32;
    b.position.set(
      Math.cos(angle) * r * (0.6 + Math.random() * 0.8),
      2.2,
      Math.sin(angle) * r
    );
    if (Math.random() < 0.3) {
      b.material.color.setHex(0xaaaa66 + ((Math.random() * 0x555555) | 0));
    }
    scene.add(b);
    collidables.push(b);
  }

  return { scene, cube, collidables };
}
