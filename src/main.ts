import * as THREE from "three";
import { createWorld } from "./scene.js";
import { initPlayerControls } from "./controls.js";

// #region agent log
function agentLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
) {
  const entry = {
    sessionId: "94dacd",
    location,
    message,
    data,
    timestamp: Date.now(),
    hypothesisId,
  };
  const key = "debug-94dacd";
  const prev = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
  prev.push(entry);
  localStorage.setItem(key, JSON.stringify(prev.slice(-50)));
  fetch("http://127.0.0.1:7339/ingest/c28d5406-c153-4730-ac73-09623cb09216", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "94dacd",
    },
    body: JSON.stringify(entry),
  }).catch(() => {});
}
// #endregion

const canvas = document.querySelector("#game") as HTMLCanvasElement;

document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.documentElement.style.height = "100%";

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x87ceeb);

const c = renderer.domElement;
c.style.position = "fixed";
c.style.left = "0";
c.style.top = "0";
c.style.width = "100%";
c.style.height = "100%";
c.style.zIndex = "1";
c.style.display = "block";

const { scene, cube } = createWorld();

const { camera, updateMovement, dispose: disposeControls } = initPlayerControls(renderer.domElement);

let prevTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;
  prevTime = time;

  updateMovement(delta);

  // Keep the red cube spinning so we can see rendering is alive
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}
animate();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeControls();
    renderer.dispose();
  });
}

window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
});
