import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getDb } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const id = String(params.id ?? '');
	if (!id) return new Response('Not found', { status: 404 });

	const db = getDb();
	const row = db
		.prepare(
			`SELECT
        id,
        user_id as userId,
        receipt_code as receiptCode,
        lot_name as lotName,
        lot_area as lotArea,
        vehicle_type as vehicleType,
        needs_charging as needsCharging,
        slot_number as slotNumber,
        start_time as startTime,
        duration_hours as durationHours,
        price_per_hour as pricePerHour,
        total_price as totalPrice,
        status,
        created_at as createdAt
      FROM reservations
      WHERE id = ?`,
		)
		.get(id) as any;

	if (!row || row.userId !== locals.user.id) return new Response('Not found', { status: 404 });

	const pdf = await PDFDocument.create();
	const page = pdf.addPage([612, 792]); // letter-ish
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

	const margin = 48;
	let y = 792 - margin;

	function drawText(text: string, size = 12, bold = false, color = rgb(0.05, 0.07, 0.12)) {
		page.drawText(text, {
			x: margin,
			y,
			size,
			font: bold ? fontBold : font,
			color,
		});
		y -= size + 10;
	}

	// Header
	drawText('Smart Park', 20, true, rgb(0.05, 0.35, 0.18));
	drawText('Payment receipt', 14, true);
	y -= 6;
	page.drawLine({
		start: { x: margin, y },
		end: { x: 612 - margin, y },
		thickness: 1,
		color: rgb(0.85, 0.87, 0.92),
	});
	y -= 18;

	drawText(`Receipt: ${row.receiptCode}`, 12, true);
	drawText(`Status: ${String(row.status).toUpperCase()}`, 12, true);
	drawText(`Account: ${locals.user.email}`, 11, false, rgb(0.2, 0.25, 0.33));
	y -= 6;

	// Booking details
	drawText('Booking details', 13, true);
	drawText(`Lot: ${row.lotName}`, 12);
	drawText(`Area: ${row.lotArea}`, 12);
	drawText(`Vehicle: ${row.vehicleType === 'ev' ? 'EV' : 'Car'}`, 12);
	drawText(`Charging: ${row.needsCharging ? 'Yes' : 'No'}`, 12);
	drawText(`Slot: ${row.slotNumber ? `#${row.slotNumber}` : '—'}`, 12);
	drawText(`Start: ${new Date(Number(row.startTime)).toLocaleString()}`, 12);
	drawText(`Duration: ${row.durationHours} hour(s)`, 12);
	y -= 10;

	// Pricing box
	const boxYTop = y;
	const boxH = 110;
	page.drawRectangle({
		x: margin,
		y: boxYTop - boxH,
		width: 612 - margin * 2,
		height: boxH,
		borderColor: rgb(0.85, 0.87, 0.92),
		borderWidth: 1,
		color: rgb(0.98, 0.99, 1),
	});

	let bx = margin + 14;
	let by = boxYTop - 24;
	function drawBoxLine(label: string, value: string, isTotal = false) {
		page.drawText(label, { x: bx, y: by, size: 12, font: font, color: rgb(0.2, 0.25, 0.33) });
		page.drawText(value, {
			x: 612 - margin - 14 - fontBold.widthOfTextAtSize(value, 12),
			y: by,
			size: 12,
			font: isTotal ? fontBold : font,
			color: rgb(0.05, 0.07, 0.12),
		});
		by -= 22;
	}

	drawBoxLine('Price / hour', `INR ${row.pricePerHour}`);
	drawBoxLine('Hours', String(row.durationHours));
	drawBoxLine('Total', `INR ${row.totalPrice}`, true);
	y = boxYTop - boxH - 18;

	drawText(`Created: ${new Date(Number(row.createdAt)).toLocaleString()}`, 10, false, rgb(0.35, 0.42, 0.52));
	drawText('Thanks for choosing Smart Park.', 11, true);

	const bytes = await pdf.save();
	return new Response(new Uint8Array(bytes), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="receipt-${row.receiptCode}.pdf"`,
			'Cache-Control': 'no-store',
		},
	});
};

