import crypto from 'node:crypto';
import { getDb } from './db';

export type ReservationStatus = 'confirmed' | 'cancelled';
export type VehicleType = 'car' | 'ev';

export type Reservation = {
	id: string;
	receiptCode: string;
	userId: string;
	lotId: string;
	lotName: string;
	lotArea: string;
	lat: number;
	lon: number;
	vehicleType: VehicleType;
	needsCharging: boolean;
	slotNumber: number | null;
	startTime: number;
	durationHours: number;
	pricePerHour: number;
	totalPrice: number;
	status: ReservationStatus;
	sessionStatus: 'not_started' | 'active' | 'completed';
	sessionStartedAt: number | null;
	sessionEndedAt: number | null;
	actualTotalPrice: number | null;
	createdAt: number;
	updatedAt: number;
};

export type UserStats = {
	userId: string;
	xp: number;
	level: number;
	streakDays: number;
	lastBookingDay: string | null;
	badges: string[];
	updatedAt: number;
};

function now() {
	return Date.now();
}

function id(prefix: string) {
	return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function dayKey(ts: number) {
	const d = new Date(ts);
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

function computeLevel(xp: number) {
	// easy curve: level increases every 250xp, capped at >=1
	return Math.max(1, Math.floor(xp / 250) + 1);
}

export function listReservationsForUser(userId: string): Reservation[] {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT
        id,
        receipt_code as receiptCode,
        user_id as userId,
        lot_id as lotId,
        lot_name as lotName,
        lot_area as lotArea,
        lat,
        lon,
        vehicle_type as vehicleType,
        needs_charging as needsCharging,
        slot_number as slotNumber,
        start_time as startTime,
        duration_hours as durationHours,
        price_per_hour as pricePerHour,
        total_price as totalPrice,
        status,
        session_status as sessionStatus,
        session_started_at as sessionStartedAt,
        session_ended_at as sessionEndedAt,
        actual_total_price as actualTotalPrice,
        created_at as createdAt,
        updated_at as updatedAt
      FROM reservations
      WHERE user_id = ?
      ORDER BY created_at DESC`,
		)
		.all(userId) as any[];

	return rows.map((r) => ({
		...r,
		needsCharging: Boolean(r.needsCharging),
		slotNumber: r.slotNumber === null || r.slotNumber === undefined ? null : Number(r.slotNumber),
		sessionStartedAt:
			r.sessionStartedAt === null || r.sessionStartedAt === undefined ? null : Number(r.sessionStartedAt),
		sessionEndedAt:
			r.sessionEndedAt === null || r.sessionEndedAt === undefined ? null : Number(r.sessionEndedAt),
		actualTotalPrice:
			r.actualTotalPrice === null || r.actualTotalPrice === undefined ? null : Number(r.actualTotalPrice),
	})) as Reservation[];
}

export function getOrCreateUserStats(userId: string): UserStats {
	const db = getDb();
	const row = db
		.prepare(
			`SELECT
        user_id as userId,
        xp,
        level,
        streak_days as streakDays,
        last_booking_day as lastBookingDay,
        badges_json as badgesJson,
        updated_at as updatedAt
      FROM user_stats
      WHERE user_id = ?`,
		)
		.get(userId) as
		| {
				userId: string;
				xp: number;
				level: number;
				streakDays: number;
				lastBookingDay: string | null;
				badgesJson: string;
				updatedAt: number;
		  }
		| undefined;

	if (row) {
		let badges: string[] = [];
		try {
			badges = JSON.parse(row.badgesJson || '[]');
		} catch {
			badges = [];
		}
		return { ...row, badges };
	}

	const created: UserStats = {
		userId,
		xp: 0,
		level: 1,
		streakDays: 0,
		lastBookingDay: null,
		badges: [],
		updatedAt: now(),
	};

	db.prepare(
		`INSERT INTO user_stats (user_id, xp, level, streak_days, last_booking_day, badges_json, updated_at)
     VALUES (@userId, @xp, @level, @streakDays, @lastBookingDay, @badgesJson, @updatedAt)`,
	).run({ ...created, badgesJson: JSON.stringify(created.badges) });

	return created;
}

export function awardBookingXp(userId: string, xpDelta: number, badgesToAdd: string[] = []) {
	const db = getDb();
	const stats = getOrCreateUserStats(userId);

	const nextXp = Math.max(0, stats.xp + Math.max(0, Math.floor(xpDelta)));
	const nextLevel = computeLevel(nextXp);

	const nextBadges = new Set(stats.badges);
	for (const b of badgesToAdd) nextBadges.add(b);

	const updatedAt = now();
	db.prepare(
		`UPDATE user_stats
     SET xp = @xp,
         level = @level,
         badges_json = @badgesJson,
         updated_at = @updatedAt
     WHERE user_id = @userId`,
	).run({
		userId,
		xp: nextXp,
		level: nextLevel,
		badgesJson: JSON.stringify(Array.from(nextBadges)),
		updatedAt,
	});

	return getOrCreateUserStats(userId);
}

export function registerBookingStreak(userId: string, bookingTs: number) {
	const db = getDb();
	const stats = getOrCreateUserStats(userId);

	const today = dayKey(bookingTs);
	const yesterday = dayKey(bookingTs - 24 * 60 * 60 * 1000);

	let nextStreak = stats.streakDays;
	if (stats.lastBookingDay === today) {
		// already counted
	} else if (stats.lastBookingDay === yesterday) {
		nextStreak += 1;
	} else {
		nextStreak = 1;
	}

	db.prepare(
		`UPDATE user_stats
     SET streak_days = @streakDays,
         last_booking_day = @lastBookingDay,
         updated_at = @updatedAt
     WHERE user_id = @userId`,
	).run({
		userId,
		streakDays: nextStreak,
		lastBookingDay: today,
		updatedAt: now(),
	});

	return getOrCreateUserStats(userId);
}

export function createReservation(input: {
	userId: string;
	lotId: string;
	lotName: string;
	lotArea: string;
	lat: number;
	lon: number;
	vehicleType: VehicleType;
	needsCharging: boolean;
	slotNumber: number | null;
	startTime: number;
	durationHours: number;
	pricePerHour: number;
	totalPrice: number;
}) {
	const db = getDb();
	const createdAt = now();
	const res: Reservation = {
		id: id('rsv'),
		receiptCode: `RCPT-${String(Math.floor(100000 + Math.random() * 900000))}`,
		userId: input.userId,
		lotId: input.lotId,
		lotName: input.lotName,
		lotArea: input.lotArea,
		lat: input.lat,
		lon: input.lon,
		vehicleType: input.vehicleType,
		needsCharging: Boolean(input.needsCharging),
		slotNumber: input.slotNumber ?? null,
		startTime: input.startTime,
		durationHours: input.durationHours,
		pricePerHour: input.pricePerHour,
		totalPrice: input.totalPrice,
		status: 'confirmed',
		sessionStatus: 'not_started',
		sessionStartedAt: null,
		sessionEndedAt: null,
		actualTotalPrice: null,
		createdAt,
		updatedAt: createdAt,
	};

	db.prepare(
		`INSERT INTO reservations (
        id, receipt_code, user_id,
        lot_id, lot_name, lot_area,
        lat, lon,
        vehicle_type, needs_charging,
        slot_number,
        start_time, duration_hours,
        price_per_hour, total_price,
        status,
        session_status, session_started_at, session_ended_at, actual_total_price,
        created_at, updated_at
      ) VALUES (
        @id, @receiptCode, @userId,
        @lotId, @lotName, @lotArea,
        @lat, @lon,
        @vehicleType, @needsCharging,
        @slotNumber,
        @startTime, @durationHours,
        @pricePerHour, @totalPrice,
        @status,
        @sessionStatus, @sessionStartedAt, @sessionEndedAt, @actualTotalPrice,
        @createdAt, @updatedAt
      )`,
	).run({
		...res,
		needsCharging: res.needsCharging ? 1 : 0,
	});

	return res;
}

export function cancelReservation(userId: string, reservationId: string) {
	const db = getDb();
	const row = db
		.prepare(
			`SELECT id, user_id as userId, status
       FROM reservations
       WHERE id = ?`,
		)
		.get(reservationId) as { id: string; userId: string; status: ReservationStatus } | undefined;

	if (!row || row.userId !== userId) return { ok: false as const, reason: 'not_found' as const };
	if (row.status === 'cancelled') return { ok: true as const };

	db.prepare(`UPDATE reservations SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(
		now(),
		reservationId,
	);
	return { ok: true as const };
}

function overlaps(aStart: number, aHours: number, bStart: number, bHours: number) {
	const aEnd = aStart + aHours * 60 * 60 * 1000;
	const bEnd = bStart + bHours * 60 * 60 * 1000;
	return aStart < bEnd && bStart < aEnd;
}

export function isSlotTaken(args: {
	lotId: string;
	slotNumber: number;
	startTime: number;
	durationHours: number;
	excludeReservationId?: string;
}) {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT id, start_time as startTime, duration_hours as durationHours
       FROM reservations
       WHERE lot_id = ?
         AND status = 'confirmed'
         AND slot_number = ?
         AND id != COALESCE(?, id)`,
		)
		.all(args.lotId, args.slotNumber, args.excludeReservationId ?? null) as any[];

	return rows.some((r) => overlaps(Number(r.startTime), Number(r.durationHours), args.startTime, args.durationHours));
}

export function hasUserOverlappingLotBooking(args: {
	userId: string;
	lotId: string;
	startTime: number;
	durationHours: number;
}) {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT start_time as startTime, duration_hours as durationHours
       FROM reservations
       WHERE user_id = ?
         AND lot_id = ?
         AND status = 'confirmed'`,
		)
		.all(args.userId, args.lotId) as any[];

	return rows.some((r) =>
		overlaps(Number(r.startTime), Number(r.durationHours), args.startTime, args.durationHours),
	);
}

export function rescheduleReservation(userId: string, input: {
	reservationId: string;
	startTime: number;
	durationHours: number;
	pricePerHour: number;
	slotNumber: number | null;
}) {
	const db = getDb();
	const row = db
		.prepare(
			`SELECT
        id,
        user_id as userId,
        lot_id as lotId,
        status,
        session_status as sessionStatus
      FROM reservations
      WHERE id = ?`,
		)
		.get(input.reservationId) as
		| { id: string; userId: string; lotId: string; status: ReservationStatus; sessionStatus: string }
		| undefined;

	if (!row || row.userId !== userId) return { ok: false as const, reason: 'not_found' as const };
	if (row.status !== 'confirmed') return { ok: false as const, reason: 'not_confirmed' as const };
	if (row.sessionStatus === 'active') return { ok: false as const, reason: 'session_active' as const };

	const totalPrice = Math.round(input.pricePerHour * input.durationHours);

	if (input.slotNumber !== null) {
		if (
			isSlotTaken({
				lotId: row.lotId,
				slotNumber: input.slotNumber,
				startTime: input.startTime,
				durationHours: input.durationHours,
				excludeReservationId: input.reservationId,
			})
		) {
			return { ok: false as const, reason: 'slot_taken' as const };
		}
	}

	db.prepare(
		`UPDATE reservations
     SET start_time = @startTime,
         duration_hours = @durationHours,
         price_per_hour = @pricePerHour,
         total_price = @totalPrice,
         slot_number = @slotNumber,
         updated_at = @updatedAt
     WHERE id = @id AND user_id = @userId`,
	).run({
		id: input.reservationId,
		userId,
		startTime: input.startTime,
		durationHours: input.durationHours,
		pricePerHour: input.pricePerHour,
		totalPrice,
		slotNumber: input.slotNumber,
		updatedAt: now(),
	});

	return { ok: true as const };
}

export function startParkingSession(userId: string, reservationId: string) {
	const db = getDb();
	const row = db
		.prepare(
			`SELECT id, user_id as userId, status, session_status as sessionStatus
       FROM reservations WHERE id = ?`,
		)
		.get(reservationId) as
		| { id: string; userId: string; status: ReservationStatus; sessionStatus: string }
		| undefined;

	if (!row || row.userId !== userId) return { ok: false as const, reason: 'not_found' as const };
	if (row.status !== 'confirmed') return { ok: false as const, reason: 'not_confirmed' as const };
	if (row.sessionStatus === 'active') return { ok: true as const };

	db.prepare(
		`UPDATE reservations
     SET session_status = 'active',
         session_started_at = @startedAt,
         updated_at = @updatedAt
     WHERE id = @id AND user_id = @userId`,
	).run({ id: reservationId, userId, startedAt: now(), updatedAt: now() });

	return { ok: true as const };
}

export function stopParkingSession(userId: string, reservationId: string) {
	const db = getDb();
	const row = db
		.prepare(
			`SELECT
        id,
        user_id as userId,
        status,
        session_status as sessionStatus,
        session_started_at as sessionStartedAt,
        price_per_hour as pricePerHour
      FROM reservations WHERE id = ?`,
		)
		.get(reservationId) as
		| {
				id: string;
				userId: string;
				status: ReservationStatus;
				sessionStatus: string;
				sessionStartedAt: number | null;
				pricePerHour: number;
		  }
		| undefined;

	if (!row || row.userId !== userId) return { ok: false as const, reason: 'not_found' as const };
	if (row.status !== 'confirmed') return { ok: false as const, reason: 'not_confirmed' as const };
	if (row.sessionStatus !== 'active') return { ok: false as const, reason: 'not_active' as const };

	const startedAt = Number(row.sessionStartedAt ?? now());
	const endedAt = now();
	const elapsedMs = Math.max(0, endedAt - startedAt);
	const hours = elapsedMs / (60 * 60 * 1000);
	const actualTotal = Math.max(0, Math.round(Number(row.pricePerHour) * hours));

	db.prepare(
		`UPDATE reservations
     SET session_status = 'completed',
         session_ended_at = @endedAt,
         actual_total_price = @actualTotalPrice,
         updated_at = @updatedAt
     WHERE id = @id AND user_id = @userId`,
	).run({
		id: reservationId,
		userId,
		endedAt,
		actualTotalPrice: actualTotal,
		updatedAt: now(),
	});

	return { ok: true as const, actualTotalPrice: actualTotal };
}

