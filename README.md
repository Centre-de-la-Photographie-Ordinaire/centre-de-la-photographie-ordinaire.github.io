# centre de la photographie ordinaire — réplique de STAGING

Ce dépôt n'est **pas** édité à la main : c'est une réplique de
`../website-draft`, publiée sur le site d'organisation GitHub Pages.

| | |
|---|---|
| ce dépôt | https://github.com/Centre-de-la-Photographie-Ordinaire/centre-de-la-photographie-ordinaire.github.io |
| sert sur | https://centre-de-la-photographie-ordinaire.github.io/ (**racine**) |
| source | `../website-draft` (seule source du site) |

## ce que la réplique change

1. **baseURL à la racine** : `/` au lieu de `/website-draft/`.
2. **le diaporama vitrine est l'accueil** :
   `website-draft/static/experiments/nouveau-diaporama/` est copié à la racine
   (`static/index.html` + `static/diaporama/` pour ses ressources). Son logo
   de barre basse mène à `/objet/`.
3. **six pages seulement** : `objet`, `missions`, `agenda`, `collection`,
   `expositions`, `contact` — et la navbar (hamburger) ne propose que ces six
   pages, plus « accueil » (le diaporama). Tout le reste (`residences`,
   `collecte`, `soutien`, `fabrique`, `objet-archive`, `experiments/`…) n'est
   pas publié.

## resynchroniser après une modification de website-draft

```sh
tools/sync-staging.sh      # relit ../website-draft et régénère tout
hugo build --minify --baseURL "https://centre-de-la-photographie-ordinaire.github.io/" --destination public
```

Le script est **idempotent** et ne modifie **jamais** website-draft. Aucun
fichier de `content/`, `layouts/`, `static/` ni `hugo.toml` de ce dépôt ne doit
être édité ici : corriger website-draft, puis relancer le script.

Seule exception, propre à la réplique (le script ne les écrase pas) :

- `layouts/index.html` — page d'accueil Hugo neutralisée (la racine est écrite
  par le diaporama) ;
- `layouts/partials/header.html` — logo et « accueil » du menu pointent sur
  `/` (le diaporama), les libellés du menu sont ceux de `hugo.toml` ;
- `tools/sync-staging.sh` — le script lui-même.

## fichiers générés (ne pas éditer)

`content/`, `layouts/` (sauf les trois ci-dessus), `data/`, `hugo.toml`,
`static/style.css`, `static/favicon.png`, `static/fonts/`, `static/images/`,
`static/videos/`, `static/documents/`, `static/collection/`,
`static/index.html`, `static/diaporama/`.

## déploiement

Push sur `main` → workflow `.github/workflows/deploy.yml` : `hugo build` puis
push force de `public/` vers la branche `gh-pages` (secret
`PAGES_DEPLOY_TOKEN`). `HUGO_BASE_URL` y vaut la racine du site.
