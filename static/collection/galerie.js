/* galerie.js — galeries de la page /collection/
 *
 * La page est un accordéon : une ligne par collection (<details
 * class="collection-item">), une seule ouverte à la fois (cf. baseof.html).
 * Quand une collection s'ouvre, sa galerie est construite : grande image
 * au-dessus, bandeau de vignettes en dessous (modèle romapublications).
 * Cliquer une vignette affiche l'image en grand ; les flèches (boutons,
 * clavier, balayage tactile) passent à la précédente ou à la suivante, en
 * boucle.
 *
 * Construction à l'ouverture, et non au chargement : la page ne télécharge
 * que les vignettes de la collection qu'on regarde, jamais les 532.
 *
 * Les données viennent du JSON écrit par tools/import-collection.py, inséré
 * par layouts/partials/galerie.html.
 *
 * L'URL porte l'état : #accordeon/3 ouvre la collection « accordéon » sur sa
 * 3e image (lien partageable, retour arrière du navigateur).
 */
(function () {
  'use strict';

  var dataEl = document.getElementById('galerie-donnees');
  var list = document.querySelector('[data-collection-list]');
  if (!dataEl || !list) return;

  var data;
  try {
    data = JSON.parse(dataEl.textContent);
  } catch (e) {
    return;
  }
  if (!data || !data.collections || !data.collections.length) return;

  // Racine des fichiers : /website-draft/collection/ (cf. GALERIE_BASE posé par
  // la page, qui tient compte du sous-chemin de GitHub Pages).
  var base = (window.GALERIE_BASE || '/collection/').replace(/\/?$/, '/');
  function asset(p) { return base + p; }

  var bySlug = {};
  data.collections.forEach(function (c) { bySlug[c.slug] = c; });

  // une entrée par <details>, dans l'ordre du DOM
  var items = [];
  function itemOf(slug) {
    for (var i = 0; i < items.length; i++) if (items[i].slug === slug) return items[i];
    return null;
  }

  /* --- une galerie = un <details> --- */

  function makeItem(el) {
    var slug = el.dataset.collection;
    var c = bySlug[slug];
    if (!c) return null;
    return {
      el: el,
      slug: slug,
      collection: c,
      root: el.querySelector('[data-galerie]'),
      image: el.querySelector('[data-galerie-image]'),
      lien: el.querySelector('[data-galerie-lien]'),
      pellicule: el.querySelector('[data-galerie-pellicule]'),
      vue: el.querySelector('[data-galerie-vue]'),
      prev: el.querySelector('[data-galerie-prev]'),
      next: el.querySelector('[data-galerie-next]'),
      legendeNum: el.querySelector('[data-galerie-legende-num]'),
      index: 0,
      built: false,
      thumbs: []
    };
  }

  function build(item) {
    if (item.built) return;
    item.built = true;
    item.root.hidden = false;
    var c = item.collection;
    var frag = document.createDocumentFragment();
    c.images.forEach(function (img, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'galerie-vignette';
      b.dataset.index = String(i);
      b.setAttribute('aria-label',
        'Image ' + (i + 1) + ' sur ' + c.images.length + ' — ' + c.name);
      var im = document.createElement('img');
      im.src = asset(img.thumb);
      im.alt = '';
      im.loading = 'lazy';
      im.decoding = 'async';
      im.draggable = false;
      // les vignettes sont toutes au même palier (480 sur le grand côté,
      // cf. tools/import-collection.py) : le bandeau les affiche à ~160 px,
      // 480 suffit donc même sur un écran 2x. Plus de srcset ici : une seule
      // largeur, autant de requêtes en moins.
      im.width = 480;
      im.height = Math.round(480 * (img.h / img.w));
      b.appendChild(im);
      frag.appendChild(b);
      item.thumbs.push(b);
    });
    item.pellicule.appendChild(frag);
    bind(item);
    show(item, 0, { silent: true });
  }

  function show(item, n, opts) {
    opts = opts || {};
    var imgs = item.collection.images;
    var count = imgs.length;
    if (!count) return;
    // bouclage : après la dernière on revient à la première
    item.index = ((n % count) + count) % count;

    var img = imgs[item.index];
    var num = item.index + 1;

    // srcset : le navigateur choisit le palier (cf. WIDTHS dans
    // tools/import-collection.py). `src` sert de repli aux navigateurs sans
    // srcset : on y met le palier 960 plutôt que le 2000, pour ne pas envoyer
    // la plus lourde à un vieux navigateur (le lien, lui, pointe vers la
    // grande image). La largeur/hauteur réelles du JSON réservent la place
    // avant chargement : le format du cadre suit la photo, il n'est plus
    // fixé en 4:3.
    var list = img.sources || [];
    item.image.srcset = list.map(function (s) {
      return asset(s.file) + ' ' + s.w + 'w';
    }).join(', ');
    item.image.sizes = sizesFor();
    item.image.src = asset(fallbackTier(img));
    item.image.alt = item.collection.name + ' — photographie ' + num + ' sur ' + count;
    item.image.width = img.w;
    item.image.height = img.h;

    item.lien.href = asset(img.large);
    item.legendeNum.textContent = num + ' / ' + count;

    item.thumbs.forEach(function (t, i) {
      var on = i === item.index;
      t.classList.toggle('est-active', on);
      t.setAttribute('aria-current', on ? 'true' : 'false');
    });

    scrollThumbIntoView(item);
    prefetchNeighbours(item);

    if (!opts.silent) {
      history.replaceState(null, '', '#' + item.slug + '/' + num);
    }
  }

  function scrollThumbIntoView(item) {
    var t = item.thumbs[item.index];
    var nav = item.pellicule;
    if (!t || !nav) return;

    // Position de la vignette DANS le bandeau. On ne peut pas utiliser
    // t.offsetLeft : le .galerie-pellicule n'est pas positionné, donc
    // offsetParent est le <body> et offsetLeft mesure depuis la page, pas
    // depuis le conteneur défilant. On passe par les rectangles, qui sont
    // toujours justes, en ajoutant le défilement courant.
    var box = nav.getBoundingClientRect();
    var r = t.getBoundingClientRect();
    var left = r.left - box.left + nav.scrollLeft;
    var width = r.width;
    var view = nav.clientWidth;

    // Marge de confort de chaque côté : la vignette ne doit pas coller au bord.
    var margin = 8;
    var target = null;
    if (left - margin < nav.scrollLeft) {
      // elle dépasse à gauche (ou est entièrement hors champ)
      target = left - margin;
    } else if (left + width + margin > nav.scrollLeft + view) {
      // elle dépasse à droite
      target = left + width + margin - view;
    }
    if (target === null) return;              // déjà visible : on ne bouge pas

    // On ne peut pas défiler au-delà du contenu.
    var max = Math.max(0, nav.scrollWidth - view);
    target = Math.max(0, Math.min(target, max));

    // Déplacement immédiat, jamais animé. Une animation « smooth » sur le
    // bandeau pose deux problèmes : deux déflements rapprochés (flèches
    // maintenues, touches répétées) s'interrompent l'un l'autre et laissent le
    // bandeau à mi-chemin, vignette active hors champ ; et passer de la
    // dernière vignette à la première traverse tout le bandeau en glissant, ce
    // qui n'a aucun sens. Un saut sec est plus lisible et toujours juste.
    nav.scrollLeft = target;
  }

  // `sizes` : largeur d'affichage probable de la grande image, pour que le
  // navigateur choisisse le bon palier AVANT de télécharger.
  //
  // Le CSS borne la grande image par la hauteur : max-height: min(58vh, 34rem)
  // et max-width: 100 %. Comme le cadre suit le format de la photo, la largeur
  // affichée dépend du format : un portrait est étroit, un paysage occupe la
  // largeur disponible. On rejoue ce calcul ici, sinon un portrait affiché à
  // 350 px téléchargerait du 2000.
  //
  // La largeur disponible vient de .main (max-width: 70rem = 1120 px, padding
  // 1.5rem de chaque côté) et de .galerie (padding 0.5rem de chaque côté, qui
  // passe à 0 sous 700 px). D'où : (100vw - 3rem) sous 700 px, sinon
  // min(1084 px, 100vw - 4rem).
  //
  // On ignore les 58vh (qui dépendent de la fenêtre) et on garde le plafond de
  // 34rem (544 px) : sous-estimer fait choisir un palier plus petit, jamais
  // une image cassée.
  var MAIN_MAX_H = 544;        // 34rem : plafond de hauteur du CSS
  var GALERIE_MAX_W = 1084;    // 70rem - 2*1.5rem (.main) - 2*0.5rem (.galerie)
  // Toutes les images sont dans un cadre 4:3 (cf. tools/import-collection.py) :
  // la largeur affichée ne dépend pas de la photo, seulement de la place
  // disponible. 544px de haut * 4/3 = 725px de large au plus.
  var MAIN_MAX_W = Math.round(Math.min(MAIN_MAX_H * 4 / 3, GALERIE_MAX_W));
  function sizesFor() {
    // • Sous 700 px de fenêtre, .galerie n'a plus de padding : la largeur
    //   disponible vaut 100vw - 3rem (les paddings de .main).
    // • Au-dessus, elle vaut min(1084px, 100vw - 4rem), puis 725px dès que la
    //   hauteur plafonne.
    return [
      '(max-width: 700px) calc(100vw - 3rem)',
      '(max-width: ' + Math.round(GALERIE_MAX_W + 64) + 'px) min('
        + MAIN_MAX_W + 'px, calc(100vw - 4rem))',
      MAIN_MAX_W + 'px'
    ].join(', ');
  }

  // Palier de repli d'une image : le plus petit qui fasse au moins 960 sur le
  // grand côté, sinon le plus grand disponible. Sert au `src` (navigateurs
  // sans srcset) et au préchargement des voisines.
  function fallbackTier(img) {
    var list = img.sources || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].w >= 960) return list[i].file;
    }
    return list.length ? list[list.length - 1].file : img.large;
  }

  var prefetched = {};
  function prefetchNeighbours(item) {
    var imgs = item.collection.images;
    var count = imgs.length;
    [item.index - 1, item.index + 1].forEach(function (i) {
      var j = ((i % count) + count) % count;
      var img = imgs[j];
      if (!img || prefetched[img.large]) return;
      prefetched[img.large] = true;
      // on précharge un palier intermédiaire (celui que le navigateur prendra
      // en pratique), pas la grande image pleine résolution : précharger du
      // 2000 px pour une voisine qu'on ne regardera peut-être pas coûte cher.
      var p = new Image();
      p.src = asset(fallbackTier(img));
    });
  }

  function bind(item) {
    item.prev.addEventListener('click', function () { show(item, item.index - 1); });
    item.next.addEventListener('click', function () { show(item, item.index + 1); });

    item.pellicule.addEventListener('click', function (e) {
      var b = e.target.closest('.galerie-vignette');
      if (!b) return;
      show(item, parseInt(b.dataset.index, 10));
    });

    // balayage tactile horizontal sur la grande image
    var x0 = null, y0 = null, moved = false;
    item.vue.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; moved = false;
    }, { passive: true });
    item.vue.addEventListener('touchmove', function (e) {
      if (x0 === null || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - x0;
      var dy = e.touches[0].clientY - y0;
      if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy)) moved = true;
    }, { passive: true });
    item.vue.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = ((e.changedTouches[0] || {}).clientX || 0) - x0;
      x0 = null;
      if (!moved || Math.abs(dx) < 40) return;
      show(item, dx < 0 ? item.index + 1 : item.index - 1);
    }, { passive: true });
  }

  /* --- ouverture / fermeture --- */

  Array.prototype.forEach.call(
    list.querySelectorAll('details.collection-item'),
    function (el) {
      var it = makeItem(el);
      if (!it) return;
      items.push(it);
      el.addEventListener('toggle', function () {
        if (!el.open) return;
        build(it);
      });
    }
  );

  // clavier ←/→ : la galerie ouverte
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var open = items.filter(function (i) { return i.el.open; })[0];
    if (!open) return;
    if (e.key === 'ArrowLeft') { show(open, open.index - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { show(open, open.index + 1); e.preventDefault(); }
  });

  /* --- liens directs #collection/3 --- */

  function openFromHash() {
    var h = (window.location.hash || '').replace(/^#/, '');
    var m = h.match(/^([a-z0-9-]+)(?:\/(\d+))?$/i);
    if (!m) return false;
    var it = itemOf(m[1]);
    if (!it) return false;
    var n = m[2] ? parseInt(m[2], 10) : 1;
    it.el.open = true;            // déclenche l'événement toggle → build()
    if (!it.built) build(it);
    show(it, n - 1, { silent: true });
    return true;
  }

  window.addEventListener('hashchange', openFromHash);

  if (!openFromHash()) {
    // pas de lien direct : on affiche le nombre d'images par ligne sans ouvrir
    // d'office la première collection (l'accordéon reste au repos, comme avant).
  }
})();
