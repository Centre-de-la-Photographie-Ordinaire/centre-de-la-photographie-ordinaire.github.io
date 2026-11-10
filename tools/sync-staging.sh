#!/usr/bin/env bash
# sync-staging.sh — construit la RÉPLIQUE de staging servie par ce dépôt
# (centre-de-la-photographie-ordinaire.github.io/, le site d'organisation).
#
#   usage : tools/sync-staging.sh [DEST]
#   défaut : le dépôt lui-même (le dossier parent de tools/)
#
# PRINCIPE
# --------
# website-draft (../website-draft) reste la SOURCE UNIQUE du site. Ce dépôt en
# est une réplique, avec trois différences seulement :
#
#   1. baseURL à la racine (`/` au lieu de `/website-draft/`) ;
#   2. le diaporama vitrine (static/experiments/nouveau-diaporama/) est servi
#      À LA RACINE du site : son index.html devient static/index.html et ses
#      ressources vont dans static/diaporama/ (style.css, favicon.png,
#      images/, main.js, images.json) pour ne pas écraser celles du site ;
#      son logo de barre basse mène à /objet/ ;
#   3. SEULES six pages sont publiées : objet, missions, agenda, collection,
#      expositions, contact — et la navbar ne propose que ces six pages.
#
# Tout le reste (content/ et layouts/ copiés de website-draft, static/style.css,
# images/, videos/, documents/, collection/, fonts/, data/collection.json) est
# une copie conforme : ne jamais modifier ces fichiers ici à la main.
#
# Seule exception, propre à ce dépôt : deux layouts copiés depuis tools/
# après la copie de website-draft — layouts/index.html (accueil Hugo
# neutralisé) et layouts/partials/header.html (logo + entrée « accueil » vers
# le diaporama, libellés de menu). Les éditer dans tools/, pas dans layouts/.
#
# Le script est idempotent : le relancer après un `git pull` de website-draft
# réapplique les mêmes trois différences. Il n'écrit PAS dans website-draft.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DRAFT="$ROOT/../website-draft"
DEST="${1:-$ROOT}"

# les six pages publiées (ordre de la navbar) et leurs titres de menu
PAGES=(objet missions agenda collection expositions contact)

if [ ! -d "$DRAFT" ]; then
  echo "sync-staging : source introuvable : $DRAFT" >&2
  exit 1
fi
if [ "$(cd "$DEST" && pwd)" != "$ROOT" ] && [ -e "$DEST/.git" ]; then
  echo "sync-staging : refus d'écrire dans un autre dépôt que $ROOT : $DEST" >&2
  exit 1
fi

echo "sync-staging : $DRAFT -> $DEST"

# --- 1. contenus, layouts, style, données -----------------------------------
# on repart de zéro pour ne pas laisser traîner une page retirée de la liste
rm -rf "$DEST/content" "$DEST/layouts" "$DEST/data"
mkdir -p "$DEST/content" "$DEST/layouts" "$DEST/static"
cp -rf "$DRAFT/layouts/." "$DEST/layouts/"
cp -rf "$DRAFT/data/" "$DEST/data/"
# les deux layouts propres à la réplique (copie conforme de website-draft sinon) :
# accueil Hugo neutralisé (la racine est le diaporama) et header dont le logo et
# l'entrée « accueil » mènent au diaporama. Sources dans tools/.
cp -f "$ROOT/tools/layouts-staging-index.html" "$DEST/layouts/index.html"
cp -f "$ROOT/tools/layouts-staging-header.html" "$DEST/layouts/partials/header.html"

# les six pages seulement
for p in "${PAGES[@]}"; do
  if [ -d "$DRAFT/content/$p" ]; then
    cp -rf "$DRAFT/content/$p" "$DEST/content/$p"
  else
    echo "sync-staging : page absente de website-draft : $p" >&2
    exit 1
  fi
done
# content/_index.md reste vide : la racine est occupée par le diaporama
: > "$DEST/content/_index.md"

# --- 2. ressources statiques nécessaires aux six pages ----------------------
for f in style.css favicon.png; do
  cp -f "$DRAFT/static/$f" "$DEST/static/$f"
done
# /objet/ : images + vidéo d'interview ; /agenda/ : affiches et PDF ;
# /collection/ : galeries ; /expositions/ : visuels des expositions ;
# fonts/ : DINdong, la fonte des titres (style.css la charge en relatif)
for d in images videos documents collection fonts; do
  rm -rf "$DEST/static/$d"
  cp -rf "$DRAFT/static/$d" "$DEST/static/$d"
done

# --- 2bis. restes d'un ancien passage : le diaporama s'installe à la racine --
rm -rf "$DEST/static/experiments" "$DEST/static/diaporama" \
       "$DEST/static/index.html" "$DEST/static/main.js" "$DEST/static/images.json"

# --- 3. le diaporama à la racine -------------------------------------------
# Son index.html devient static/index.html (Hugo recopie les fichiers
# statiques tels quels). Ses ressources vont dans static/diaporama/ : à la
# racine, son style.css, son favicon.png et son images/ écraseraient ceux du
# site (photo de l'objet, affiches de l'agenda…), d'où le nettoyage AVANT.
python3 - "$DRAFT/static/experiments/nouveau-diaporama" "$DEST/static" <<'PY'
import pathlib, shutil, sys
src, root = map(pathlib.Path, sys.argv[1:3])
out = root / "diaporama"
out.mkdir()
SKIP = {"README.md", "index.html"}          # doc + page d'entrée d'origine
for f in sorted(src.iterdir()):
    if f.name in SKIP or f.name.startswith("visual_page-"):
        continue                            # visuels de la charte : non servis
    dest = out / f.name
    if f.is_dir():
        shutil.copytree(f, dest)
    else:
        shutil.copy2(f, dest)
        # 644 explicite : un fichier statique « writable by group » n'est pas
        # écrasé par Hugo (il refuserait d'écrire public/index.html par-dessus,
        # sans erreur), et l'umask du poste (g+w) le propageait aux copies.
        dest.chmod(0o644)
