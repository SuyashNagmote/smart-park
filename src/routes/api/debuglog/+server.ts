import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Debug logging endpoint is disabled in production.
// Re-enable locally by setting ENABLE_DEBUG_LOG=true in your .env
export const POST: RequestHandler = async () => {
	if (process.env.ENABLE_DEBUG_LOG !== 'true') {
		return json({ ok: false, reason: 'disabled' }, { status: 403 });
	}
	return json({ ok: true });
};
