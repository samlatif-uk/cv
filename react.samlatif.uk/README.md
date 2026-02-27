# react.samlatif.uk

React CV site for samlatif.uk, built with Vite + TypeScript.

## Commands

- `npm run dev` — start local dev server
- `npm run build` — type-check and create production build
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint

## Data and shared assets

- CV content is sourced from `../shared/cv-data.json` via `src/data/cv.ts`.
- Runtime filter helpers are loaded from `/filter-utils.js` and used when available.
- Static styles are served from `public/site.css` and `public/ui-shared.css`.

## Notes

- The app can run with API data (`https://network.samlatif.uk/api/cv/:username`) and falls back to local shared JSON.
- Keep schema/content shape aligned with `shared/cv-data.json` when editing CV fields.
