# Career atlas

The standalone Three.js experience is served at `/lab/`; the CV remains at `/`.
Roles and public recommendations come from `shared/cv-data.json`. Sector groupings
are editorial; connections are computed from shared stack entries.

From `react.samlatif.uk`, run `npm run dev:lab` to develop the atlas,
`npm run test:lab` to verify filtering and connections, and `npm run build` to
produce both the React CV and `dist/lab/`. `npm run preview` serves both builds.
The VPS workflow copies the atlas to the React host and the apex site's `/lab/`.

The engagement selector and timeline provide keyboard access to every role.
Reduced-motion preferences disable automatic orbiting. If WebGL is unavailable,
the filters, role details, timeline and recommendations remain usable.
