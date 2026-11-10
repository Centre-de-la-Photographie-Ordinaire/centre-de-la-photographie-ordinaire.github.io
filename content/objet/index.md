---
title: objet
sansTitre: true
---

<div class="objet-layout">
<div class="objet-col-texte">
<p><span class="objet-ligne-titre">Le Centre de la photographie ordinaire abrite la collection :<br />3 000 000 de photographies de famille, classées en plus de 400 thèmes.</span></p>
<p>3 000 000 de photographies amateurs et anonymes déploient un immense récit humain, du début de la photographie à nos jours. Le classement en plus de 400 thèmes révèle l'histoire du regard et des pratiques photographiques populaires.</p>
<p>La collection sauvegarde ce patrimoine vernaculaire et œuvre à changer notre rapport aux photographies devenues anonymes.</p>
</div>

<div class="objet-col-image">
<figure class="objet-image-principale">
<picture>
<source srcset="{{< rel "images/bloc_objet.webp" >}}" type="image/webp">
<img src="{{< rel "images/bloc_objet.jpg" >}}" alt="Photographies de la collection — visuel du bicentenaire de la photographie" width="1400" height="1133" loading="eager" decoding="async">
</picture>
</figure>

<ul class="objet-liens">
<li><button type="button" class="objet-lien" data-dialog="panneau-interview" aria-expanded="false" aria-controls="panneau-interview"><span class="objet-lien-icone" aria-hidden="true"></span><span class="objet-lien-texte">interview</span></button></li>
<li><button type="button" class="objet-lien" data-dialog="panneau-photographie-ordinaire" aria-expanded="false" aria-controls="panneau-photographie-ordinaire"><span class="objet-lien-icone" aria-hidden="true"></span><span class="objet-lien-texte">la photographie ordinaire</span></button></li>

</ul>
</div>
</div>

<!-- pied de page de la page objet : le label du Bicentenaire (logos + mention),
     repris de la page esprit. -->
<div class="logo-partenaires objet-partenaires">
  <div class="logo-cpo">
    {{< logo size=96 >}}
  </div>
  <div class="logo-ministere">
    <img class="logo-bicentenaire" src="{{< rel "images/bicentenaire_circle_logo.png" >}}" alt="Bicentenaire de la photographie 1826–2026" width="736" height="334">
    <p class="mention-bicentenaire">De septembre 2026 à septembre 2027, les expositions et ateliers proposés sont du labellisés par le ministère de la Culture dans le cadre Bicentenaire de la Photographie</p>
  </div>
</div>

<!-- Les « panneaux » sont des <dialog> natifs (cf. components/dialog, v6) :
     fond jaune de la charte, texte noir, positionnés en haut à droite du
     viewport. Le JS en bas de page les ouvre en modal (showModal()) : Échap,
     clic sur le fond et retour du focus au déclencheur sont natifs. -->
<dialog class="objet-dialog objet-dialog-video" id="panneau-interview" aria-labelledby="panneau-interview-titre">
<div class="objet-dialog-entete">
<h2 class="objet-dialog-titre" id="panneau-interview-titre">vidéo d'interview</h2>
<div class="objet-dialog-actions">
<button type="button" class="objet-dialog-agrandir" data-dialog-agrandir aria-pressed="false" aria-label="Agrandir la vidéo" title="Agrandir la vidéo"><span class="objet-dialog-agrandir-ico" aria-hidden="true">&#9974;</span></button>
<button type="button" class="objet-dialog-fermer" data-dialog-close aria-label="Fermer">&times;</button>
</div>
</div>
<div class="objet-dialog-corps">
<figure class="video-ph">
<div class="video-cadre">
<video class="video-interview" id="video-interview" controls preload="none" playsinline
 data-src="{{< rel "videos/interview-extrait.mp4" >}}"
 poster="{{< rel "images/interview-poster.jpg" >}}"
 width="1280" height="720" aria-label="Interview de Jacques et Élise, extrait de 44 secondes">
Votre navigateur ne sait pas lire les vidéos au format MP4.
<a href="{{< rel "videos/interview-extrait.mp4" >}}">Télécharger l'extrait (.mp4, 9 Mo)</a>
</video>
</div>
<figcaption>extrait de l'interview — 44 secondes. La vidéo complète (14 min) sera intégrée une fois validée.</figcaption>
</figure>
</div>
</dialog>

<!-- le panneau « la photographie ordinaire » : le texte de référence, celui
     qui dit ce qu'est la photographie ordinaire et pourquoi le centre la
     collecte (source : photographie_ordinaire.txt). -->
<dialog class="objet-dialog" id="panneau-photographie-ordinaire" aria-labelledby="panneau-photographie-ordinaire-titre">
<div class="objet-dialog-entete">
<h2 class="objet-dialog-titre" id="panneau-photographie-ordinaire-titre">la photographie ordinaire</h2>
<button type="button" class="objet-dialog-fermer" data-dialog-close aria-label="Fermer">&times;</button>
</div>
<div class="objet-dialog-corps">
<p>La photographie ordinaire est l’art de ce qui reste, images sans nom, sans auteur, sans prestige, visages oubliés, vacances effacées, gestes banals, tout ce que l’histoire officielle ignore.</p>
<p>Mais l’oubli est une chance. Ces photos ne disent plus « qui », elles disent « comment ». Comment nous avons cadré, comment nous avons posé, comment le regard collectif s’est fabriqué, dans l’ombre de la peinture, des studios photo, de la presse et ses publicités, des manuels Kodak.</p>
<p>Chaque cliché isolé est insignifiant. Ensemble, ils forment une archive. Pas celle des grands de ce monde, mais celle du commun des mortels; une archive involontaire du regard collectif. Ces photos, par leur répétition, dessinent un langage commun, anonyme, partagé par des millions d’yeux et de mains.</p>
<p>La photographie d’occasion, libérée de sa fonction mémorielle, est une aubaine critique. Elle arrache les images à leur sphère privée pour les offrir à une lecture commune. Elle retourne le rebut en ressource, le banal en révélation. Elle fait du « raté » une matière et du « sans qualité » une valeur.</p>
<p>L’ère numérique dématérialise, efface, obsolétise. Les fichiers disparaissent, les supports meurent. Ces tirages, eux, tiennent bon. Papier jauni, coins pliés, notes griffonnées au dos : ils sont les preuves matérielles d’un geste, d’un passage, d’une main.</p>
<p>Conserver ces photos, c’est sauver la matérialité du regard. Les protéger, c’est affirmer que la photographie ne se résume pas à ses chefs-d’œuvre, c’est rappeler qu’elle est aussi faite d’innombrables fragments anonymes, portés par des millions d’existences ordinaires.</p>
<p>La photographie d’occasion n’est pas un art de l’auteur mais un art du commun. Elle est la chance d’un regard partagé. Elle n’est pas commémoration, elle célèbre l’événement de la redécouverte, la chance de voir autrement, elle est réinvention. À chaque image sauvée, un horizon s’ouvre qui témoigne que voir est un acte collectif.</p>
</div>
</dialog>

{{< dialog-script >}}
