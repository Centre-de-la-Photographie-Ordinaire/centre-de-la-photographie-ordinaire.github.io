---
title: Contact
---

<h2>coordonnées</h2>

<address class="coordonnees">
  Centre de la photographie ordinaire<br />
  54 grande rue Paul Saint-Martin<br />
  32420 Simorre<br />
  <a href="mailto:bonjour@centredelaphotographieordinaire.fr">bonjour@centredelaphotographieordinaire.fr</a><br />
  <a href="tel:+33626822334">06 26 82 23 34</a>
</address>

<h2>horaires</h2>

<table class="horaires">
  <caption class="sr-only">horaires d'ouverture du centre</caption>
  <tbody>
    <tr class="horaires-ferme">
      <th scope="row"><span class="jour-att">lundi</span></th>
      <td>fermé</td>
    </tr>
    <tr>
      <th scope="row"><span class="jour-att">mardi</span></th>
      <td><time>10 h – 12 h 30</time> · <time>15 h – 18 h 30</time></td>
    </tr>
    <tr>
      <th scope="row"><span class="jour-att">mercredi</span></th>
      <td><time>10 h – 12 h 30</time> · <time>15 h – 18 h 30</time></td>
    </tr>
    <tr>
      <th scope="row"><span class="jour-att">jeudi</span></th>
      <td><time>10 h – 12 h 30</time> · <time>15 h – 18 h 30</time></td>
    </tr>
    <tr>
      <th scope="row"><span class="jour-att">vendredi</span></th>
      <td><time>10 h – 12 h 30</time> · <time>15 h – 18 h 30</time></td>
    </tr>
    <tr>
      <th scope="row"><span class="jour-att">samedi</span></th>
      <td><time>10 h – 12 h 30</time> · <time>15 h – 18 h 30</time></td>
    </tr>
    <tr>
      <th scope="row"><span class="jour-att">dimanche</span></th>
      <td><time>10 h 30 – 12 h 30</time></td>
    </tr>
  </tbody>
</table>

<p class="horaires-note">Habituellement ouvert du mardi au dimanche matin.<br />
À vérifier par téléphone avant de venir.</p>

<h2>venir au centre</h2>

<div class="carte-simorre" id="carte-simorre"
     data-lat="43.4499035" data-lon="0.7347349" data-zoom="9"
     data-titre="54 grande rue Paul Saint-Martin, 32420 Simorre">
  <!-- la carte Leaflet est montée par le script en bas de page ; sans JS, ce
       repli garde l'essentiel : l'adresse et un lien d'itinéraire. -->
  <p class="carte-repli">
    <a href="https://maps.app.goo.gl/XvAyLPqoYrjZKy6D9">Ouvrir la carte (54 grande rue Paul Saint-Martin, Simorre)</a>
  </p>
</div>

<h2>écrire au centre</h2>

<form class="form-contact" data-form-contact action="https://formspree.io/f/xoedbqrj" method="POST" novalidate>
  <label>nom
    <input type="text" name="nom" autocomplete="name" required />
  </label>
  <label>adresse e-mail
    <input type="email" name="email" autocomplete="email" required />
  </label>
  <label>message
    <textarea name="message" rows="6" required></textarea>
  </label>
  <input type="hidden" name="_subject" value="Nouveau message · centre de la photographie ordinaire" />
  <button type="submit">envoyer</button>
</form>

<p class="parutions-message" data-form-contact-message role="status" aria-live="polite"></p>

<script>
/* envoi du formulaire de contact sans quitter la page : mêmes règles que le
   formulaire de la page collection (fetch + `Accept: application/json`,
   confirmation dans un bloc aria-live, pas de redirection Formspree). */
(function () {
  var form = document.querySelector('[data-form-contact]');
  if (!form) return;
  var msg = document.querySelector('[data-form-contact-message]');
  var bouton = form.querySelector('button[type="submit"]');

  function dire(texte, etat) {
    msg.textContent = texte;
    msg.className = 'parutions-message ' + (etat ? 'est-' + etat : '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      var invalide = form.querySelector(':invalid');
      dire('Merci de remplir tous les champs avec une adresse e-mail valide.', 'erreur');
      if (invalide) invalide.focus();
      return;
    }
    bouton.disabled = true;
    dire('Envoi…', 'attente');
    fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    }).then(function (r) {
      if (r.ok) {
        form.reset();
        dire('C’est noté : votre message est bien envoyé, nous vous répondrons rapidement.', 'ok');
      } else {
        return r.json().then(function (d) {
          var err = d && d.errors && d.errors.map(function (x) { return x.message; }).join(' ');
          dire(err || 'L’envoi n’a pas abouti. Réessayez dans un instant.', 'erreur');
        }, function () {
          dire('L’envoi n’a pas abouti. Réessayez dans un instant.', 'erreur');
        });
      }
    }).catch(function () {
      dire('Connexion impossible. Vérifiez votre réseau et réessayez.', 'erreur');
    }).finally(function () {
      bouton.disabled = false;
    });
  });
})();
</script>

{{< carte-leaflet >}}
