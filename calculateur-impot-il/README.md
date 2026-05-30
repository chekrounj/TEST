# Calculateur d'impôt israélien

Application web d'estimation de l'impôt sur le revenu israélien, des
cotisations sociales (Bituah Leumi + Briout) et de l'impôt mensuel à
provisionner, pour un résident fiscal israélien (salarié ou indépendant) qui se
déplace à l'étranger.

> **Estimation indicative.** Cet outil ne remplace pas l'avis d'un comptable
> agréé (רואה חשבון) ou d'un conseiller fiscal (יועץ מס).

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Zustand · Zod · Vitest

## Démarrage

```bash
npm install
npm run dev        # serveur de dev Vite
npm test           # tests unitaires (Vitest)
npm run test:coverage
npm run build      # build de production
npm run preview
```

## État d'avancement (roadmap)

Phase 1 — MVP :

- [x] Setup Vite + React + TS + Tailwind + Vitest
- [x] Module `domain/tax/brackets` (impôt progressif) + tests (5 cas/année,
      2022–2025)
- [x] Module `domain/tax/points` (points de crédit) + tests
- [x] Module `domain/bituah` (Leumi + Briout, salarié/indépendant, 52%
      déductible) + tests
- [x] Module `domain/pension/self` (retraite obligatoire indépendants) + tests
- [x] Module `domain/eshel` (indemnité mission + pays majorés +25%) + tests
- [x] Module `domain/workdays` (décompte jours ouvrés, fêtes via `@hebcal/core`,
      prorata étranger) + tests
- [x] Module `domain/fx` (taux moyen, providers + fallback, cache 24h) + tests
- [x] `domain/orchestrator` (composition en 15 étapes) + tests d'intégration
- [x] Données fiscales 2022–2025 externalisées (`src/data/tax-rules-*.json`)
- [x] UI complète (toutes les sections), persistance localStorage (Zustand),
      impression, deeplink Outlook
- [x] 84 tests verts · typecheck OK · build prod OK

Phase 2/3 — extensions optionnelles (non incluses) :

- [ ] Microsoft 365 Graph API (envoi authentifié + PDF) — nécessite Azure
- [ ] Bank of Israel comme provider FX primaire (API à stabiliser)
- [ ] i18n hébreu / anglais (RTL)
- [ ] Backend multi-device, comparaison d'années, export Excel

Voir le document d'instructions pour la roadmap complète et `docs/` pour les
sources officielles et les cas de validation.

## Mettre à jour l'application sur un serveur

Après chaque nouvelle version du code :

```bash
# 1. récupérer le code à jour (ou re-télécharger le ZIP de la branche)
git pull origin claude/optimistic-ramanujan-eJvgH
# 2. installer les éventuelles nouvelles dépendances
npm install
# 3. reconstruire
npm run build
# 4. relancer
npm run preview
```

> Astuce : sur un disque réseau (ex. `J:`), utilisez `npm run build` + `npm run
> preview` (et non `npm run dev`, dont la surveillance de fichiers échoue sur
> ces disques).

## Architecture

```
src/
├── domain/      logique métier pure, testable (tax, bituah, eshel, …)
├── data/        règles fiscales par année (JSON, vérifiées annuellement)
├── ui/          pages & composants React
├── types/       types TypeScript globaux
└── __tests__/   tests unitaires & d'intégration (Vitest)
```

## Maintenance

Mise à jour annuelle obligatoire (janvier) : vérifier et mettre à jour
`src/data/tax-rules-{year}.json` (tranches, valeur du point, seuils Bituah,
salaire moyen, taux eshel). Voir `docs/tax-rules-sources.md`.
