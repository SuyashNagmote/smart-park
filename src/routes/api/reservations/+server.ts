import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	awardBookingXp,
	cancelReservation,
	createReservationAtomic,
	getOrCreateUserStats,
	hasUserOverlappingLotBooking,
	listReservationsForUser,
	registerBookingStreak,
	rescheduleReservation,
	startParkingSession,
	stopParkingSession,
	type VehicleType,
} from '$lib/server/reservations';
import { updateQuestProgressOnBooking } from '$lib/server/quests';
import { fetchPuneLots } from '$lib/server/lots';
import { calculateDynamicPricing } from '$lib/server/engine';

// ── Price tier helpers ────────────────────────────────────────
const PRICE_IDS = new Set(['standard', 'flex', 'green']);

function resolvePricePerHour(
	baseRate: number,
	priceId: string,
	isEv: boolean,
): number {
	const surge = Math.max(0, Math.round(baseRate * 0.18));
	const greenDiscount = isEv ? Math.round(baseRate * 0.08) : 0;
	if (priceId === 'flex') return baseRate + surge;
	if (priceId === 'green') return Math.max(10, baseRate - greenDiscount);
	return baseRate; // 'standard'
}

// ── GET ───────────────────────────────────────────────────────
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const type = url.searchParams.get('type');
	if (type === 'stats') {
		const stats = getOrCreateUserStats(locals.user.id);
		return json({ stats });
	}

	const reservations = listReservationsForUser(locals.user.id);
	return json({ reservations });
};

// ── POST (create booking) ─────────────────────────────────────
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = (await request.json().catch(() => null)) as any;
	if (!body) return json({ error: 'Invalid body' }, { status: 400 });

	const lotId = String(body.lotId ?? '').trim();
	const vehicleType = String(body.vehicleType ?? 'car') as VehicleType;
	const needsCharging = Boolean(body.needsCharging);
	const durationHours = Number(body.durationHours ?? 2);
	const priceId = String(body.priceId ?? 'standard');
	const slotNumberRaw = body.slotNumber;
	const slotNumber =
		slotNumberRaw === null || slotNumberRaw === undefined || slotNumberRaw === ''
			? null
			: Number(slotNumberRaw);

	// Basic field validation
	if (!lotId) return json({ error: 'Missing lot ID' }, { status: 400 });
	if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > 24)
		return json({ error: 'Invalid duration (1–24 hours)' }, { status: 400 });
	if (vehicleType !== 'car' && vehicleType !== 'ev')
		return json({ error: 'Invalid vehicle type' }, { status: 400 });
	if (!PRICE_IDS.has(priceId))
		return json({ error: 'Invalid price tier' }, { status: 400 });
	if (slotNumber !== null && (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 2000))
		return json({ error: 'Invalid slot number' }, { status: 400 });

	// ── Server-side lot validation ────────────────────────────
	// Re-fetch lots from the authoritative source so the client
	// cannot inject fake names, coordinates, or prices.
	let lots: Awaited<ReturnType<typeof fetchPuneLots>>;
	try {
		lots = await fetchPuneLots();
	} catch {
		return json({ error: 'Could not verify lot data. Please try again.' }, { status: 503 });
	}

	const lot = lots.find((l) => l.id === lotId);
	if (!lot) return json({ error: 'Parking lot not found.' }, { status: 404 });

	// Server-side price calculation — client value is ignored
	const baseRate = calculateDynamicPricing(lot);
	const pricePerHour = resolvePricePerHour(baseRate, priceId, lot.ev);
	const startTime = Date.now();
	const totalPrice = Math.round(pricePerHour * durationHours);

	// Overlap check for this user at this lot
	if (
		hasUserOverlappingLotBooking({
			userId: locals.user.id,
			lotId,
			startTime,
			durationHours,
		})
	) {
		return json(
			{ error: 'You already have a booking for this lot during that time.' },
			{ status: 409 },
		);
	}

	// Atomic slot-check + insert (transaction prevents race conditions)
	const result = createReservationAtomic({
		userId: locals.user.id,
		lotId: lot.id,
		lotName: lot.name,
		lotArea: lot.area,
		lat: lot.lat,
		lon: lot.lon,
		vehicleType,
		needsCharging,
		slotNumber,
		startTime,
		durationHours,
		pricePerHour,
		totalPrice,
	});

	if (!result.ok) {
		if (result.reason === 'slot_taken')
			return json({ error: 'Slot already taken for that time.' }, { status: 409 });
		return json({ error: 'Booking failed. Please try again.' }, { status: 500 });
	}

	const reservation = result.reservation;

	// XP: +25 base, +10 EV, +10 charging, +10 long booking
	const xp =
		25 +
		(vehicleType === 'ev' ? 10 : 0) +
		(needsCharging ? 10 : 0) +
		(durationHours >= 3 ? 10 : 0);

	const badges: string[] = [];
	if (vehicleType === 'ev') badges.push('EV Driver');
	if (needsCharging) badges.push('Charge Master');
	if (durationHours >= 4) badges.push('Planner');

	registerBookingStreak(locals.user.id, reservation.createdAt);
	const stats = awardBookingXp(locals.user.id, xp, badges);
	const quests = updateQuestProgressOnBooking(locals.user.id, {
		vehicleType,
		pricePerHour,
		streakDays: stats.streakDays,
	});

	return json({ reservation, stats, quests, xpAwarded: xp });
};

