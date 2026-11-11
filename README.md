# CIS Atlas

An interactive 3D installation of the ten countries of the Commonwealth of Independent States, on a single page.

Each country stands on its own plinth as a sculpted map: the country is raised out of a map of its neighbours, its flag is laid across the top like enamel, and the capital is marked with a pin. Every country gets its own room: background colour, lighting, camera angle, plinth shape and a display typeface for its name. A card on the right shows a symbol of the country, a short description, key figures and an embossed medallion for the head of state.

The arrows (or the ← → keys) move along a loop: Kazakhstan → Kyrgyzstan → Tajikistan → Uzbekistan → Turkmenistan → Azerbaijan → Armenia → Moldova → Belarus → Russia → back to Kazakhstan. Drag the model to turn it. Each country also has its own link, for example `index.html#armenia`.

## Run it

It is a static site with no build step. Serve the folder with any web server (opening `index.html` straight from disk will not load the map data):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

To publish it with GitHub Pages: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root**.

## What is where

| Path | Contents |
|---|---|
| `index.html` | Page structure |
| `css/style.css` | Layout, per-country type treatments, card, medallion, responsive rules |
| `js/main.js` | three.js scene: map plinths, flag slabs, lighting, camera framing, transitions, labels |
| `js/countries.js` | All text, figures, colours, fonts and scene settings for each country |
| `js/symbols.js` | Hand-drawn SVG symbol for each country |
| `data/geo/*.json` | Projected and simplified country outlines and neighbour maps |
| `assets/flags/` | Flag SVGs |
| `assets/fonts/` | Subsetted display and interface fonts (WOFF) |
| `vendor/three/` | three.js r187 |
| `tools/` | Scripts that produced the map data and the font files |

## Editing content

Everything shown for a country lives in its entry in `js/countries.js`: the description, the four key figures, the facts list, the leader, the symbol caption, the colours (`theme`), the typeface (`font`) and the 3D set-up (`scene`: camera angle, lights, plinth shape and height, slab thickness).

**Leader portraits.** Heads of state are shown as embossed medallions with their initials. To use a portrait instead, put an image in the repository (for example `assets/leaders/kz.webp`) and set `portrait: 'assets/leaders/kz.webp'` in that country's `leader` entry. Use an image you have the rights to publish.

## Data

Figures were checked in November 2026.

- Population: latest official estimate or census of each country (Uzbekistan: preliminary 2026 census; Russia: Rosstat estimate, which counts annexed Crimea; Moldova excludes Transnistria).
- GDP and GDP per person: IMF World Economic Outlook projections for 2026, in current US dollars.
- Moldova's withdrawal from the CIS was signed into law in April 2026 and takes effect in 2027. Turkmenistan has been an associate member since 2005.
- Maps show internationally recognised borders: Crimea is drawn as part of Ukraine.

## Credits and licences

- Map outlines: [Natural Earth](https://www.naturalearthdata.com/) 1:10m, via [datasets/geo-countries](https://github.com/datasets/geo-countries) (public domain). See `data/geo/ATTRIBUTION.txt`.
- Flags: [flag-icons](https://github.com/lipis/flag-icons) by Panayiotis Lipiridis (MIT). See `assets/flags/LICENSE-flag-icons.txt`.
- 3D: [three.js](https://threejs.org/) (MIT). See `vendor/three/LICENSE`.
- Fonts (SIL Open Font License, see `assets/fonts/OFL-*.txt`): Geologica, Unbounded, Ruslan Display, Tektur, El Messiri, Alfa Slab One, Cormorant Garamond, Cinzel, Michroma, Fraunces, Abril Fatface, Noto Sans Armenian.
- Country symbols are original drawings made for this site.
