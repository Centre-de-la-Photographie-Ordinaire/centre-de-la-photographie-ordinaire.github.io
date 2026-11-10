// centre de la photographie ordinaire — page vitrine (diaporama très basique)
//
// Une image reste affichée DEUX SECONDES, puis une autre prend sa place, en
// boucle, en ordre séquentiel. Boutons ‹ › (bas-gauche) et flèches clavier
// pour feuilleter : la lecture auto repart de l'image affichée. Le logo
// (bas-gauche) mène au site.
//
// CADRAGES — les visuels existent en trois montages, produits par
// tools/build-diaporama.sh (même sujet, cadrage adapté au terminal) :
//   desktop  16:9  1920 / 1280 px de large
//   tablet    4:3  1024 /  768
//   phone   9:16  1080 /  720
// On sert le montage qui correspond réellement aux proportions de l'écran — y
// compris un téléphone en paysage ou un écran de bureau en portrait — et,
// dans ce montage, la variante de largeur la plus proche de la densité réelle
// (1x / 2x). La photo couvre ensuite TOUTE la fenêtre, bord à bord.
'use strict';

// ---------------------------------------------------------------- réglages
const INTERVAL = 1499;           // temps d'affichage d'une image (ms)
// La photo occupe TOUT l'écran (bord à bord, plein cadre) : le cadrage
// (16:9 / 4:3 / 9:16) est choisi pour correspondre à l'écran, donc il n'y a
// presque rien à rogner. Voir sizeImage().
const PHONE_MAX_W = 640;         // en dessous de cette largeur : « étroit »
const PREFETCH = 4;              // images préchargées d'avance
const SETTLE_MS = 350;           // délai avant de figer le cadrage initial

const stage = document.getElementById('stage');
const img = document.getElementById('photo');

// ---------------------------------------------------------------- chargement de la liste
// images.json (écrit par tools/build-diaporama.sh) :
//   { order: ["01", …],
//     formats: { desktop: { aspect: "16:9", widths: [1920, 1280] }, … },
//     images: { desktop: [ { stem, base, w, h }, … ], … } }
let data = { order: [], formats: {}, images: {} };

async function loadData() {
  try {
    const r = await fetch('diaporama/images.json?t=' + Date.now(), { cache: 'no-cache' });
    const d = await r.json();
    if (d && Array.isArray(d.order) && d.order.length) return d;
  } catch (e) { /* traité plus bas */ }
  return { order: [], formats: {}, images: {} };
}

// ---------------------------------------------------------------- choix du cadrage
// D'après les proportions de la fenêtre ET la largeur en CSS px :
//   portrait (ratio < 0.90)         → phone   (9:16)
//   carré / tablette (ratio < 1.55) → tablet  (4:3)
//   paysage large                   → desktop (16:9)
// Le 4:3 tolère mieux les fenêtres peu hautes : un écran 1440×900 (1.6) ou un
// téléphone en paysage n'ont pas la place de montrer du 16:9 en grand une fois
// la barre du logo déduite, alors que le 4:3 remplit toute la hauteur.
function pickFormat() {
  const vw = window.innerWidth;
  const vh = Math.max(1, window.innerHeight);
  const ratio = vw / vh;
  if (vw <= PHONE_MAX_W || ratio < 0.90) return 'phone';
  // fenêtre très basse (téléphone en paysage, ~390 px de haut) : le 16:9
  // n'aurait plus que ~350 px de haut une fois la barre déduite, le 4:3 est
  // carrément plus généreux en surface visible.
  if (vh < 500) return 'tablet';
  if (ratio < 1.55) return 'tablet';
  return 'desktop';
}

// Le cadrage est figé après SETTLE_MS (le temps que la barre d'URL mobile se
// stabilise), puis n'est recalculé que si le terminal change réellement de
// famille — rotation, redimensionnement. Les oscillations de quelques pixels
// ne relancent rien.
let format = null;
let frozen = false;

function syncFormat() {
  const next = pickFormat();
  if (next !== format) {
    format = next;
    rebuild();
    return true;
  }
  return false;
}

// ---------------------------------------------------------------- variantes
// Une entrée par photo pour le cadrage courant : { base, w, h, src, jpg }.
// La variante de largeur visée est choisie d'après la place que la photo
// occupera à l'écran multipliée par la densité de l'écran.
let entries = [];
let loaded = new Map();   // i -> Image en cours de chargement / chargée
// ordre d'affichage = permutation aléatoire des entrées, tirée À CHAQUE
// VISITE (comme l'expérience diaporama). order[i] = indice dans entries ; on
// lit ensuite les photos dans l'ordre order[0], order[1], … en boucle.
let order = [];

