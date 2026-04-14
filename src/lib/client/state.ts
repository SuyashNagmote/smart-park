import { derived, get, writable, type Writable } from 'svelte/store';
import type { ParkingLot } from '$lib/server/lots';
import { createEventBus } from './eventBus';
import { enqueue, flush } from './offlineQueue';

type Connection = 'connecting' | 'connected' | 'offline';

type AppState = {
	connection: Connection;
	lastUpdatedAt: string;
	lots: ParkingLot[];
	liveEvents: { type: string; lot: ParkingLot; timestamp: string }[];
	reservations: any[];
	stats: any | null;
	quests: any | null;
};

const initial: AppState = {
	connection: 'connecting',
	lastUpdatedAt: '',
	lots: [],
	liveEvents: [],
	reservations: [],
	stats: null,
	quests: null,
};

export const bus = createEventBus();
export const state: Writable<AppState> = writable(initial);
export const lots = derived(state, (s) => s.lots);
export const reservations = derived(state, (s) => s.reservations);
export const stats = derived(state, (s) => s.stats);
export const quests = derived(state, (s) => s.quests);
export const connection = derived(state, (s) => s.connection);

let sse: EventSource | null = null;
let inited = false;

function nowTime() {
	return new Date().toLocaleTimeString();
}

export async function refreshAll() {
	const [l, r, st, q] = await Promise.all([
		fetch('/api/lots').then((x) => x.json()).catch(() => null),
		fetch('/api/reservations').then((x) => x.json()).catch(() => null),
		fetch('/api/reservations?type=stats').then((x) => x.json()).catch(() => null),
		fetch('/api/quests').then((x) => x.json()).catch(() => null),
	]);

	state.update((s) => ({
		...s,
		lots: l?.lots ?? s.lots,
		reservations: r?.reservations ?? s.reservations,
		stats: st?.stats ?? s.stats,
		quests: q ?? s.quests,
		lastUpdatedAt: nowTime(),
	}));
}

export function initRealtime() {
	if (inited) return;
	inited = true;

	state.update((s) => ({ ...s, connection: 'connecting' }));
	sse = new EventSource('/api/stream');
	sse.addEventListener('connected', () => {
		state.update((s) => ({ ...s, connection: 'connected' }));
	});
	sse.addEventListener('parking_update', (e: any) => {
		try {
			const data = JSON.parse(e.data);
			const lot = data.lot as ParkingLot;
			state.update((s) => {
				const nextLots = s.lots.map((x) => (x.id === lot.id ? { ...x, ...lot } : x));
				const liveEvents = [data, ...s.liveEvents].slice(0, 30);
				return { ...s, lots: nextLots, liveEvents, lastUpdatedAt: nowTime() };
			});
		} catch {
			// ignore
		}
	});
	sse.onerror = () => {
		state.update((s) => ({ ...s, connection: 'offline' }));
	};
}

export async function book(payload: {
	lot: ParkingLot;
	vehicleType: 'car' | 'ev';
	needsCharging: boolean;
	slotNumber: number | null;
	durationHours: number;
	pricePerHour: number;
}) {
	const lot = payload.lot;

	// optimistic availability
	state.update((s) => ({
		...s,
		lots: s.lots.map((x) =>
			x.id === lot.id ? { ...x, available: Math.max(0, (x.available ?? 0) - 1) } : x,
		),
	}));

	try {
		const res = await fetch('/api/reservations', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				lotId: lot.id,
				lotName: lot.name,
				lotArea: lot.area,
				lat: lot.lat,
				lon: lot.lon,
				vehicleType: payload.vehicleType,
				needsCharging: payload.needsCharging,
				slotNumber: payload.slotNumber,
				startTime: Date.now(),
				durationHours: payload.durationHours,
				pricePerHour: payload.pricePerHour,
			}),
		});
		const data = await res.json();
		if (!res.ok) throw new Error(data?.error ?? 'Booking failed');

		// Show success immediately; never block toast on refresh failures
		bus.emit({ type: 'toast', title: 'Booking confirmed', message: `${data.reservation.receiptCode}` });
		bus.emit({ type: 'celebrate', xp: data?.xpAwarded ?? 0, receiptCode: data.reservation.receiptCode });
		try {
			await refreshAll();
		} catch {
			// ignore; booking already confirmed server-side
		}
		return { ok: true as const, data };
	} catch (e: any) {
		// rollback optimistic availability
		state.update((s) => ({
			...s,
			lots: s.lots.map((x) =>
				x.id === lot.id ? { ...x, available: (x.available ?? 0) + 1 } : x,
			),
		}));
		bus.emit({ type: 'toast', title: 'Could not book', message: String(e?.message ?? e) });
		return { ok: false as const, error: String(e?.message ?? e) };
	}
}

export async function cancelReservation(id: string) {
	const prev = get(state).reservations;
	state.update((s) => ({
		...s,
		reservations: s.reservations.map((r: any) => (r.id === id ? { ...r, status: 'cancelled' } : r)),
	}));

	bus.emit({
		type: 'undoable',
		id: `cancel:${id}`,
		title: 'Cancelled',
		message: 'Undo?',
		undo: async () => {
			// No backend undo implemented; refresh to restore real state
			state.set({ ...get(state), reservations: prev });
			await refreshAll();
		},
	});

	if (typeof navigator !== 'undefined' && !navigator.onLine) {
		enqueue({ kind: 'cancel', reservationId: id, createdAt: Date.now() });
		bus.emit({ type: 'toast', title: 'Queued offline', message: 'Will sync when online.' });
	} else {
		await fetch('/api/reservations', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'cancel', reservationId: id }),
		}).catch(() => {});
	}

	await refreshAll();
}

export function initOfflineSync() {
	if (typeof window === 'undefined') return;
	window.addEventListener('online', async () => {
		const res = await flush();
		if (res.flushed > 0) {
			bus.emit({ type: 'toast', title: 'Synced', message: `Applied ${res.flushed} queued action(s).` });
			await refreshAll();
		}
	});
}

