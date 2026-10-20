// centre de la photographie ordinaire — photos comme feuilles de papier
// qui tombent de tous côtés et s'accumulent au centre de l'écran.
// Chaque feuille est attrapable et déplaçable à la souris (drag & drop).
// Optimisé : rendu à la demande, chargement unique + redimensionné + paresseux,
// géométrie partagée, zéro allocation par frame, matrices figées après l'atterrissage,
// picking sans allocation et limité à une fois par frame.
import * as THREE from 'three';

// ---------------------------------------------------------------- réglages
const FLY_DURATION = 0.85;     // durée de la chute d'une feuille (s)
const SPAWN_INTERVAL = 0.72;   // délai entre deux feuilles (s)
const CAMERA_Z = 6;
const TILT_MAX = Math.PI / 4;  // rotation de repos max : ±45°
const MAX_DPR = 1.5;           // plafond du pixel ratio
const MAX_TEX = 1024;          // taille max (px) des textures
const PREFETCH = 4;            // nb d'images chargées en avance
const BG_COLOR = 0x2a2e33;     // fond fixe
const PRE_PLACED = 10;         // feuilles posées d'abord, en séquence rapide
const PRE_INTERVAL = 0.09;     // délai entre deux feuilles de la séquence (s)
const Z_STEP = 0.012;          // épaisseur d'une feuille dans la pile

// ---------------------------------------------------------------- base
const canvas = document.getElementById('scene');
canvas.style.touchAction = 'none'; // sinon le drag tactile fait défiler la page
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  stencil: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(BG_COLOR, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.z = CAMERA_Z;
scene.add(camera);
const pile = new THREE.Group();
scene.add(pile);

const halfH = Math.tan(THREE.MathUtils.degToRad(45 / 2)) * CAMERA_Z;
const halfW = () => halfH * camera.aspect;
const now = () => performance.now() / 1000; // même base de temps que le timestamp de rAF

// Rendu à la demande : on ne dessine que si quelque chose a bougé.
let dirty = true;

// ---------------------------------------------------------------- feuilles
const images = await fetch('images.json').then(r => r.json());
const N = images.length;
const PRE_END = Math.min(PRE_PLACED, N); // feuilles de la séquence d'ouverture

// Géométrie partagée. Les bitmaps sont envoyés tels quels au GPU (flipY est
// ignoré par WebGL pour les ImageBitmap) : on retourne donc les UV une seule
// fois ici, plutôt que de retourner chaque image.
const unitPlane = new THREE.PlaneGeometry(1, 1);
{
  const uv = unitPlane.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - uv.getY(k));
  uv.needsUpdate = true;
}
const frameMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

const loads = new Array(N).fill(null);
const pickables = []; // plans visibles uniquement (Raycaster ignore .visible)

const leaves = images.map((file, i) => {
  const frame = new THREE.Mesh(unitPlane, frameMat);
  const plane = new THREE.Mesh(unitPlane, new THREE.MeshBasicMaterial({ color: 0xd8d2c8 }));
  plane.position.z = 0.0015;
  plane.userData.index = i;
  frame.scale.set(1.035, 1.035, 1);
  frame.updateMatrix(); plane.updateMatrix();
  frame.matrixAutoUpdate = plane.matrixAutoUpdate = false;

  const holder = new THREE.Group();
  holder.add(frame, plane);
  holder.visible = false;
  holder.userData = {
    index: i,
    target: { x: 0, y: 0, rot: 0, z: i * Z_STEP },
    anim: null,
  };
  pile.add(holder);
  return { holder, frame, plane, file, ready: false, placed: false };
});

function show(leaf) {
  if (leaf.holder.visible) return;
  leaf.holder.visible = true;
  pickables.push(leaf.plane);
  dirty = true;
}

// Chargement unique : fetch -> décodage (EXIF respecté) -> redimension éventuel
// (hors thread principal) -> texture + upload GPU anticipé.
function load(i) {
  return (loads[i] ??= (async () => {
    const leaf = leaves[i];
    try {
      const res = await fetch('images/' + encodeURI(leaf.file));
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      let bmp = await createImageBitmap(await res.blob(), { imageOrientation: 'from-image' });

      const s = Math.min(1, MAX_TEX / Math.max(bmp.width, bmp.height));
      if (s < 1) { // seulement si nécessaire : évite une copie inutile
        const small = await createImageBitmap(bmp, {
          resizeWidth: Math.max(1, Math.round(bmp.width * s)),
          resizeHeight: Math.max(1, Math.round(bmp.height * s)),
          resizeQuality: 'medium',
        });
        bmp.close();
        bmp = small;
      }

      const texture = new THREE.Texture(bmp);
      texture.flipY = false; // sans effet sur un ImageBitmap ; UV retournés sur la géométrie
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 2;
      texture.needsUpdate = true;

      const aspect = bmp.width / bmp.height;
      let ph = 1.5, pw = ph * aspect;
      if (pw > 2.4) { pw = 2.4; ph = pw / aspect; }
      leaf.plane.scale.set(pw, ph, 1);
      leaf.frame.scale.set(pw + 0.035, ph + 0.035, 1);
      leaf.plane.updateMatrix(); leaf.frame.updateMatrix();

      leaf.plane.material.map = texture;
      leaf.plane.material.color.set(0xffffff);
      leaf.plane.material.needsUpdate = true;

      renderer.initTexture(texture); // upload maintenant, pas au moment de la chute
    } catch (err) {
      console.warn('image non chargée :', leaf.file, err);
    }
    leaf.ready = true; // même en cas d'erreur, on ne bloque pas la séquence
    if (leaf.placed) show(leaf); // feuille pré-posée : n'apparaît qu'une fois prête (pas de carré gris)
    dirty = true;
  })());
}

