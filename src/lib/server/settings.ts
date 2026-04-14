import { env } from '$env/dynamic/private';

function numberFromEnv(key: string, fallback: number) {
	const raw = env[key];
	const n = raw ? Number(raw) : NaN;
	return Number.isFinite(n) ? n : fallback;
}

export const OVERPASS_URL = env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';

// Pune, India (default demo city)
export const PUNE_CENTER: [number, number] = [
	numberFromEnv('PUNE_CENTER_LAT', 18.5204),
	numberFromEnv('PUNE_CENTER_LON', 73.8567),
];

export const SEARCH_RADIUS_M = numberFromEnv('SEARCH_RADIUS_M', 15000);
