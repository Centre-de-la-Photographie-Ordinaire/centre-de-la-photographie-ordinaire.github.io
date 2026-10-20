// centre de la photographie ordinaire — page vitrine (diaporama très basique)
// Une image reste affichée DEUX SECONDES, puis une autre prend sa place,
// puis une autre, en boucle, en ordre séquentiel. Pas de défilé continu,
// pas de boutons, pas de pagination. Le logo (bas-gauche) mène au site.
'use strict';

// ---------------------------------------------------------------- réglages
const INTERVAL = 2000;      // temps d'affichage d'une image (ms)
const TARGET_RATIO = 0.64;  // part de l'écran occupée par la photo (bureau)
const TARGET_RATIO_PHONE = 0.86; // écran étroit : presque toute la largeur
const PHONE_MAX_W = 640;    // en dessous de cette largeur : « étroit »
const PREFETCH = 4;         // images préchargées d'avance

// ---------------------------------------------------------------- éléments
const img = document.getElementById('photo');

// ---------------------------------------------------------------- jeu d'images
// images.json : liste SÉQUENTIELLE des fichiers (ordre d'affichage conservé).
async function loadList() {
  try {
    const r = await fetch('images.json?t=' + Date.now());
    const data = await r.json();
    const list = Array.isArray(data) ? data : data.images;
    if (Array.isArray(list) && list.length) return list;
  } catch (e) { /* fallback ci-dessous */ }
  return [];
}

// ---------------------------------------------------------------- préchargement
const loaded = new Map(); // i -> Image (chargée)
function load(i) {
  const n = order.length;
  const k = ((i % n) + n) % n;
  if (!loaded.has(k)) {
    const im = new Image();
    im.decoding = 'async';
    im.src = order[k];
    loaded.set(k, im);
  }
  return loaded.get(k);
}
function prefetch(from) {
  for (let d = 1; d <= PREFETCH; d++) load(from + d);
}

// ---------------------------------------------------------------- dimensionnement
// La photo occupe une grande part de l'écran sans jamais le remplir ni se
// déformer (ratio conservé), et sans passer sous la barre du logo.
let currentSize = null; // { w, h } naturelles de la photo affichée
function sizeImage() {
  if (!currentSize) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const narrow = vw <= PHONE_MAX_W;
  const ratio = narrow ? TARGET_RATIO_PHONE : TARGET_RATIO;

  // place réservée en bas pour le logo (bottom 32 + h 40 = 72 ; mobile 16+32=48)
  const reservedBottom = (narrow ? 48 : 72) + 16;

  const maxW = vw * ratio;
  const maxH = vh - 2 * reservedBottom;

  const scale = Math.min(maxW / currentSize.w, maxH / currentSize.h);
  img.style.width = Math.round(currentSize.w * scale) + 'px';
  img.style.height = Math.round(currentSize.h * scale) + 'px';
}
window.addEventListener('resize', sizeImage);
window.addEventListener('orientationchange', sizeImage);

// ---------------------------------------------------------------- affichage
let current = -1;
let timer = null;

function show(k) {
  const n = order.length;
  const i = ((k % n) + n) % n;
  current = k;
  const im = load(i);
  im.addEventListener('load', () => {
    // une image plus récente a pris la main en attendant ?
    if (((k % n) + n) % n !== (((current % n) + n) % n)) return;
    currentSize = { w: im.naturalWidth, h: im.naturalHeight };
    img.src = im.src;
    sizeImage();
  }, { once: true });
  if (im.complete && im.naturalWidth) im.dispatchEvent(new Event('load'));
}

function tick() {
  show(current + 1);
  prefetch(current + 1);
  timer = setTimeout(tick, INTERVAL);
}

// ---------------------------------------------------------------- démarrage
const order = await loadList();
if (!order.length) {
  document.body.innerHTML = '<p style="padding:2rem">aucune image trouvée (images.json)</p>';
} else {
  // première image en attente que les 2 premières soient chargées
  const first = load(0);
  const second = load(1);
  const wait = Promise.all([first, second].map(im =>
    im.complete ? Promise.resolve() : new Promise(res => {
      im.addEventListener('load', res, { once: true });
      im.addEventListener('error', res, { once: true });
    })));
  wait.then(() => {
    show(0);
    timer = setTimeout(tick, INTERVAL);
  });
}

document.getElementById('stage').addEventListener('contextmenu', e => e.preventDefault());