// La photo couvre toute la fenêtre : on ne réserve plus de place pour le logo
// (il flotte par-dessus, en bas à gauche) ni de marge latérale.
function layoutBox() {
  return {
    maxW: window.innerWidth,
    maxH: Math.max(1, window.innerHeight),
  };
}

function variantWidth(box, natW, natH) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // largeur rendue en plein cadre = largeur couverte à l'écran
  const scale = Math.max(box.maxW / natW, box.maxH / natH);
  const want = Math.max(1, Math.round(natW * scale * dpr));
  const list = (data.images[format] || []);
  const widths = ((data.formats[format] || {}).widths || [])
    .slice()
    .sort((a, b) => a - b);
  const avail = widths.length ? widths : (natW && [natW] || []);
  if (!avail.length) return null;
  return avail.find(w => w >= want) || avail[avail.length - 1];
}

function rebuild() {
  const box = layoutBox();
  entries = (data.images[format] || []).map(it => {
    const w = variantWidth(box, it.w, it.h) || it.w;
    return {
      base: it.base,
      w: it.w,           // géométrie intrinsèque du cadrage (sert au dimensionnement)
      h: it.h,
      src: `diaporama/${it.base}-${w}.webp`,
      jpg: `diaporama/${it.base}-${w}.jpg`,
    };
  });
  loaded.clear();
  shuffle();
  stage.dataset.format = format;
  // dimensions intrinsèques exposées au CSS : permet de réserver la place
  // exacte de la photo avant même son chargement (pas de saut de mise en page)
  const ref = entries[0] || { w: 16, h: 9 };
  stage.style.setProperty('--nat-w', ref.w);
  stage.style.setProperty('--nat-h', ref.h);
}

