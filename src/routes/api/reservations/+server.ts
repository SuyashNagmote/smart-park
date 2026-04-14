import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	awardBookingXp,
	cancelReservation,
	createReservation,
	getOrCreateUserStats,
	isSlotTaken,
	hasUserOverlappingLotBooking,
	listReservationsForUser,
	registerBookingStreak,
	rescheduleReservation,
	startParkingSession,
	stopParkingSession,
	type VehicleType,
} from '$lib/server/reservations';
import { updateQuestProgressOnBooking } from '$lib/server/quests';
import { debugLog } from '$lib/server/debuglog';

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

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = (await request.json().catch(() => null)) as any;
	if (!body) return json({ error: 'Invalid body' }, { status: 400 });

	// #region agent log
	fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H5',location:'src/routes/api/reservations/+server.ts:POST',message:'reservation POST received',data:{hasUser:Boolean(locals.user),lotId:String(body.lotId??'').slice(0,40),slotNumber:body.slotNumber??null,durationHours:body.durationHours??null,pricePerHour:body.pricePerHour??null},timestamp:Date.now()})}).catch(()=>{});
	debugLog({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H5',location:'src/routes/api/reservations/+server.ts:POST',message:'reservation POST received',data:{hasUser:Boolean(locals.user),lotId:String(body.lotId??'').slice(0,40),slotNumber:(body as any).slotNumber??null,durationHours:(body as any).durationHours??null,pricePerHour:(body as any).pricePerHour??null},timestamp:Date.now()});
	// #endregion

	const lotId = String(body.lotId ?? '');
	const lotName = String(body.lotName ?? '');
	const lotArea = String(body.lotArea ?? '');
	const lat = Number(body.lat);
	const lon = Number(body.lon);
	const vehicleType = String(body.vehicleType ?? 'car') as VehicleType;
	const needsCharging = Boolean(body.needsCharging);
	const startTime = Number(body.startTime ?? Date.now());
	const durationHours = Number(body.durationHours ?? 2);
	const pricePerHour = Number(body.pricePerHour ?? 50);
	const slotNumberRaw = body.slotNumber;
	const slotNumber =
		slotNumberRaw === null || slotNumberRaw === undefined || slotNumberRaw === ''
			? null
			: Number(slotNumberRaw);

	if (!lotId || !lotName || !Number.isFinite(lat) || !Number.isFinite(lon)) {
		return json({ error: 'Missing lot details' }, { status: 400 });
	}
	if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > 24) {
		return json({ error: 'Invalid duration' }, { status: 400 });
	}
	if (!Number.isFinite(pricePerHour) || pricePerHour < 10 || pricePerHour > 9999) {
		return json({ error: 'Invalid price' }, { status: 400 });
	}
	if (vehicleType !== 'car' && vehicleType !== 'ev') {
		return json({ error: 'Invalid vehicle type' }, { status: 400 });
	}

	if (slotNumber !== null && (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 2000)) {
		return json({ error: 'Invalid slot number' }, { status: 400 });
	}

	if (slotNumber !== null) {
		if (isSlotTaken({ lotId, slotNumber, startTime, durationHours })) {
			// #region agent log
			fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H5',location:'src/routes/api/reservations/+server.ts:slot',message:'slot taken conflict',data:{lotId:lotId.slice(0,40),slotNumber,startTime,durationHours},timestamp:Date.now()})}).catch(()=>{});
			debugLog({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H5',location:'src/routes/api/reservations/+server.ts:slot',message:'slot taken conflict',data:{lotId:lotId.slice(0,40),slotNumber,startTime,durationHours},timestamp:Date.now()});
			// #endregion
			return json({ error: 'Slot already taken for that time.' }, { status: 409 });
		}
	}

	// Prevent the same user booking the same lot twice for overlapping time
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

	const totalPrice = Math.round(pricePerHour * durationHours);
	const reservation = createReservation({
		userId: locals.user.id,
		lotId,
		lotName,
		lotArea,
		lat,
		lon,
		vehicleType,
		needsCharging,
		slotNumber,
		startTime,
		durationHours,
		pricePerHour,
		totalPrice,
	});

	// XP design (simple, fun):
	// +25 base for booking
	// +10 if EV
	// +10 if charging requested
	// +10 if long booking (>=3h)
	const xp =
		25 + (vehicleType === 'ev' ? 10 : 0) + (needsCharging ? 10 : 0) + (durationHours >= 3 ? 10 : 0);

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

export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = (await request.json().catch(() => null)) as any;
	if (!body) return json({ error: 'Invalid body' }, { status: 400 });

	const action = String(body.action ?? '');
	const reservationId = String(body.reservationId ?? '');
	if (!reservationId) return json({ error: 'Missing reservationId' }, { status: 400 });

	if (action === 'cancel') {
		const res = cancelReservation(locals.user.id, reservationId);
		if (!res.ok) return json({ error: 'Not found' }, { status: 404 });
		return json({ ok: true });
	}

	if (action === 'reschedule') {
		const startTime = Number(body.startTime ?? NaN);
		const durationHours = Number(body.durationHours ?? NaN);
		const pricePerHour = Number(body.pricePerHour ?? NaN);
		const slotNumberRaw = body.slotNumber;
		const slotNumber =
			slotNumberRaw === null || slotNumberRaw === undefined || slotNumberRaw === ''
				? null
				: Number(slotNumberRaw);

		if (!Number.isFinite(startTime)) return json({ error: 'Invalid startTime' }, { status: 400 });
		if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > 24)
			return json({ error: 'Invalid duration' }, { status: 400 });
		if (!Number.isFinite(pricePerHour) || pricePerHour < 10 || pricePerHour > 9999)
			return json({ error: 'Invalid price' }, { status: 400 });
		if (slotNumber !== null && (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 2000))
			return json({ error: 'Invalid slot number' }, { status: 400 });

		const res = rescheduleReservation(locals.user.id, {
			reservationId,
			startTime,
			durationHours,
			pricePerHour,
			slotNumber,
		});

		if (!res.ok) {
			if (res.reason === 'slot_taken') return json({ error: 'Slot already taken.' }, { status: 409 });
			if (res.reason === 'session_active')
				return json({ error: 'Cannot reschedule while session is active.' }, { status: 409 });
			return json({ error: 'Not found' }, { status: 404 });
		}

		return json({ ok: true });
	}

	if (action === 'start_session') {
		const res = startParkingSession(locals.user.id, reservationId);
		if (!res.ok) return json({ error: 'Not found' }, { status: 404 });
		return json({ ok: true });
	}

	if (action === 'stop_session') {
		const res = stopParkingSession(locals.user.id, reservationId);
		if (!res.ok) return json({ error: 'Could not stop' }, { status: 409 });
		return json({ ok: true, actualTotalPrice: (res as any).actualTotalPrice ?? null });
	}

	return json({ error: 'Unknown action' }, { status: 400 });
};

