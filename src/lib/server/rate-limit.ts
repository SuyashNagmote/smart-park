/**
 * In-memory IP-based rate limiter using a sliding window.
 * Each "bucket" (e.g. login, signup) has its own config.
 * Entries auto-expire so memory stays bounded.
 */

type Hit = number; // timestamp ms

interface BucketConfig {
	/** Maximum allowed requests in the window */
	max: number;
	/** Window size in milliseconds */
	windowMs: number;
}

const store = new Map<string, Hit[]>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, hits] of store) {
		const fresh = hits.filter((t) => now - t < 15 * 60 * 1000);
		if (fresh.length === 0) store.delete(key);
		else store.set(key, fresh);
	}
}, 5 * 60 * 1000).unref?.();

/**
 * Predefined rate-limit buckets.
 * ── login:  5 attempts per 15 minutes per IP
 * ── signup: 3 attempts per 15 minutes per IP
 */
export const RATE_LIMITS = {
	login: { max: 5, windowMs: 15 * 60 * 1000 } satisfies BucketConfig,
	signup: { max: 3, windowMs: 15 * 60 * 1000 } satisfies BucketConfig,
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	retryAfterSec: number; // 0 if allowed
}

/**
 * Check (and record) a rate-limit hit for a given bucket + IP.
 * Returns whether the request is allowed.
 */
export function checkRateLimit(bucket: RateLimitBucket, ip: string): RateLimitResult {
	const config = RATE_LIMITS[bucket];
	const key = `${bucket}:${ip}`;
	const now = Date.now();
	const windowStart = now - config.windowMs;

	// Get existing hits and prune expired ones
	const hits = (store.get(key) ?? []).filter((t) => t > windowStart);

	if (hits.length >= config.max) {
		// Blocked — calculate when the oldest hit expires
		const oldestHit = hits[0];
		const retryAfterMs = oldestHit + config.windowMs - now;
		const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));

		store.set(key, hits);

		return {
			allowed: false,
			remaining: 0,
			retryAfterSec,
		};
	}

	// Allowed — record this hit
	hits.push(now);
	store.set(key, hits);

	return {
		allowed: true,
		remaining: config.max - hits.length,
		retryAfterSec: 0,
	};
}

/**
 * Get the client IP from a SvelteKit RequestEvent.
 * Checks X-Forwarded-For first (for proxies like Vercel/Cloudflare),
 * then falls back to event.getClientAddress().
 */
export function getClientIp(event: { request: Request; getClientAddress: () => string }): string {
	const forwarded = event.request.headers.get('x-forwarded-for');
	if (forwarded) {
		// X-Forwarded-For can be comma-separated; first value is the client
		return forwarded.split(',')[0].trim();
	}
	try {
		return event.getClientAddress();
	} catch {
		return '0.0.0.0';
	}
}
