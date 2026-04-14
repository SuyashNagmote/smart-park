import { OVERPASS_URL, SEARCH_RADIUS_M, PUNE_CENTER } from '$lib/server/settings';

export interface ParkingLot {
	id: string;
	name: string;
	area: string;
	lat: number;
	lon: number;
	capacity: number;
	ev: boolean;
	chargerType?: 'Type2' | 'CCS2' | 'CHAdeMO';
	chargerKw?: number;
	queueEstimateMin?: number;
	available?: number;
	hourlyRate?: number;
}

function mockLots(count = 60): ParkingLot[] {
	const lots: ParkingLot[] = [];
	for (let i = 0; i < count; i++) {
		const idNum = 100000 + i;
		const capacity = 20 + (i % 30);
		const ev = i % 4 === 0;
		const chargerTypes: Array<'Type2' | 'CCS2' | 'CHAdeMO'> = ['Type2', 'CCS2', 'CHAdeMO'];
		const chargerType = ev ? chargerTypes[i % chargerTypes.length] : undefined;
		const chargerKw = ev ? [7, 11, 22, 30, 50][i % 5] : undefined;
		lots.push({
			id: `mock-${idNum}`,
			name: `Parking ${String.fromCharCode(65 + (i % 26))}-${(i % 9) + 1}`,
			area: ['Kothrud', 'Shivajinagar', 'Baner', 'Hadapsar', 'Swargate', 'Viman Nagar'][i % 6],
			lat: PUNE_CENTER[0] + (Math.sin(i * 0.8) * 0.06 + (i % 7) * 0.002),
			lon: PUNE_CENTER[1] + (Math.cos(i * 0.7) * 0.06 + (i % 5) * 0.002),
			capacity,
			available: Math.max(0, Math.floor(capacity * (0.2 + ((i * 13) % 60) / 100))),
			ev,
			chargerType,
			chargerKw,
			queueEstimateMin: ev ? Math.max(0, (i % 6) * 5 - 5) : undefined,
			hourlyRate: 50 + (i % 6) * 10,
		});
	}
	return lots;
}

function inferCapacity(node: any): number {
	const raw = node.tags?.capacity ? Number(node.tags.capacity) : NaN;
	if (!Number.isNaN(raw) && raw > 0) return raw;
	return 20 + ((node.id || 1) % 20);
}

function normalize(node: any): ParkingLot | null {
	const lat = node.lat || node.center?.lat;
	const lon = node.lon || node.center?.lon;
	if (!lat || !lon) return null;

	const capacity = inferCapacity(node);
	const ev = Boolean(node.tags?.electric || node.tags?.['socket:type2']);

	const chargerTypes: Array<'Type2' | 'CCS2' | 'CHAdeMO'> = ['Type2', 'CCS2', 'CHAdeMO'];
	const chargerType = ev ? chargerTypes[(node.id || 1) % chargerTypes.length] : undefined;
	const chargerKw = ev ? [7, 11, 22, 30, 50][(node.id || 1) % 5] : undefined;

	return {
		id: `osm-${node.type}-${node.id}`,
		name: node.tags?.name || 'Public Parking',
		area: node.tags?.['addr:suburb'] || node.tags?.['addr:street'] || 'Zone Alpha',
		lat,
		lon,
		capacity,
		available: Math.floor(Math.random() * capacity), // Initial mock availability
		ev,
		chargerType,
		chargerKw,
		queueEstimateMin: ev ? Math.max(0, ((node.id || 1) % 6) * 5 - 5) : undefined,
		hourlyRate: 50 + Math.floor(Math.random() * 5) * 10, // Base rate between 50-100
	};
}

export async function fetchPuneLots(): Promise<ParkingLot[]> {
	const query = `
[out:json][timeout:25];
(
  node["amenity"="parking"](around:${SEARCH_RADIUS_M},${PUNE_CENTER[0]},${PUNE_CENTER[1]});
  way["amenity"="parking"](around:${SEARCH_RADIUS_M},${PUNE_CENTER[0]},${PUNE_CENTER[1]});
  node["park_ride"="yes"](around:${SEARCH_RADIUS_M},${PUNE_CENTER[0]},${PUNE_CENTER[1]});
);
out center tags 120;`;

	let data: any;
	try {
		const res = await fetch(OVERPASS_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
			body: query,
		});

		if (!res.ok) {
			// Fallback to mock lots so the map always works during rate limits/timeouts.
			return mockLots();
		}

		data = await res.json();
	} catch {
		return mockLots();
	}
	const dedup = new Map<string, ParkingLot>();

	(data.elements || [])
		.map(normalize)
		.filter(Boolean)
		.forEach((lot: ParkingLot) =>
			dedup.set(`${lot.name}-${lot.lat.toFixed(4)}-${lot.lon.toFixed(4)}`, lot),
		);

	return Array.from(dedup.values()).slice(0, 90);
}