function prefetch() {
  const end = Math.min(N, state.spawned + PREFETCH);
  for (let k = state.spawned; k < end; k++) load(k);
}

// ---------------------------------------------------------------- état
const state = {
  spawned: 0,
  playing: true,
  nextPreAt: 0,
  nextSpawnAt: Infinity, // la pluie normale démarre à la fin de la séquence d'ouverture
};
const pointer = { x: 0, y: 0 }; // NDC (drag & survol)
const active = new Set(); // feuilles en vol
let topZ = (N - 1) * Z_STEP + 2 * Z_STEP; // toujours au-dessus de la pile

// cible aléatoire dans le viewport réel (triangulaire, centrée)
function randomizeTarget(i) {
  const t = leaves[i].holder.userData.target;
  t.x = (Math.random() + Math.random() - 1) * halfW() * 0.62;
  t.y = (Math.random() + Math.random() - 1) * halfH * 0.75;
  t.rot = (Math.random() * 2 - 1) * TILT_MAX;
}

// pose une feuille à plat sur la pile, matrice figée
function placeLeaf(i) {
  const leaf = leaves[i];
  const { holder } = leaf;
  const t = holder.userData.target;
  randomizeTarget(i);
  leaf.placed = true;
  holder.position.set(t.x, t.y, t.z);
  holder.rotation.set(0, 0, t.rot);
  holder.updateMatrix();
  holder.matrixAutoUpdate = false;
  if (leaf.ready) show(leaf);
}

function spawnLeaf(t) {
  const i = state.spawned++;
  const leaf = leaves[i];
  const { holder } = leaf;
  randomizeTarget(i);
  const a = Math.random() * Math.PI * 2;
  const R = Math.sqrt(halfW() ** 2 + halfH ** 2) * 1.25;
  holder.matrixAutoUpdate = true;
  const from = {
    x: Math.cos(a) * R,
    y: Math.sin(a) * R,
    rot: THREE.MathUtils.clamp(holder.userData.target.rot + (Math.random() * 2 - 1) * 1.2, -Math.PI, Math.PI),
  };
  holder.userData.anim = { from, t0: t };
  holder.position.set(from.x, from.y, holder.userData.target.z);
  holder.rotation.set(0, 0, from.rot);
  leaf.placed = true;
  show(leaf);
  active.add(holder);
  prefetch();
}

const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);

// ---------------------------------------------------------------- pointeur / drag & drop
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const invPile = new THREE.Matrix4();
const localRay = new THREE.Ray();
const vLocal = new THREE.Vector3();
let drag = null;        // { leaf, ox, oy }
let hoverDirty = false; // le picking de survol n'est fait qu'une fois par frame
let cursor = 'default';
function setCursor(c) { if (c !== cursor) { cursor = c; canvas.style.cursor = c; } }

function updatePointer(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
}

function pickLeaf() {
  ndc.set(pointer.x, pointer.y);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  return hits.length ? hits[0] : null;
}

// intersection du rayon pointeur avec le plan z du repère local de la pile
// (suit correctement la parallaxe, contrairement à un plan monde)
function pointerOnPlane(z, out) {
  ndc.set(pointer.x, pointer.y);
  raycaster.setFromCamera(ndc, camera);
  invPile.copy(pile.matrixWorld).invert();
  localRay.copy(raycaster.ray).applyMatrix4(invPile);
  dragPlane.constant = -z;
  return localRay.intersectPlane(dragPlane, out) !== null;
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  updatePointer(e);
  const hit = pickLeaf();
  if (!hit) return;
  const leaf = leaves[hit.object.userData.index];
  const holder = leaf.holder;

  // détacher de la chute éventuelle, remettre à plat, passer au-dessus de tout
  active.delete(holder);
  holder.userData.anim = null;
  holder.matrixAutoUpdate = true;
  holder.rotation.x = 0;
  topZ += Z_STEP;
  holder.position.z = topZ;
  holder.userData.target.z = topZ;

  // offset de prise sur le même plan que celui utilisé pendant le drag : pas de saut
  if (!pointerOnPlane(topZ, vLocal)) return;
  drag = { leaf, ox: holder.position.x - vLocal.x, oy: holder.position.y - vLocal.y };
  canvas.setPointerCapture(e.pointerId);
  setCursor('grabbing');
  dirty = true;
  e.preventDefault();
});

