import { json } from '@sveltejs/kit';
import { fetchLots } from '$lib/server/lots';

// Simple in-memory cache to prevent Overpass API ban during dev/prod
// Caches by lat,lon key
let lotCache = new Map<string, { lots: any[]; time: number }>();

export async function GET({ url }: { url: URL }) {
	try {
		const latStr = url.searchParams.get('lat');
		const lonStr = url.searchParams.get('lon');
		
		const lat = latStr ? parseFloat(latStr) : undefined;
		const lon = lonStr ? parseFloat(lonStr) : undefined;

		// Create a cache key rounded to ~10km (1 decimal place roughly) to group nearby users
		const cacheKey = (lat && lon) ? `${lat.toFixed(1)},${lon.toFixed(1)}` : 'default';

		const cached = lotCache.get(cacheKey);
		// Cache for 2 minutes
		if (cached && Date.now() - cached.time < 120000) {
			return json({ lots: cached.lots });
		}

		const lots = await fetchLots(lat, lon);
		lotCache.set(cacheKey, { lots, time: Date.now() });

		return json({ lots });
	} catch (error) {
		console.error('Overpass Fetch failed:', error);
		return json({ error: 'Could not load lots' }, { status: 502 });
	}
}
