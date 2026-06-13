import * as THREE from "three";
import { createWorld } from "./scene.js";
import type { CloudGroup } from "./world/clouds.js";
import { disposeCloudGeometry, getCloudPuffGeometry } from "./world/clouds.js";
import { initPlayerControls } from "./controls.js";
import {
  initBackgroundMusic,
  playBackgroundMusic,
  toggleBackgroundMusic,
  disposeBackgroundMusic,
  setMusicVolume,
  getMusicVolume,
} from "./audio.js";
import {
  buildMainMenu,
  injectMainMenuStyles,
  type GameModeId,
  setGameModeSelected,
  setMapPreviewVisible,
  setStartButtonEnabled,
} from "./ui/mainMenu.js";
import { createStaminaBar, type StaminaBar } from "./ui/staminaBar.js";
import { STAMINA_MAX } from "./player/constants.js";
import { disposeMeshes } from "./disposeMeshes.js";

const canvas = document.querySelector("#game") as HTMLCanvasElement;
canvas.setAttribute("aria-hidden", "true");

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
c.style.display = "none";

let prevTime = 0;

const PREVIEW_SIZE = 288;

let scene: THREE.Scene | undefined;
let cube: THREE.Mesh | undefined;
let camera: THREE.PerspectiveCamera | undefined;
let updateMovement: ((delta: number) => void) | undefined;
let disposeControls: (() => void) | undefined;

let gameStarted = false;

let selectedGameMode: GameModeId | null = null;

let previewRenderer: THREE.WebGLRenderer | undefined;
let currentWorld: ReturnType<typeof createWorld> | undefined;

let staminaBar: StaminaBar | undefined;
let getStamina: (() => number) | undefined;

let gameClouds: CloudGroup[] = [];

let playerMesh: THREE.Object3D | undefined;

const menuStyles = injectMainMenuStyles();
const menuStyle = menuStyles.element;
const mainMenu = buildMainMenu();
document.body.appendChild(mainMenu.root);

const previewCanvas = mainMenu.mapPreviewCanvas;
previewCanvas.width = PREVIEW_SIZE;
previewCanvas.height = PREVIEW_SIZE;
previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: false });
previewRenderer.setSize(PREVIEW_SIZE, PREVIEW_SIZE);

function startGame() {
  if (!selectedGameMode) {
    mainMenu.gameModeOptions[0]?.button.focus();
    return;
  }

  if (gameStarted || !mainMenu.root.parentNode) return;
  gameStarted = true;

  mainMenu.root.remove();

  let worldToUse: ReturnType<typeof createWorld>;
  if (currentWorld) {
    worldToUse = currentWorld;
    if (previewRenderer) {
      previewRenderer.dispose();
      previewRenderer = undefined;
    }
  } else {
    worldToUse = createWorld();
  }

  scene = worldToUse.scene;
  cube = worldToUse.cube;
  gameClouds = worldToUse.clouds;

  const playerAPI = initPlayerControls(
    renderer.domElement,
    worldToUse.collidables,
    worldToUse.ground,
    exitToMenu
  );
  camera = playerAPI.camera;
  updateMovement = playerAPI.updateMovement;
  disposeControls = playerAPI.dispose;
  getStamina = playerAPI.getStamina;

  playerMesh = playerAPI.playerMesh;
  if (playerMesh && scene) {
    scene.add(playerMesh);
  }

  c.style.display = "block";
  c.removeAttribute("aria-hidden");
  prevTime = performance.now();
  animate();

  staminaBar = createStaminaBar();
  document.body.appendChild(staminaBar.element);
  staminaBar.show();

  (async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen denied — still attempt pointer lock.
    }
    playerAPI.controls.lock();
  })();
}

function exitToMenu() {
  if (!gameStarted) return;

  gameStarted = false;

  if (disposeControls) {
    disposeControls();
    disposeControls = undefined;
  }

  const currentScene = scene;
  scene = undefined;
  cube = undefined;
  camera = undefined;
  updateMovement = undefined;

  c.style.display = "none";
  c.setAttribute("aria-hidden", "true");

  if (!mainMenu.root.parentNode) {
    document.body.appendChild(mainMenu.root);
  }

  if (mainMenu.mapPreviewCanvas) {
    const cvs = mainMenu.mapPreviewCanvas;
    if (!previewRenderer) {
      previewRenderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: false });
      previewRenderer.setSize(PREVIEW_SIZE, PREVIEW_SIZE);
    }
  }

  if (staminaBar) {
    staminaBar.remove();
    staminaBar = undefined;
  }
  getStamina = undefined;

  if (playerMesh) {
    if (currentScene) currentScene.remove(playerMesh);
    disposeMeshes(playerMesh);
    playerMesh = undefined;
  }

  gameClouds = [];
}

