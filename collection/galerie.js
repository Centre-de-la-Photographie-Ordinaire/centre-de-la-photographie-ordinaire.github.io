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
      // toutes les images sont dans le cadre 4:3 paysage (cf.
      // tools/import-collection.py) : dimensions fixes, la place est réservée
      // avant le chargement et la page ne saute pas.
      im.width = 480;
      im.height = 360;
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

    item.image.src = asset(img.large);
    item.image.alt = item.collection.name + ' — photographie ' + num + ' sur ' + count;
    item.image.width = 2000;
    item.image.height = 1500;

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
    if (!t) return;
    var box = item.pellicule.getBoundingClientRect();
    var r = t.getBoundingClientRect();
    // centre la vignette active dans le bandeau, seulement si elle en sort
    if (r.left < box.left + 8 || r.right > box.right - 8) {
      item.pellicule.scrollTo({
        left: t.offsetLeft - item.pellicule.clientWidth / 2 + r.width / 2,
        behavior: 'smooth'
      });
    }
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
      var p = new Image();
      p.src = asset(img.large);
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
