# Smart Park

A user-friendly parking dashboard built with SvelteKit. It fetches public parking locations (OpenStreetMap/Overpass) and shows **live simulated availability + pricing updates** via server-sent events (SSE).

## Features

- Clean landing page, sign up, sign in, protected dashboard
- Map view (Leaflet) + searchable list of lots
- Live updates stream (SSE) that updates map markers and “Recent updates”
- Server-side environment configuration for Overpass + demo city settings

## Tech stack

- **SvelteKit** + **Svelte 5**
- **Leaflet** (maps)
- **UnoCSS** (utility classes)
- **SQLite** via `better-sqlite3` (users + sessions)

## Getting started

Install dependencies:

```bash
npm install
```

Create a local env file:

```bash
cp .env.example .env
```

Run dev server:

```bash
npm run dev
```

Then open the app and create an account at `/signup`.

## Environment variables

All are optional; defaults are used if not set.

- **`OVERPASS_URL`**: Overpass API endpoint.
- **`PUNE_CENTER_LAT` / `PUNE_CENTER_LON`**: demo city center coordinates.
- **`SEARCH_RADIUS_M`**: Overpass radius in meters.

## Scripts

- **`npm run dev`**: start dev server
- **`npm run build`**: production build
- **`npm run preview`**: preview the build
- **`npm run check`**: typecheck (svelte-check)
- **`npm run lint`**: ESLint
- **`npm run format`**: Prettier

## Data & storage

- The SQLite database is created at `data/smartpark.db` on first run.
- The `data/` DB file is gitignored by default.

## Notes

- Live availability/pricing is **simulated** (demo). The parking lot locations come from OpenStreetMap Overpass.
