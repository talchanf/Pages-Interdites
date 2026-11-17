# Pages Interdites

Catalogue en ligne des livres interdits, restreints ou contestés à travers le monde.

Le site recense **29 377 livres** et **49 497 mesures de censure** dans **119 pays**, à partir du jeu de données ouvert de [banned-books.org](https://www.banned-books.org/). Pour chaque livre, il indique où, quand, par qui et pour quelles raisons il a été censuré, avec un lien vers la source.

## Fonctionnalités

- **Recherche** par titre ou par auteur
- **Filtres** par pays, motif de censure (politique, religieux, sexuel, LGBTQ+…), portée de la mesure (école, gouvernement, bibliothèque…), statut (en vigueur, historique, levée) et époque de publication
- **Tris** par nombre de pays, nombre de mesures, titre, date de publication ou date de première interdiction
- **Fiche détaillée** pour chaque livre : mesures regroupées par pays avec l'année, le type, la portée, le statut, les motifs et la source
- **Statistiques** : motifs, pays, portée et statut des mesures, et répartition des mesures par période. Les comptes portent sur des livres distincts : un titre retiré de cent écoles ne compte qu'une fois.
- **Import** d'une nouvelle version du jeu de données (zip ou CSV) directement depuis le navigateur
- Interface en français, thème clair et sombre selon les réglages du système

## Structure du projet

```
.
├── index.html             Structure de la page
├── style.css              Mise en forme
├── app.js                 Logique du site : filtres, fiches, statistiques, import
├── core.js                Lecture des CSV, jointure des tables, format compact
├── data.js                Données intégrées (générées, ne pas modifier à la main)
├── jszip.min.js           Bibliothèque JSZip 3.10.1, pour lire les fichiers zip
└── scripts/
    └── build-data.js      Script qui génère data.js à partir des CSV
```

## Lancer le site

Le site est entièrement statique : pas de serveur ni d'installation nécessaires.

- **En local** : ouvrir `index.html` dans un navigateur.
- **En ligne** : le dépôt peut être publié tel quel avec GitHub Pages (Settings > Pages > Deploy from a branch).

## Mettre à jour les données

1. Télécharger la dernière version de `banned-books-open-core.zip` sur [Zenodo](https://zenodo.org/records/24109205) et la décompresser.
2. Régénérer `data.js` avec Node.js :

   ```bash
   node scripts/build-data.js chemin/vers/banned-books-open-core
   ```

3. Committer le nouveau `data.js`.

Pour un simple aperçu sans toucher au dépôt, on peut aussi déposer le zip dans la section « À propos et données » du site. Cet import ne change que l'affichage dans son propre navigateur.

## Fonctionnement des données

Le jeu de données est relationnel : six tables CSV reliées par des identifiants (`books`, `authors`, `bans`, `ban_reasons`, `ban_sources`, `countries`). `core.js` les joint et les convertit en un format compact (index numériques, motifs encodés en masque de bits, sources dédupliquées) pour que tout le catalogue tienne dans un fichier d'environ 3,5 Mo, chargé une seule fois à l'ouverture.

Le même code sert au script `build-data.js` (Node.js) et à l'import dans le navigateur.

## Limites

- Les titres sont ceux du jeu de données, souvent en anglais.
- La plupart des sources ne sont pas encore marquées comme vérifiées par les auteurs du jeu de données.
- Les données sont orientées vers les sources anglophones : les États-Unis y apparaissent beaucoup parce que les interdictions y sont systématiquement recensées (PEN America, ALA), alors que la censure dans des pays comme la Chine, la Russie ou l'Iran est sous-documentée.
- Les registres officiels (par exemple l'Index de 1877) inclus dans le jeu de données ne sont pas encore affichés.

## Source des données et licence

Les données proviennent de **Banned Books, Open Censorship Core**, par Ludo Raedts / [banned-books.org](https://www.banned-books.org/), version du 10 novembre 2026, publiées sous licence [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/deed.fr).
DOI : [10.5281/zenodo.24109205](https://doi.org/10.5281/zenodo.24109205)

Cette attribution doit être conservée dans toute réutilisation des données.

La bibliothèque [JSZip](https://stuk.github.io/jszip/) est distribuée sous licence MIT ou GPLv3.