html = (src / "index.html").read_text(encoding="utf-8")
html = html.replace("<!doctype html>\n", "<!doctype html>\n"
    "<!-- racine du site : diaporama vitrine (copie de website-draft, "
    "générée par tools/sync-staging.sh) -->\n", 1)
# les `../../` de l'expérience deviennent des liens racine : le logo de la
# barre basse mène à /objet/, la page d'entrée du site (la racine, c'est le
# diaporama) ; la favicon et les images du site restent celles du site
html = html.replace('href="../../"', 'href="objet/"')
html = html.replace('src="../../', 'src="')
html = html.replace('href="../../', 'href="')
# les ressources chargées par main.js (images.json, images/) le sont en
# relatif depuis main.js lui-même : elles restent sous diaporama/ sans
# réécriture. index.html ne référence que style.css, favicon.png et main.js.
for name in ("style.css", "favicon.png", "main.js"):
    html = html.replace('"%s"' % name, '"diaporama/%s"' % name)
    html = html.replace("'%s'" % name, "'diaporama/%s'" % name)
# les <link rel=preload> portent une URL complète (images/desktop/01-1920.webp)
html = html.replace('href="images/desktop/', 'href="diaporama/images/desktop/')
html = html.replace('href="images/tablet/', 'href="diaporama/images/tablet/')
html = html.replace('href="images/phone/', 'href="diaporama/images/phone/')
# main.js : fetch('images.json') est résolu par rapport à la PAGE (la racine),
# pas au module — on préfixe par diaporama/. Ses autres chemins ("base":
# "images/desktop/01") sont construits en relatif depuis main.js : inchangés.
js = (out / "main.js").read_text(encoding="utf-8")
js = js.replace("fetch('images.json", "fetch('diaporama/images.json")
js = js.replace("src: `${it.base}-${w}.webp`",
                "src: `diaporama/${it.base}-${w}.webp`")
js = js.replace("jpg: `${it.base}-${w}.jpg`",
                "jpg: `diaporama/${it.base}-${w}.jpg`")
(out / "main.js").write_text(js, encoding="utf-8")
index = root / "index.html"
index.write_text(html, encoding="utf-8")
index.chmod(0o644)                   # cf. commentaire du chmod ci-dessus
PY

# --- 4. hugo.toml : baseURL racine + menu réduit aux six pages -------------
python3 - "$DRAFT/hugo.toml" "$DEST/hugo.toml" "$DEST/content/_index.md" "${PAGES[@]}" <<'PY'
import pathlib, re, sys
src, dst, home, *pages = sys.argv[1:]
toml = pathlib.Path(src).read_text(encoding="utf-8")
toml = toml.replace(
    'baseURL = "https://centre-de-la-photographie-ordinaire.github.io/website-draft/"',
    'baseURL = "https://centre-de-la-photographie-ordinaire.github.io/"')
toml = toml.replace(
    "# Page projet GitHub Pages : le site est servi sous /website-draft/\n"
    "# (cf. HUGO_BASE_URL dans .github/workflows/deploy.yml)",
    "# RÉPLIQUE DE STAGING, site d'organisation : servi à la RACINE\n"
    "# (cf. HUGO_BASE_URL dans .github/workflows/deploy.yml).\n"
    "# Fichier GÉNÉRÉ par tools/sync-staging.sh depuis website-draft/hugo.toml :\n"
    "# ne pas l'éditer ici, corriger website-draft puis relancer le script.")
# le menu ne garde que les six pages publiées (accueil compris : il pointe
# vers le diaporama, cf. layouts/partials/header.html)
toml = re.sub(r"(\[\[menu\.main\]\]\n  name = \"[^\"]+\"\n  pageRef = \"[^\"]+\"\n  weight = \d+\n\n?)+", "", toml)
menu = []
weight = 1
# la racine (accueil) n'est pas une page Hugo : le menu porte un lien explicite
menu.append('[[menu.main]]\n  name = "accueil"\n  url = "/"\n  weight = %d\n' % weight)
for i, p in enumerate(pages, start=2):
    menu.append('[[menu.main]]\n  name = "%s"\n  pageRef = "/%s"\n  weight = %d\n' % (p, p, i))
toml = toml.replace(
    "# ---------------------------------------------------------------------------\n# paramètres du site",
    "\n".join(menu) + "\n# ---------------------------------------------------------------------------\n# paramètres du site")
# garde-fou : la racine est écrite par le diaporama, pas par Hugo
toml = toml.replace('[markup]', 'disableKinds = ["taxonomy", "term"]\n\n[markup]')
pathlib.Path(dst).write_text(toml, encoding="utf-8")
# content/_index.md vide : la racine est écrite par le diaporama (static/index.html)
pathlib.Path(home).write_text("", encoding="utf-8")
PY

echo "sync-staging : ok"
echo "  pages publiées : ${PAGES[*]}"
echo "  racine         : diaporama (assets copiés dans static/diaporama/)"
