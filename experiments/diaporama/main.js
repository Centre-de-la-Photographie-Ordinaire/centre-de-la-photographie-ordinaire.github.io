// centre de la photographie ordinaire — diaporama
// Une photo apparaît à intervalle régulier, sans fondu ni effet. L'ordre est
// aléatoire à chaque visite. Clic (ou Espace) = pause / reprise.
// Les photos s'affichent grand, dans le bon sens de lecture.
import { shuffle } from './util.js';

// ---------------------------------------------------------------- réglages
const INTERVAL = 2500;   // délai entre deux photos (ms)
const TARGET_RATIO = 0.64; // part de la plus petite dimension du viewport
                           // occupée par la photo (bureau : grande, mais pas
                           // plein écran, laisse la place au bouton + points)
const TARGET_RATIO_PHONE = 0.86; // sur écran étroit (téléphone en portrait),
                           // on profite presque de toute la largeur
const PHONE_MAX_W = 640;   // largeur en dessous de laquelle on est « étroit »
const DOTS_EACH_SIDE = 1;  // points gris de chaque côté du point actif

// ---------------------------------------------------------------- éléments
const stage = document.getElementById('stage');
const img = document.getElementById('photo');
const dotsEl = document.getElementById('dots');

// ---------------------------------------------------------------- jeu d'images
// images.json liste les fichiers du dossier `images/`. On MÉLANGE la liste à
// chaque visite : on ne commence jamais par la même photo.
const files = await fetch('images.json').then((r) => r.json());
const order = shuffle(files.slice());
const N = order.length;

// ---------------------------------------------------------------- préchargement
// On précharge les images via `new Image()` pour qu'elles soient en cache
// quand vient leur tour. Le sens de lecture (EXIF) est appliqué par le
// navigateur : CSS `image-orientation: from-image` sur #photo, et les
// navigateurs modernes respectent déjà l'orientation EXIF par défaut.
const loaded = new Array(N).fill(null);
function load(k) {
  const i = ((k % N) + N) % N;
  return (loaded[i] ??= new Promise((resolve) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = () => { console.warn('image non chargée :', order[i]); resolve(null); };
    im.src = 'images/' + encodeURI(order[i]);
  }));
}

// précharge quelques photos à l'avance (hors affichage) pour éviter un blanc
function prefetch(from, count = 4) {
  for (let k = from; k < from + count; k++) load(k);
}

// ---------------------------------------------------------------- affichage
let current = -1;

// Dimensionne la photo pour occuper une grande part de l'écran, sans jamais
// remplir l'écran ni déformer (ratio conservé) et sans passer sous le bouton
// lecture/pause ni les points.
//
// Sur téléphone en portrait, la plus petite dimension est la largeur : se
// baser sur vmin rendrait la photo minuscule. On dimensionne donc par rapport
// aux DEUX dimensions : la largeur disponible, et la hauteur disponible une
// fois réservée la place du bouton et des points. La photo est centrée
// verticalement, donc l'espace libre est réparti moitié en haut / moitié en
// bas : il faut imgH <= vh - 2 * reserve pour ne rien chevaucher.
// Sur écran étroit, on autorise une part bien plus grande de la largeur.
let currentSize = null; // { w, h } naturelles de la photo affichée
function sizeImage() {
  if (!currentSize) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const narrow = vw <= PHONE_MAX_W;
  const ratio = narrow ? TARGET_RATIO_PHONE : TARGET_RATIO;

  // place occupée en bas par le bouton lecture/pause + les points, mesurée
  // (bouton : bottom 52 + hauteur 52 = 104 ; mobile : 42 + 44 = 86), plus une
  // petite marge de sécurité
  const reservedBottom = (narrow ? 86 : 104) + 16;

  const maxW = vw * ratio;
  const maxH = vh - 2 * reservedBottom;

  const scale = Math.min(maxW / currentSize.w, maxH / currentSize.h);
  img.style.width = Math.round(currentSize.w * scale) + 'px';
  img.style.height = Math.round(currentSize.h * scale) + 'px';
}
window.addEventListener('resize', sizeImage);
window.addEventListener('orientationchange', sizeImage);

