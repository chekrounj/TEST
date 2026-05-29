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

Phase 1 — MVP (en cours) :

- [x] Setup Vite + React + TS + Tailwind + Vitest
- [x] Module `domain/tax/brackets` (impôt progressif) + tests (5 cas/année,
      2022–2025)
- [x] Module `domain/tax/points` (points de crédit) + tests
- [x] Données fiscales 2022–2025 externalisées (`src/data/tax-rules-*.json`)
- [x] UI single-page minimale (impôt sur le revenu + détail par tranche)
- [x] Module `domain/bituah` (Leumi + Briout, salarié/indépendant, 52%
      déductible) + tests
- [ ] Modules pension / eshel / workdays
- [ ] Orchestrateur, FX, persistance localStorage, email Outlook, impression

Voir le document d'instructions pour la roadmap complète (Phases 2 et 3) et
`docs/` pour les sources officielles et les cas de validation.

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
