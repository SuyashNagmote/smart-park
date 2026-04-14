type QueuedAction =
	| { kind: 'cancel'; reservationId: string; createdAt: number }
	| { kind: 'reschedule'; reservationId: string; payload: any; createdAt: number };

const KEY = 'sp_offline_queue_v1';

function load(): QueuedAction[] {
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
	} catch {
		return [];
	}
}

function save(items: QueuedAction[]) {
	try {
		localStorage.setItem(KEY, JSON.stringify(items.slice(-50)));
	} catch {
		// ignore
	}
}

export function enqueue(action: QueuedAction) {
	const items = load();
	items.push(action);
	save(items);
}

export function peekAll() {
	return load();
}

export function clear() {
	save([]);
}

export async function flush() {
	const items = load();
	if (items.length === 0) return { ok: true as const, flushed: 0 };

	let flushed = 0;
	const remaining: QueuedAction[] = [];
	for (const a of items) {
		try {
			if (a.kind === 'cancel') {
				const res = await fetch('/api/reservations', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ action: 'cancel', reservationId: a.reservationId }),
				});
				if (!res.ok) throw new Error('cancel failed');
			}
			if (a.kind === 'reschedule') {
				const res = await fetch('/api/reservations', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ action: 'reschedule', reservationId: a.reservationId, ...a.payload }),
				});
				if (!res.ok) throw new Error('reschedule failed');
			}
			flushed++;
		} catch {
			remaining.push(a);
		}
	}
	save(remaining);
	return { ok: true as const, flushed };
}

