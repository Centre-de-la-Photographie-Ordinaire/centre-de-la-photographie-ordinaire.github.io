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

## remotes

- `origin` — https://github.com/Centre-de-la-Photographie-Ordinaire/website-draft
- `lamai` — http://localhost:3000/alx/website-draft (miroir gitea lamai)