function endDrag(e) {
  if (!drag) return;
  const holder = drag.leaf.holder;
  const t = holder.userData.target;
  t.x = holder.position.x;
  t.y = holder.position.y;
  t.rot = holder.rotation.z;
  holder.updateMatrix();
  holder.matrixAutoUpdate = false; // figer de nouveau
  drag = null;
  setCursor('grab');
  try { canvas.releasePointerCapture(e.pointerId); } catch { /* déjà relâché */ }
  dirty = true;
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// pointermove ne fait que mémoriser : tout le travail est déplacé dans la boucle
window.addEventListener('pointermove', (e) => {
  updatePointer(e);
  hoverDirty = true;
}, { passive: true });

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (state.spawned < N) state.playing = !state.playing;
    e.preventDefault();
  }
  if (e.key === 'r' || e.key === 'R') resetDemo();
});

// ---------------------------------------------------------------- resize (throttlé)
let resizePending = false;
function applyResize() {
  resizePending = false;
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  dirty = true;
}
window.addEventListener('resize', () => {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(applyResize);
});
applyResize();

// ---------------------------------------------------------------- reset
// 10 feuilles déjà posées en pile, puis la pluie reprend
function resetDemo() {
  drag = null;
  active.clear();
  pickables.length = 0;
  topZ = (N - 1) * Z_STEP + 2 * Z_STEP;
  for (let i = 0; i < N; i++) {
    const leaf = leaves[i];
    leaf.placed = false;
    leaf.holder.visible = false;
    leaf.holder.userData.anim = null;
    leaf.holder.userData.target.z = i * Z_STEP; // l'ordre de pile d'origine est restauré
    leaf.holder.matrixAutoUpdate = false;
  }
  const pre = Math.min(PRE_PLACED, N);
  for (let i = 0; i < pre; i++) load(i); // images de la séquence, chargées en avance
  state.spawned = 0;
  state.playing = true;
  state.nextPreAt = now() + 0.2;
  state.nextSpawnAt = Infinity;
  prefetch();
  dirty = true;
}
resetDemo();

// ---------------------------------------------------------------- boucle
function frame(ts) {
  const t = ts / 1000;

  // --- séquence d'ouverture : les premières feuilles se posent en rafale,
  //     les unes après les autres
  if (state.playing && state.spawned < PRE_END && t >= state.nextPreAt) {
    if (leaves[state.spawned].ready) {
      placeLeaf(state.spawned);
      state.spawned++;
      state.nextPreAt = t + PRE_INTERVAL;
      dirty = true;
      if (state.spawned === PRE_END) state.nextSpawnAt = t + 0.5; // puis la pluie reprend
    } else {
      load(state.spawned);
    }
  }

  // --- apparition automatique (attend que l'image soit prête)
  if (state.playing && state.spawned < N && t >= state.nextSpawnAt) {
    if (leaves[state.spawned].ready) {
      spawnLeaf(t);
      state.nextSpawnAt = t + SPAWN_INTERVAL * (0.75 + Math.random() * 0.5);
    } else {
      load(state.spawned);
    }
  }

  // --- animation des chutes (uniquement les feuilles en vol)
  for (const holder of active) {
    const a = holder.userData.anim;
    const p = THREE.MathUtils.clamp((t - a.t0) / FLY_DURATION, 0, 1);
    const e = easeOutCubic(p);
    const { target } = holder.userData;
    holder.position.x = a.from.x + (target.x - a.from.x) * e;
    holder.position.y = a.from.y + (target.y - a.from.y) * e;
    const wobble = Math.sin(p * Math.PI * 3) * 0.22 * (1 - e);
    holder.rotation.z = a.from.rot + (target.rot - a.from.rot) * e + wobble;
    holder.rotation.x = Math.sin(p * Math.PI) * 0.35 * (1 - p);
    // la feuille survole la pile (le balancement bascule ses coins en z) puis se
    // pose à plat. 1.25 >= demi-diagonale * amplitude de tilt : aucun perçage.
    holder.position.z = target.z + 1.25 * Math.sin(p * Math.PI) * (1 - p);
    if (p >= 1) {
      holder.position.set(target.x, target.y, target.z);
      holder.rotation.set(0, 0, target.rot);
      holder.updateMatrix();
      holder.matrixAutoUpdate = false;
      holder.userData.anim = null;
      active.delete(holder);
    }
  }
  if (active.size) dirty = true;

  // --- drag : une seule mise à jour par frame, quel que soit le débit du pointeur
  if (drag) {
    const holder = drag.leaf.holder;
    if (pointerOnPlane(holder.position.z, vLocal)) {
      holder.position.x = THREE.MathUtils.clamp(vLocal.x + drag.ox, -halfW() * 1.3, halfW() * 1.3);
      holder.position.y = THREE.MathUtils.clamp(vLocal.y + drag.oy, -halfH * 1.3, halfH * 1.3);
    }
    dirty = true;
  } else if (hoverDirty) {
    hoverDirty = false;
    setCursor(pickLeaf() ? 'grab' : 'default');
  }

  // --- rendu uniquement si la scène a changé (GPU au repos sinon)
  if (dirty) {
    dirty = false;
    renderer.render(scene, camera);
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// accès debug console
window.__dbg = { renderer, camera, scene, state, leaves, active, pickables };
