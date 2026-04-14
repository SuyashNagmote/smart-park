import { generateSSEMessage, calculateDynamicPricing } from '$lib/server/engine';
import { fetchPuneLots } from '$lib/server/lots';

export async function GET() {
	let interval: any;

	const stream = new ReadableStream({
		async start(controller) {
			try {
				const lots = await fetchPuneLots();

				// Send initial state
				controller.enqueue(
					generateSSEMessage('connected', { status: 'ONLINE', lots: lots.length }),
				);

				// Heartbeat & Simulation Loop (every 3s)
				interval = setInterval(() => {
					// Randomly change availability to simulate bookings and exits
					const activeLots = [...lots];
					const changedLots: any[] = [];

					// Change 1-3 lots randomly
					const changesCount = Math.floor(Math.random() * 3) + 1;
					for (let i = 0; i < changesCount; i++) {
						const idx = Math.floor(Math.random() * activeLots.length);
						const lot = activeLots[idx];

						if (!lot) continue;

						const oldAvail = lot.available || 0;
						const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
						const newAvail = Math.max(0, Math.min(lot.capacity, oldAvail + change));

						lot.available = newAvail;
						lot.hourlyRate = calculateDynamicPricing(lot); // recalculate dynamic rate
						changedLots.push(lot);
					}

					if (changedLots.length > 0 && Math.random() > 0.3) {
						// Stream Event: AI Dynamic Pricing recalculation or availability change
						const actionLot = changedLots[0];
						const type = Math.random() > 0.5 ? 'exit_detected' : 'price_surge';

						controller.enqueue(
							generateSSEMessage('parking_update', {
								type,
								lot: actionLot,
								timestamp: new Date().toISOString(),
							}),
						);
					}

					// Predictor state updates
					controller.enqueue(
						generateSSEMessage('tick', {
							availableTokens: Math.floor(Math.random() * 50) + 100,
							predictionConfidence: (90 + Math.random() * 8).toFixed(1),
						}),
					);
				}, 3000);
			} catch (e) {
				console.error('Stream initialization failed', e);
				controller.close();
			}
		},
		cancel() {
			clearInterval(interval);
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	});
}