async function show(k) {
  const im = await load(k);
  if (!im || ((k % N) + N) % N !== (((current % N) + N) % N)) return; // une photo plus récente a pris la main
  currentSize = { w: im.naturalWidth, h: im.naturalHeight };
  img.src = im.src;
  img.alt = '';
  sizeImage();
}

// ---------------------------------------------------------------- pagination
// Le fonds fera ~500 photos : pas un point par photo. On affiche un petit jeu
// fixe — DOTS_EACH_SIDE points gris de chaque côté du point ACTIF centré.
// À chaque nouvelle photo, le point central « pulse » pour marquer le
// défilement, sans indiquer une position absolue dans le jeu.
function buildDots() {
  dotsEl.replaceChildren();
  const total = DOTS_EACH_SIDE * 2 + 1;
  const mid = DOTS_EACH_SIDE;
  for (let d = 0; d < total; d++) {
    const el = document.createElement('span');
    el.className = 'dot' + (d === mid ? ' active' : '');
    dotsEl.appendChild(el);
  }
}

const activeDot = () => dotsEl.querySelector('.dot.active');

// Petite animation du bandeau à chaque passage de photo.
// `dir` vaut +1 (photo suivante) ou -1 (photo précédente).
// Seul le point central bouge : il pulse et glisse du côté du mouvement. Les
// points gris restent immobiles. On force un reflow entre deux animations pour
// qu'elles puissent se rejouer même à 1 image/seconde.
function animateDots(dir = 1) {
  const dirCls = dir < 0 ? 'prev' : 'next';
  const el = activeDot();
  if (!el) return;
  el.classList.remove('pulse', 'next', 'prev');
  void el.offsetWidth;                      // rejoue l'animation
  el.classList.add('pulse', dirCls);
}

// ---------------------------------------------------------------- état
let playing = false;
let timer = null;

// avance auto : sens toujours « suivant ». La boucle est infinie : après la
// dernière photo on revient à la première (modulo).
function advance() {
  if (!N) return;
  current = (current + 1) % N;
  show(current);
  animateDots(1);
  prefetch(current + 1);
}

// navigation manuelle : on passe à la photo précédente / suivante et on met
// la lecture automatique en pause (pour pouvoir feuilleter tranquillement).
// Un clic ou Espace relance le diaporama. Le parcours reste infini dans les
// deux sens (modulo positif).
function step(dir) {
  if (!N) return;
  pause();
  current = ((current + dir) % N + N) % N;
  show(current);
  animateDots(dir);
  prefetch(current + dir);
}

function start() {
  if (timer) return;
  playing = true;
  document.body.classList.remove('paused');
  stage.setAttribute('aria-label', 'Photo : cliquer pour mettre en pause le diaporama');
  if (current < 0) advance(); // première photo tout de suite
  timer = setInterval(advance, INTERVAL);
}

function pause() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  playing = false;
  document.body.classList.add('paused');
  stage.setAttribute('aria-label', 'Photo : cliquer pour relancer le diaporama');
}

function toggle() { playing ? pause() : start(); }

// ---------------------------------------------------------------- interactions
stage.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
stage.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); toggle(); }
  if (e.code === 'ArrowLeft') { e.preventDefault(); step(-1); }
  if (e.code === 'ArrowRight') { e.preventDefault(); step(1); }
});
// clavier au niveau fenêtre aussi (au cas où le focus n'est pas sur la scène)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && document.activeElement !== stage) { e.preventDefault(); toggle(); return; }
  if (document.activeElement === stage) return; // déjà géré par la scène
  if (e.code === 'ArrowLeft') { e.preventDefault(); step(-1); }
  if (e.code === 'ArrowRight') { e.preventDefault(); step(1); }
});

// dissuasion du « Enregistrer l'image sous… » — pas une protection absolue,
// toute image affichée est de toute façon téléchargée par le navigateur.
stage.addEventListener('contextmenu', (e) => e.preventDefault());
img.addEventListener('dragstart', (e) => e.preventDefault());

// ---------------------------------------------------------------- démarrage
if (!N) {
  console.warn('images.json est vide');
} else {
  buildDots();
  prefetch(0); // charge la première avant de lancer
  start();
  // accès debug console
  window.__dbg = { order, start, pause, toggle, step, animateDots, get current() { return current; } };
}
