---
title: page 1 · objet
sansTitre: true
---

<div class="objet-layout">
<div class="objet-col-texte">
<p>Le Centre de la photographie ordinaire abrite la collection « le commun des mortels » : 3 000 000 de photographies de famille, classées en plus de 400 thèmes.</p>
<p>3 000 000 de photographies amateurs et anonymes déploient un immense récit humain, du début de la photographie à nos jours. Le classement en plus de 400 thèmes révèle l'histoire du regard et des pratiques photographiques populaires.</p>
<p>La collection sauvegarde ce patrimoine vernaculaire et œuvre à changer notre rapport aux photographies devenues anonymes.</p>

<p class="objet-liens">
<button type="button" class="objet-lien" data-panneau="panneau-interview" aria-expanded="false" aria-controls="panneau-interview">interview</button>
<button type="button" class="objet-lien active" data-panneau="panneau-collection" aria-expanded="true" aria-controls="panneau-collection">la collection</button>
<button type="button" class="objet-lien" data-panneau="panneau-ordinaire" aria-expanded="false" aria-controls="panneau-ordinaire">l'ordinaire</button>
</p>

<div class="objet-panneau" id="panneau-interview" hidden>
<h2>vidéo d'interview</h2>
<p class="provisoire">vidéo à venir : aucun fichier disponible pour l'instant (bead org-9s8.3)</p>
<figure class="video-ph">
<div class="video-cadre" role="img" aria-label="emplacement de la vidéo d'interview">▶</div>
<figcaption>vidéo d'interview : fichier à recevoir, puis intégré ici (lecture locale, pas de plateforme tierce si possible)</figcaption>
</figure>
</div>

<div class="objet-panneau" id="panneau-collection">
<h2>l'histoire de la collection</h2>
<p class="provisoire">contenu provisoire : à valider avec le centre (bead org-9s8.3)</p>
<p>La collection naît d'une collection privée, portée par Élise Pic. Elle est aujourd'hui confiée à une association qui œuvre à sa sauvegarde et à sa mise en valeur, et s'ouvre au fonds de donation : les familles peuvent confier leurs photographies pour qu'elles rejoignent le commun des mortels.</p>
<p>La liste des séries : <a href="/collection/">page 4 · collection →</a></p>
<blockquote>Question en attente de réponse du centre (suivi dans le bead org-9s8.8) : faut-il présenter ici la structure administrative du centre (statut, gouvernance, modalités de donation) ?</blockquote>
</div>

<div class="objet-panneau" id="panneau-ordinaire" hidden>
<h2>le sens de notre travail sur l'ordinaire</h2>
<p class="provisoire">contenu provisoire : texte définitif à venir (bead org-9s8.3)</p>
<p>Le « commun des mortels » rassemble des photographies sans auteur connu, prises par et pour des familles. Notre travail consiste à donner leur place à ces images devenues anonymes : les sauvegarder, les classer en thèmes, les exposer.</p>
<p>L'ordinaire photographié (les repas, les fêtes, les vacances, les jardins) est une archive de la vie courante. Le centre s'attache à montrer ce que ces 3 000 000 d'images disent de nous, et à changer notre rapport aux photographies que personne n'a « faites pour l'histoire ».</p>
</div>
</div>

<div class="objet-col-image">
<figure class="objet-image-principale">
<img src="/images/front.webp" alt="Photographie issue de la collection « le commun des mortels »" width="1400" height="932" loading="eager">
</figure>

<div class="logo-partenaires">
<div class="logo-cpo">
{{< logo size=80 >}}
</div>
<div class="logo-ministere">
<img class="logo-bicentenaire" src="/images/bicentenaire_circle_logo.png" alt="Bicentenaire de la photographie 1826–2026" width="736" height="334">
<p class="mention-bicentenaire">De septembre 2026 à septembre 2027, les expositions et ateliers proposés sont labellisés par le Ministère de la Culture dans le cadre du Bicentenaire de la Photographie.</p>
</div>
</div>
</div>
</div>

<script>
/* objet — trois liens légers (remplacent la barre des 3 points) :
   clic sur un lien → son panneau s'ouvre sur place ; re-clic ou autre lien → referme.
   En arrivant : le panneau « la collection » est ouvert et son lien actif par défaut. */
(function () {
var liens = Array.prototype.slice.call(document.querySelectorAll('.objet-lien'));
var panneaux = Array.prototype.slice.call(document.querySelectorAll('.objet-panneau'));

function closeAll() {
panneaux.forEach(function (p) { p.hidden = true; });
liens.forEach(function (l) { l.classList.remove('active'); l.setAttribute('aria-expanded', 'false'); });
}

liens.forEach(function (lien) {
lien.addEventListener('click', function () {
var panneau = document.getElementById(lien.dataset.panneau);
if (!panneau) return;
var etaitOuvert = !panneau.hidden;
closeAll();
if (!etaitOuvert) {
panneau.hidden = false;
lien.classList.add('active');
lien.setAttribute('aria-expanded', 'true');
}
});
});

document.addEventListener('keydown', function (e) {
if (e.key === 'Escape') closeAll();
});
})();
</script>