// ── PATCH (cancel / reschedule / session) ─────────────────────
export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = (await request.json().catch(() => null)) as any;
	if (!body) return json({ error: 'Invalid body' }, { status: 400 });

	const action = String(body.action ?? '');
	const reservationId = String(body.reservationId ?? '');
	if (!reservationId) return json({ error: 'Missing reservationId' }, { status: 400 });

	// ── Cancel ────────────────────────────────────────────────
	if (action === 'cancel') {
		const res = cancelReservation(locals.user.id, reservationId);
		if (!res.ok) return json({ error: 'Not found' }, { status: 404 });
		return json({ ok: true });
	}

	// ── Reschedule ────────────────────────────────────────────
	if (action === 'reschedule') {
		const startTime = Number(body.startTime ?? NaN);
		const durationHours = Number(body.durationHours ?? NaN);
		const slotNumberRaw = body.slotNumber;
		const slotNumber =
			slotNumberRaw === null || slotNumberRaw === undefined || slotNumberRaw === ''
				? null
				: Number(slotNumberRaw);

		// priceId sent by client; resolve to a real per-hour rate server-side
		const priceId = PRICE_IDS.has(String(body.priceId ?? ''))
			? String(body.priceId)
			: 'standard';

		if (!Number.isFinite(startTime))
			return json({ error: 'Invalid startTime' }, { status: 400 });
		if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > 24)
			return json({ error: 'Invalid duration (1–24 hours)' }, { status: 400 });
		if (slotNumber !== null && (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 2000))
			return json({ error: 'Invalid slot number' }, { status: 400 });

		// Re-fetch lot to get authoritative base rate
		let pricePerHour: number;
		try {
			const lots = await fetchPuneLots();
			// We need the lotId from the existing reservation — look it up
			const { getDb } = await import('$lib/server/db');
			const db = getDb();
			const row = db
				.prepare(`SELECT lot_id as lotId, lot_name as lotName FROM reservations WHERE id = ? AND user_id = ?`)
				.get(reservationId, locals.user.id) as { lotId: string; lotName: string } | undefined;

			if (!row) return json({ error: 'Reservation not found' }, { status: 404 });

			const lot = lots.find((l) => l.id === row.lotId);
			const baseRate = lot ? calculateDynamicPricing(lot) : 50;
			pricePerHour = resolvePricePerHour(baseRate, priceId, lot?.ev ?? false);
		} catch {
			// Fallback: use a safe default rather than blocking the reschedule
			pricePerHour = 50;
		}

		const res = rescheduleReservation(locals.user.id, {
			reservationId,
			startTime,
			durationHours,
			pricePerHour,
			slotNumber,
		});

		if (!res.ok) {
			if (res.reason === 'slot_taken')
				return json({ error: 'Slot already taken.' }, { status: 409 });
			if (res.reason === 'session_active')
				return json({ error: 'Cannot reschedule while session is active.' }, { status: 409 });
			return json({ error: 'Not found' }, { status: 404 });
		}

		return json({ ok: true });
	}

	// ── Session start ─────────────────────────────────────────
	if (action === 'start_session') {
		const res = startParkingSession(locals.user.id, reservationId);
		if (!res.ok) return json({ error: 'Not found' }, { status: 404 });
		return json({ ok: true });
	}

	// ── Session stop ──────────────────────────────────────────
	if (action === 'stop_session') {
		const res = stopParkingSession(locals.user.id, reservationId);
		if (!res.ok) return json({ error: 'Could not stop session' }, { status: 409 });
		return json({ ok: true, actualTotalPrice: (res as any).actualTotalPrice ?? null });
	}

	return json({ error: 'Unknown action' }, { status: 400 });
};
