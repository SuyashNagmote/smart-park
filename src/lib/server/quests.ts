import { getDb } from './db';

export type Quest = {
	id: string;
	title: string;
	target: number;
	xp: number;
	kind: 'book_ev' | 'book_under_price' | 'keep_streak';
	meta?: Record<string, unknown>;
};

export type QuestProgress = Record<string, number>;

function now() {
	return Date.now();
}

export function dayKey(ts = Date.now()) {
	const d = new Date(ts);
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

function dailyPriceTarget(seed: number) {
	const options = [60, 70, 80, 90];
	return options[seed % options.length];
}

export function getOrCreateDailyQuests(userId: string) {
	const db = getDb();
	const dk = dayKey();
	const row = db
		.prepare(
			`SELECT quests_json as questsJson, progress_json as progressJson, claimed_json as claimedJson
       FROM user_quests
       WHERE user_id = ? AND day_key = ?`,
		)
		.get(userId, dk) as
		| { questsJson: string; progressJson: string; claimedJson: string }
		| undefined;

	if (row) {
		return {
			dayKey: dk,
			quests: JSON.parse(row.questsJson || '[]') as Quest[],
			progress: JSON.parse(row.progressJson || '{}') as QuestProgress,
			claimed: JSON.parse(row.claimedJson || '[]') as string[],
		};
	}

	// Deterministic-ish daily quests
	const seed = Number(String(userId).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) + new Date().getDate();
	const priceCap = dailyPriceTarget(seed);

	const quests: Quest[] = [
		{ id: 'q_ev_2', title: 'Book EV parking twice', target: 2, xp: 60, kind: 'book_ev' },
		{
			id: 'q_under_price',
			title: `Book under ₹${priceCap}/hr`,
			target: 1,
			xp: 35,
			kind: 'book_under_price',
			meta: { priceCap },
		},
		{ id: 'q_streak_7', title: 'Keep a 7-day streak alive', target: 7, xp: 120, kind: 'keep_streak' },
	];

	const progress: QuestProgress = { q_ev_2: 0, q_under_price: 0, q_streak_7: 0 };

	db.prepare(
		`INSERT INTO user_quests (user_id, day_key, quests_json, progress_json, claimed_json, updated_at)
     VALUES (@userId, @dayKey, @questsJson, @progressJson, @claimedJson, @updatedAt)`,
	).run({
		userId,
		dayKey: dk,
		questsJson: JSON.stringify(quests),
		progressJson: JSON.stringify(progress),
		claimedJson: '[]',
		updatedAt: now(),
	});

	return { dayKey: dk, quests, progress, claimed: [] as string[] };
}

export function updateQuestProgressOnBooking(userId: string, args: { vehicleType: 'car' | 'ev'; pricePerHour: number; streakDays: number }) {
	const db = getDb();
	const state = getOrCreateDailyQuests(userId);
	const { quests } = state;
	const progress = { ...state.progress };

	const priceQuest = quests.find((q) => q.kind === 'book_under_price');
	const priceCap = Number((priceQuest?.meta as any)?.priceCap ?? 80);

	// Increment progress
	if (args.vehicleType === 'ev') progress.q_ev_2 = (progress.q_ev_2 ?? 0) + 1;
	if (args.pricePerHour <= priceCap) progress.q_under_price = Math.max(progress.q_under_price ?? 0, 1);
	progress.q_streak_7 = Math.max(progress.q_streak_7 ?? 0, Math.min(args.streakDays, 7));

	db.prepare(
		`UPDATE user_quests
     SET progress_json = @progressJson,
         updated_at = @updatedAt
     WHERE user_id = @userId AND day_key = @dayKey`,
	).run({
		userId,
		dayKey: state.dayKey,
		progressJson: JSON.stringify(progress),
		updatedAt: now(),
	});

	return { ...state, progress };
}

export function claimQuest(userId: string, questId: string) {
	const db = getDb();
	const state = getOrCreateDailyQuests(userId);
	const quest = state.quests.find((q) => q.id === questId);
	if (!quest) return { ok: false as const, reason: 'not_found' as const };

	const claimed = new Set(state.claimed);
	if (claimed.has(questId)) return { ok: false as const, reason: 'already_claimed' as const };

	const prog = state.progress[questId] ?? 0;
	if (prog < quest.target) return { ok: false as const, reason: 'not_complete' as const };

	claimed.add(questId);
	db.prepare(
		`UPDATE user_quests
     SET claimed_json = @claimedJson,
         updated_at = @updatedAt
     WHERE user_id = @userId AND day_key = @dayKey`,
	).run({
		userId,
		dayKey: state.dayKey,
		claimedJson: JSON.stringify(Array.from(claimed)),
		updatedAt: now(),
	});

	return { ok: true as const, xp: quest.xp, quest };
}

