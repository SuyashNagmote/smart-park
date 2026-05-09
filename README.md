# Smart Park

A user-friendly parking dashboard built with SvelteKit. It fetches public parking locations (OpenStreetMap/Overpass) and shows **live simulated availability + pricing updates** via server-sent events (SSE).

## Live Demo

- **Railway**: https://smart-park-production.up.railway.app/
- **Vercel**: Deploy your own!

## Features

- Clean landing page, sign up, sign in, protected dashboard
- Map view (Leaflet) + searchable list of lots
- Live updates stream (SSE) that updates map markers and "Recent updates"
- Server-side environment configuration for Overpass + demo city settings
- Premium UI/UX with glassmorphism design
- Gamification system with XP, levels, and quests
- Multi-step booking flow with animations
- Real-time parking session tracking

## Tech stack

- **SvelteKit** + **Svelte 5** (with runes)
- **Leaflet** (maps with clustering and heatmap)
- **UnoCSS** (utility classes)
- **SQLite** via `better-sqlite3` (users + sessions + reservations)
- **GSAP** (animations)
- **PWA** support with service worker

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

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Set environment variables (optional, defaults will be used):
   - `OVERPASS_URL`
   - `PUNE_CENTER_LAT`
   - `PUNE_CENTER_LON`
   - `SEARCH_RADIUS_M`
4. Deploy!

**Note**: On Vercel, the app uses an in-memory SQLite database (data resets on each deployment). For persistent storage, consider using a hosted database service.

### Railway / Other Node.js Platforms

The app includes both `@sveltejs/adapter-vercel` and `@sveltejs/adapter-node`. To deploy on Railway or similar platforms:

1. Switch adapter in `svelte.config.js`:
   ```js
   import adapter from '@sveltejs/adapter-node';
   ```
2. Build and deploy as a Node.js app
3. The SQLite database will persist in the `data/` directory

## Environment variables

All are optional; defaults are used if not set.

- **`OVERPASS_URL`**: Overpass API endpoint (default: `https://overpass-api.de/api/interpreter`)
- **`PUNE_CENTER_LAT` / `PUNE_CENTER_LON`**: demo city center coordinates (default: Pune, India)
- **`SEARCH_RADIUS_M`**: Overpass radius in meters (default: 15000)

## Scripts

- **`npm run dev`**: start dev server
- **`npm run build`**: production build
- **`npm run preview`**: preview the build
- **`npm run start`**: start production server (Node.js adapter)
- **`npm run check`**: typecheck (svelte-check)
- **`npm run lint`**: ESLint
- **`npm run format`**: Prettier

## Data & storage

- The SQLite database is created at `data/smartpark.db` on first run (local/Railway)
- On Vercel, an in-memory database is used (data resets on deployment)
- The `data/` DB file is gitignored by default

## Project Structure

```
src/
├── lib/
│   ├── client/          # Client-side state management
│   ├── components/      # Reusable UI components
│   │   └── dashboard/   # Dashboard-specific components
│   └── server/          # Server-side logic (DB, auth, lots)
├── routes/              # SvelteKit routes
│   ├── +page.svelte     # Landing page
│   ├── login/           # Login page
│   ├── signup/          # Signup page
│   └── dashboard/       # Protected dashboard
└── app.css              # Global styles and design tokens
```

## Notes

- Live availability/pricing is **simulated** (demo). The parking lot locations come from OpenStreetMap Overpass.
- The app uses Svelte 5 runes mode for reactive state management
- PWA features include offline support and installability
