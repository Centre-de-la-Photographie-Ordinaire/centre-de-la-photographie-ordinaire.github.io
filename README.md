# centre de la photographie ordinaire — brouillons

Squelette Hugo du futur site **centredelaphotographieordinaire.fr**.

Le site sera monté par **expérimentation** : chaque experiment est une page
autonome qui partage la charte graphique du Centre (fond `#2A2E33`, texte
`#F5EFE4`, accent `#FAB617`) mais explore une UX différente. Les éléments qui
fonctionnent alimenteront ensuite le site complet.

## construire

```sh
hugo build          # génère public/
hugo server         # mode dev, auto-reload
```

## ajouter une experiment

1. Créer `static/experiments/<nom>/` avec son `index.html` autonome
   (JS/CSS/images à l'intérieur, chemins relatifs).
2. Ajouter l'entrée dans la liste `## experiments` de `content/_index.md` :

```md
- **<nom>** — [ouvrir] (/experiments/<nom>/)
```

L'URL finale sera `/experiments/<nom>/`. Ne pas créer de page Hugo du même
nom : les fichiers statiques prennent la main.

## remotes / deploys

- `origin` — https://github.com/Centre-de-la-Photographie-Ordinaire/website-draft
- `lamai` — http://localhost:3000/alx/website-draft (miroir gitea lamai)

Deploys github pages (deux repos, meme contenu) :

| repo github | sert sur | `HUGO_BASE_URL` (deploy.yml) |
|---|---|---|
| `.../website-draft` | `centre-de-la-photographie-ordinaire.github.io/website-draft/` | `.../website-draft/` |
| `.../centre-de-la-photographie-ordinaire.github.io` (site org) | racine `centre-de-la-photographie-ordinaire.github.io/` | `.../` |

Le push sur `main` de chaque repo declenche son workflow : `hugo build` puis
push force de `public/` vers la branche `gh-pages` du meme repo (token dans le
secret `PAGES_DEPLOY_TOKEN`, configures via `gh secret set`). `static/.nojekyll`
desactive Jekyll sur la branche `gh-pages`.

**Sync** : apres commit sur ce repo (website-draft), re-appliquer le meme commit
sur le repo `.github.io` avec la seule difference `HUGO_BASE_URL` (voir le
dernier commit de chaque repo pour la forme exacte).