// ---------------------------------------------------------------- ordre aléatoire
// Fisher-Yates sur les indices (copie, non destructif) : le mélange change à
// chaque chargement et à chaque changement de cadrage.
function shuffle() {
  const a = entries.map((_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  order = a;
}

// ---------------------------------------------------------------- préchargement
function load(i) {
  const n = entries.length;
  if (!n) return null;
  const k = ((i % n) + n) % n;
  if (!loaded.has(k)) {
    const im = new Image();
    im.decoding = 'async';
    im.src = entries[k].src;
    loaded.set(k, im);
  }
  return loaded.get(k);
}
function prefetch(from) {
  for (let d = 1; d <= PREFETCH; d++) load(from + d);
}

// ---------------------------------------------------------------- dimensionnement
// La photo occupe la plus grande place possible sans dépasser la fenêtre, sans
// toucher la barre du logo et sans déformation. Si le navigateur ne supporte
// pas WebP, on retombe sur le JPEG.
function sizeImage() {
  const n = order.length;
  const entry = entries[n ? order[((current % n) + n) % n] : 0];
  if (!entry) return;
  const box = layoutBox();
  // plein cadre : on dimensionne à la fenêtre entière et c'est object-fit:
  // cover (style.css) qui absorbe l'écart résiduel entre le cadrage et l'écran.
  // Le cadrage étant choisi pour l'écran, ce rognage reste marginal.
  const scale = Math.max(box.maxW / entry.w, box.maxH / entry.h);
  img.style.width = Math.round(entry.w * scale) + 'px';
  img.style.height = Math.round(entry.h * scale) + 'px';
}

let resizeTimer = null;
function onResize() {
  if (!frozen) { syncFormat(); return; }
  if (syncFormat()) {
    // le cadrage a changé : on repart de la photo courante dans le nouveau montage
    show(current, { restartTimer: false });
    return;
  }
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(sizeImage, 80);
}

// ---------------------------------------------------------------- affichage
let current = -1;
let timer = null;

// WebP ? (détection une fois pour toutes, pas de requête supplémentaire)
const SUPPORTS_WEBP = (() => {
  const c = document.createElement('canvas');
  return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
})();

function show(k, opts) {
  const n = order.length;
  if (!n) return;
  const i = order[((k % n) + n) % n];   // position dans l'ordre → entrée réelle
  current = k;
  const entry = entries[i];
  const im = load(i);

  const paint = () => {
    if (order[((current % n) + n) % n] !== i) return;   // une autre photo a pris la main
    img.src = SUPPORTS_WEBP ? entry.src : entry.jpg;
    sizeImage();
  };

  if (im.complete && im.naturalWidth) {
    paint();
  } else {
    im.addEventListener('load', paint, { once: true });
    im.addEventListener('error', () => {
      // WebP illisible mais JPEG présent → repli (une seule fois)
      if (img.src.indexOf('.webp') >= 0) img.src = entry.jpg;
    }, { once: true });
  }
}

function tick() {
  show(current + 1);
  prefetch(current + 1);
  timer = setTimeout(tick, INTERVAL);
}

// ---------------------------------------------------------------- navigation
// pas de boutons ‹ › dans la barre : clic (ou Espace / Entrée) sur la scène =
// pause / reprise, flèches left/right = feuilleter (la lecture repart ensuite).
function step(dir) {
  if (!order.length) return;
  show(current + dir);
  prefetch(current + dir);
  clearTimeout(timer);
  timer = setTimeout(tick, INTERVAL);
}

// ---------------------------------------------------------------- lecture / pause
// #state (bas-gauche, à côté du logo) est le bouton lecture/pause : ▶︎ pendant
// la lecture, ❚❚ en pause — même vocabulaire que l'expérience diaporama. La
// photo elle-même reste un raccourci (clic / Espace), cf. plus bas.
// le bouton #state suit l'état (libellé + aria-pressed) : il est le seul
// contrôle explicite, le reste de la page n'est qu'un raccourci.
const stateBtn = document.getElementById('state');
function syncState() {
  const paused = document.body.classList.contains('paused');
  stateBtn.setAttribute('aria-pressed', String(paused));
  stateBtn.setAttribute('aria-label', paused ? 'relancer le diaporama' : 'mettre le diaporama en pause');
}

function play() {
  if (timer) return;
  document.body.classList.remove('paused');
  stage.setAttribute('aria-label', 'photo : cliquer pour mettre en pause le diaporama');
  syncState();
  timer = setTimeout(tick, INTERVAL);
}

function pause() {
  if (!timer) return;
  clearTimeout(timer);
  timer = null;
  document.body.classList.add('paused');
  stage.setAttribute('aria-label', 'photo : cliquer pour relancer le diaporama');
  syncState();
}

function toggle() { timer ? pause() : play(); }

// ---------------------------------------------------------------- démarrage
(async function start() {
  data = await loadData();

  if (!data.order.length || !Object.keys(data.images).length) {
    document.body.innerHTML =
      '<p style="padding:2rem;color:#f2efe9;font-family:system-ui">' +
      'aucun visuel trouvé (images.json). lancer tools/build-diaporama.sh.</p>';
    return;
  }

  format = pickFormat();
  rebuild();

  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.code === 'ArrowRight') { e.preventDefault(); step(1); }
    // si #state a le focus, le navigateur déclenche déjà son clic (Entrée et
    // Espace) : on s'abstient pour ne pas basculer deux fois.
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    if (document.activeElement === stateBtn) return;
    e.preventDefault();
    toggle();
  });
  // le bouton ▶︎ / ❚❚ : le contrôle principal
  stateBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
  // clic sur la photo = même action (le logo mène au site : il garde sa
  // navigation, on n'arrête pas la lecture en quittant la page)
  stage.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));

  // on attend que les deux premières photos du cadrage retenu soient prêtes :
  // pas de démarrage sur un cadre vide.
  const first = load(0);
  const second = load(1);
  const ready = (im) => new Promise((res) => {
    if (!im || im.complete) return res();
    im.addEventListener('load', res, { once: true });
    im.addEventListener('error', res, { once: true });
  });
  await Promise.all([ready(first), ready(second)]);

  show(0);
  timer = setTimeout(tick, INTERVAL);
  // état initial : la lecture tourne (▶︎ affiché dans #state)
  play();

  // la barre d'URL mobile modifie la hauteur après le premier rendu : on fige
  // le cadrage une fois l'écran stabilisé (sans jamais changer de montage en
  // cours de lecture si la famille d'écran reste la même).
  setTimeout(() => {
    frozen = true;
    syncFormat();
  }, SETTLE_MS);
})();

stage.addEventListener('contextmenu', (e) => e.preventDefault());
