import { json } from '@sveltejs/kit';
import { fetchPuneLots } from '$lib/server/lots';

// Simple in-memory cache to prevent Overpass API ban during dev/prod
let cachedLots: Awaited<ReturnType<typeof fetchPuneLots>> | null = null;
let cacheTime = 0;

export async function GET() {
	try {
		// Cache for 2 minutes
		if (cachedLots && Date.now() - cacheTime < 120000) {
			return json({ lots: cachedLots });
		}

		const lots = await fetchPuneLots();
		cachedLots = lots;
		cacheTime = Date.now();

		return json({ lots });
	} catch (error) {
		console.error('Overpass Fetch failed:', error);
		return json({ error: 'Could not load lots' }, { status: 502 });
	}
}
