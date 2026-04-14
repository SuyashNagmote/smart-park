import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { debugLog } from '$lib/server/debuglog';
import { getDb } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Ensure DB init doesn't crash this endpoint (safe)
	try {
		getDb();
	} catch {
		// ignore
	}

	const body = (await request.json().catch(() => null)) as any;
	if (!body) return json({ ok: false }, { status: 400 });

	// Never log secrets/PII; keep only safe fields
	debugLog({
		sessionId: 'd93485',
		runId: String(body.runId ?? 'client'),
		hypothesisId: String(body.hypothesisId ?? 'CLIENT'),
		location: String(body.location ?? 'client'),
		message: String(body.message ?? 'client log'),
		data: {
			pathname: String(body?.data?.pathname ?? ''),
			action: String(body?.data?.action ?? ''),
			lotId: String(body?.data?.lotId ?? ''),
			slot: body?.data?.slot ?? null,
			tab: String(body?.data?.tab ?? ''),
			err: String(body?.data?.err ?? ''),
			status: body?.data?.status ?? null,
		},
		timestamp: Date.now(),
	});

	return json({ ok: true, authed: Boolean(locals.user) });
};