function animate() {
  requestAnimationFrame(animate);

  if (!scene || !camera || !updateMovement || !cube) return;

  const time = performance.now();
  const delta = (time - prevTime) / 1000;
  prevTime = time;

  updateMovement(delta);

  if (staminaBar && getStamina) {
    staminaBar.update(getStamina(), STAMINA_MAX);
  }

  for (const cloud of gameClouds) {
    const speed = cloud.userData.speed;
    cloud.position.x += speed * delta;

    if (cloud.position.x > 250) {
      cloud.position.x = -250 - Math.random() * 30;
      cloud.position.z = (Math.random() - 0.5) * 400;
      cloud.position.y = 82 + Math.random() * 55;
    }
  }

  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}

function disposeWorld(world: ReturnType<typeof createWorld>) {
  const sharedCloudGeo = getCloudPuffGeometry();
  world.scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.geometry !== sharedCloudGeo) {
      child.geometry.dispose();
    }
    const mat = child.material;
    if (Array.isArray(mat)) {
      for (const m of mat) m.dispose();
    } else {
      mat.dispose();
    }
  });
  disposeCloudGeometry();
}

function generatePreview(regenerate = false) {
  if (currentWorld && regenerate) {
    disposeWorld(currentWorld);
    currentWorld = undefined;
  }
  currentWorld = createWorld();

  const bbox = new THREE.Box3();
  currentWorld.collidables.forEach((m) => bbox.expandByObject(m));

  let center = new THREE.Vector3(0, 0, 0);
  let viewSize = 140;
  if (!bbox.isEmpty()) {
    center = bbox.getCenter(new THREE.Vector3());
    const s = bbox.getSize(new THREE.Vector3());
    viewSize = Math.max(s.x, s.z) * 1.4;
    if (viewSize < 60) viewSize = 140;
  }

  const halfH = viewSize / 2;
  const halfW = halfH;

  const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 1, 300);
  cam.position.set(center.x, 90, center.z);
  cam.lookAt(center.x, 0, center.z);

  const clouds = currentWorld.clouds;
  for (const cloud of clouds) {
    cloud.visible = false;
  }
  previewRenderer!.render(currentWorld.scene, cam);
  for (const cloud of clouds) {
    cloud.visible = true;
  }
}

mainMenu.regenerateButton.addEventListener("click", () => {
  generatePreview(true);
});

initBackgroundMusic();
mainMenu.updateVolumeDisplay(getMusicVolume());

mainMenu.volumeSlider.addEventListener("input", () => {
  const vol = parseFloat(mainMenu.volumeSlider.value);
  setMusicVolume(vol);
  mainMenu.updateVolumeDisplay(vol);
});

function selectGameMode(modeId: GameModeId): void {
  selectedGameMode = modeId;
  for (const option of mainMenu.gameModeOptions) {
    setGameModeSelected(option.button, option.statusEl, option.id === modeId);
  }
  setStartButtonEnabled(mainMenu.startButton, true);
  playBackgroundMusic();

  mainMenu.mapPreviewContainer.style.display = "flex";
  setMapPreviewVisible(mainMenu.root, true);
  if (!currentWorld) {
    generatePreview();
  }
}

for (const option of mainMenu.gameModeOptions) {
  option.button.addEventListener("click", () => {
    selectGameMode(option.id);
  });
}

mainMenu.startButton.addEventListener("click", startGame);

window.addEventListener("keydown", (e) => {
  if (mainMenu.root.parentNode && e.code === "Enter") {
    e.preventDefault();
    startGame();
    return;
  }
  if (e.code === "KeyM") {
    e.preventDefault();
    toggleBackgroundMusic();
    return;
  }
  if (e.key === "[" || e.key === "-") {
    e.preventDefault();
    setMusicVolume(Math.max(0, getMusicVolume() - 0.05));
  } else if (e.key === "]" || e.key === "+" || e.key === "=") {
    e.preventDefault();
    setMusicVolume(Math.min(1, getMusicVolume() + 0.05));
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (disposeControls) disposeControls();
    disposeBackgroundMusic();
    if (previewRenderer) {
      previewRenderer.dispose();
      previewRenderer = undefined;
    }
    if (currentWorld) {
      disposeWorld(currentWorld);
      currentWorld = undefined;
    }
    if (staminaBar) {
      staminaBar.remove();
      staminaBar = undefined;
    }
    getStamina = undefined;

    if (playerMesh) {
      disposeMeshes(playerMesh);
      playerMesh = undefined;
    }

    gameClouds = [];
    if (mainMenu.root.parentNode) mainMenu.root.remove();
    if (menuStyle.parentNode) menuStyle.remove();
    renderer.dispose();
  });
}

window.addEventListener("resize", () => {
  if (!camera) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
});
