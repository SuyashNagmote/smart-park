import type { ParkingLot } from './lots';

export function calculateDynamicPricing(lot: ParkingLot): number {
	const hour = new Date().getHours();
	const baseRate = lot.hourlyRate || 50;

	// Math.max avoids NaN if capacity is 0
	const availabilityNum = lot.available !== undefined ? lot.available : lot.capacity;
	const availability = availabilityNum / Math.max(1, lot.capacity);

	let multiplier = 1;

	// Peak hour pricing matrix
	if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20)) {
		multiplier += 0.3;
	}

	// Demand-based pricing (Zero availability drives price to 1.5x)
	if (availability < 0.2) {
		multiplier += 0.5;
	} else if (availability < 0.5) {
		multiplier += 0.2;
	}

	// Weekend surge
	const dayOfWeek = new Date().getDay();
	if (dayOfWeek === 0 || dayOfWeek === 6) {
		multiplier += 0.1;
	}

	return Math.round(baseRate * multiplier);
}

export function generateSSEMessage(type: string, data: any) {
	return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}
