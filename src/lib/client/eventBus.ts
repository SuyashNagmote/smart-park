type Handler<T> = (event: T) => void;

export type AppEvent =
	| { type: 'toast'; title: string; message?: string }
	| { type: 'undoable'; id: string; title: string; message?: string; undo: () => Promise<void> | void }
	| { type: 'celebrate'; xp: number; receiptCode: string };

export function createEventBus() {
	const handlers = new Set<Handler<AppEvent>>();
	return {
		on(handler: Handler<AppEvent>) {
			handlers.add(handler);
			return () => handlers.delete(handler);
		},
		emit(event: AppEvent) {
			for (const h of handlers) h(event);
		},
	};
}

