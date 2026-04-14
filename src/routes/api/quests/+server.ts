import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { claimQuest, getOrCreateDailyQuests } from '$lib/server/quests';
import { awardBookingXp } from '$lib/server/reservations';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const state = getOrCreateDailyQuests(locals.user.id);
	return json(state);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = (await request.json().catch(() => null)) as any;
	const questId = String(body?.questId ?? '');
	if (!questId) return json({ error: 'Missing questId' }, { status: 400 });

	const claim = claimQuest(locals.user.id, questId);
	if (!claim.ok) {
		if (claim.reason === 'already_claimed') return json({ error: 'Already claimed' }, { status: 409 });
		if (claim.reason === 'not_complete') return json({ error: 'Not complete' }, { status: 409 });
		return json({ error: 'Not found' }, { status: 404 });
	}

	const stats = awardBookingXp(locals.user.id, claim.xp, ['Quest Hero']);
	return json({ ok: true, xp: claim.xp, stats });
};

