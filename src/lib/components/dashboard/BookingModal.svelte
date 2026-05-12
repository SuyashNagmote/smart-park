<script lang="ts">
	let {
		lot,
		duration,
		vehicle,
		needsCharging,
		slot,
		priceId,
		busy,
		error,
		onClose,
		onDurationChange,
		onVehicleChange,
		onChargingToggle,
		onSlotChange,
		onPriceChange,
		onConfirm,
		onStartTimeChange,
		bindModalEl,
	}: {
		lot: any;
		duration: number;
		vehicle: 'car' | 'ev';
		needsCharging: boolean;
		slot: number | null;
		priceId: 'standard' | 'flex' | 'green';
		busy: boolean;
		error: string | null;
		onClose: () => void;
		onDurationChange: (h: number) => void;
		onVehicleChange: (v: 'car' | 'ev') => void;
		onChargingToggle: () => void;
		onSlotChange: (s: number | null) => void;
		onPriceChange: (p: 'standard' | 'flex' | 'green') => void;
		onConfirm: () => void;
		onStartTimeChange?: (ts: number) => void;
		bindModalEl: (el: HTMLDivElement) => void;
	} = $props();

	let modalEl: HTMLDivElement | undefined = $state();
	$effect(() => {
		if (modalEl) bindModalEl(modalEl);
	});

	// ── Step state — fully owned by the modal ────────────────────
	let internalStep = $state<1 | 2 | 3 | 4>(1);

	function goNext() {
		if (internalStep < 3) internalStep = (internalStep + 1) as 2 | 3;
	}

	function goBack() {
		if (internalStep > 1) internalStep = (internalStep - 1) as 1 | 2 | 3;
	}

	function goToPayment() {
		internalStep = 4;
	}

	function handlePaid() {
		onConfirm();
	}

	// Reset step when modal opens (lot changes = new booking)
	$effect(() => {
		if (lot) internalStep = 1;
	});

	// ── Start time state ─────────────────────────────────────────
	let startMode = $state<'now' | 'schedule'>('now');
	let scheduledDatetime = $state<string>('');

	function nowDatetimeLocal(): string {
		const d = new Date();
		d.setSeconds(0, 0);
		return d.toISOString().slice(0, 16);
	}

	function maxDatetimeLocal(): string {
		const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
		return d.toISOString().slice(0, 16);
	}

	function setStartMode(mode: 'now' | 'schedule') {
		startMode = mode;
		if (mode === 'now') {
			onStartTimeChange?.(Date.now());
		} else {
			if (!scheduledDatetime) scheduledDatetime = nowDatetimeLocal();
			const ts = new Date(scheduledDatetime).getTime();
			if (!isNaN(ts)) onStartTimeChange?.(ts);
		}
	}

	function handleDatetimeChange(val: string) {
		scheduledDatetime = val;
		const ts = new Date(val).getTime();
		if (!isNaN(ts)) onStartTimeChange?.(ts);
	}

	let startTimeDisplay = $derived(
		startMode === 'now'
			? 'Now'
			: scheduledDatetime
				? new Date(scheduledDatetime).toLocaleString(undefined, {
						dateStyle: 'medium',
						timeStyle: 'short',
					})
				: 'Not set',
	);

	// ── Slot picker state ────────────────────────────────────────
	let manualSlot = $state<string>('');

	function slotCount(): number {
		return Math.min(lot?.capacity ?? 20, 20);
	}

	function handleSlotSelect(s: number | null) {
		onSlotChange(s);
		if (s !== null) manualSlot = String(s);
	}

	function handleManualSlot(val: string) {
		manualSlot = val;
		const n = parseInt(val, 10);
		if (!isNaN(n) && n >= 1) onSlotChange(n);
		else onSlotChange(null);
	}

	// ── UPI QR (client-side generation) ──────────────────────────
	import QRCode from 'qrcode';

	const UPI_ID = '9325108742@ybl';
	const UPI_NAME = 'SmartPark';

	function upiUrl(amount: number): string {
		const note = encodeURIComponent('Parking Booking');
		const name = encodeURIComponent(UPI_NAME);
		return `upi://pay?pa=${UPI_ID}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;
	}

	let qrCanvas: HTMLCanvasElement | undefined = $state();
	let lastQrAmount = $state(0);

	$effect(() => {
		if (internalStep !== 4 || !lot || !qrCanvas) return;
		const priceOpt = optionPrices(lot).find((o) => o.id === priceId) ?? optionPrices(lot)[0];
		const total = Math.round(priceOpt.perHour * duration);
		if (total === lastQrAmount && qrCanvas.dataset.rendered === 'true') return;
		lastQrAmount = total;
		const url = upiUrl(total);
		QRCode.toCanvas(qrCanvas, url, {
			width: 200,
			margin: 2,
			color: { dark: '#000000', light: '#ffffff' }
		}).then(() => {
			if (qrCanvas) qrCanvas.dataset.rendered = 'true';
		});
	});

	function optionPrices(l: any) {
		const base = l.hourlyRate ?? 50;
		const surge = Math.max(0, Math.round(base * 0.18));
		const greenDiscount = l.ev ? Math.round(base * 0.08) : 0;
		return [
			{ id: 'standard', label: 'Standard', perHour: base },
			{ id: 'flex', label: 'Flex', perHour: base + surge },
			{ id: 'green', label: 'Green Saver', perHour: Math.max(10, base - greenDiscount) },
		];
	}
</script>

<!-- Backdrop -->
<div class="booking-backdrop" onclick={() => !busy && onClose()} aria-hidden="true"></div>

<!-- Modal card -->
<div
	class="booking-modal"
	role="dialog"
	aria-modal="true"
	aria-label="Reserve parking"
	tabindex="-1"
	bind:this={modalEl}
>
	<!-- Header -->
	<div class="booking-header">
		<div class="min-w-0">
			<h2 class="booking-title">Reserve parking</h2>
			{#if lot}
				<p class="booking-subtitle">{lot.name} · {lot.area}</p>
			{/if}
		</div>
		<button
			class="sp-btn booking-close"
			type="button"
			onclick={onClose}
			disabled={busy}
			aria-label="Close booking dialog">✕</button
		>
	</div>

	<!-- Progress indicator -->
	<div class="booking-progress" aria-label="Step {internalStep} of 4">
		{#each [1, 2, 3, 4] as const as s}
			<div
				class="booking-progress-step"
				class:is-active={internalStep === s}
				class:is-done={internalStep > s}
			>
				<div class="booking-progress-dot">
					{#if internalStep > s}✓{:else}{s}{/if}
				</div>
				<span class="booking-progress-label">{['Duration', 'Price', 'Confirm', 'Pay'][s - 1]}</span>
			</div>
			{#if s < 4}
				<div class="booking-progress-line" class:is-done={internalStep > s}></div>
			{/if}
		{/each}
	</div>

	<!-- Steps container -->
	<div class="booking-steps-wrap">
		{#if lot}
			<!-- Step 1: Duration & Vehicle -->
			<div
				class="booking-step"
				class:is-active={internalStep === 1}
				aria-hidden={internalStep !== 1}
			>
				<!-- Start time picker -->
				<div class="booking-field-group">
					<div class="booking-field-label">Start time</div>
					<div class="booking-pills-row">
						<button
							type="button"
							class="sp-pill booking-pill"
							class:is-selected={startMode === 'now'}
							onclick={() => setStartMode('now')}>Now</button
						>
						<button
							type="button"
							class="sp-pill booking-pill"
							class:is-selected={startMode === 'schedule'}
							onclick={() => setStartMode('schedule')}>Schedule</button
						>
					</div>
					{#if startMode === 'schedule'}
						<input
							type="datetime-local"
							class="sp-input mt-1"
							value={scheduledDatetime}
							min={nowDatetimeLocal()}
							max={maxDatetimeLocal()}
							oninput={(e) => handleDatetimeChange((e.target as HTMLInputElement).value)}
						/>
					{/if}
					<p class="booking-hint">Bookings can be scheduled up to 7 days in advance</p>
				</div>

				<div class="booking-field-group">
					<div class="booking-field-label">Duration</div>
					<div class="booking-pills-row">
						{#each [1, 2, 3, 4, 6, 8, 12] as h}
							<button
								type="button"
								class="sp-pill booking-pill"
								class:is-selected={duration === h}
								onclick={() => onDurationChange(h)}>{h}h</button
							>
						{/each}
					</div>
				</div>

				<div class="booking-field-group">
					<div class="booking-field-label">Vehicle type</div>
					<div class="booking-pills-row">
						<button
							type="button"
							class="sp-pill booking-pill"
							class:is-selected={vehicle === 'car'}
							onclick={() => onVehicleChange('car')}>🚗 Car</button
						>
						<button
							type="button"
							class="sp-pill booking-pill"
							class:is-selected={vehicle === 'ev'}
							onclick={() => onVehicleChange('ev')}
							disabled={!lot.ev}>⚡ EV</button
						>
					</div>
					{#if !lot.ev}
						<p class="booking-hint">This lot does not support EV charging.</p>
					{/if}
				</div>

				{#if lot.ev}
					<div class="booking-field-group">
						<label class="booking-checkbox-label">
							<input
								type="checkbox"
								checked={needsCharging}
								onchange={onChargingToggle}
								class="booking-checkbox"
							/>
							<span>I need EV charging</span>
						</label>
					</div>
				{/if}

				<!-- Slot picker -->
				<div class="booking-field-group">
					<div class="booking-field-label">Slot preference</div>
					<div class="slot-grid">
						<!-- Any slot option -->
						<button
							type="button"
							class="slot-btn slot-btn--any"
							class:is-selected={slot === null}
							onclick={() => handleSlotSelect(null)}
							title="Any available slot">Any</button
						>
						{#each Array.from({ length: slotCount() }, (_, i) => i + 1) as n}
							<button
								type="button"
								class="slot-btn"
								class:is-selected={slot === n}
								onclick={() => handleSlotSelect(n)}
								title="Slot {n}">{n}</button
							>
						{/each}
					</div>
					{#if (lot.capacity ?? 0) > 20}
						<div class="booking-hint mt-1">
							or enter manually:
							<input
								type="number"
								class="sp-input slot-manual-input"
								min="1"
								max={lot.capacity}
								placeholder="Slot #"
								value={manualSlot}
								oninput={(e) => handleManualSlot((e.target as HTMLInputElement).value)}
							/>
						</div>
					{/if}
				</div>

				<div class="booking-step-nav">
					<button type="button" class="sp-btn sp-btn-primary booking-next-btn" onclick={goNext}
						>Next →</button
					>
				</div>
			</div>

			<!-- Step 2: Price Tier -->
			<div
				class="booking-step"
				class:is-active={internalStep === 2}
				aria-hidden={internalStep !== 2}
			>
				<div class="booking-field-group">
					<div class="booking-field-label">Choose your price tier</div>
					<div class="booking-price-cards">
						{#each optionPrices(lot) as opt}
							<button
								type="button"
								class="booking-price-card"
								class:is-selected={priceId === opt.id}
								onclick={() => onPriceChange(opt.id as 'standard' | 'flex' | 'green')}
							>
								<div class="booking-price-label">{opt.label}</div>
								<div class="booking-price-amount">
									₹{opt.perHour}<span class="booking-price-unit">/hr</span>
								</div>
								<div class="booking-price-desc">
									{#if opt.id === 'standard'}Flat rate, no surprises.
									{:else if opt.id === 'flex'}Priority access during peak hours.
									{:else}Eco discount for EV-friendly choice.{/if}
								</div>
							</button>
						{/each}
					</div>
				</div>

				<div class="booking-step-nav booking-step-nav--split">
					<button type="button" class="sp-btn booking-back-btn" onclick={goBack}>← Back</button>
					<button type="button" class="sp-btn sp-btn-primary booking-next-btn" onclick={goNext}
						>Next →</button
					>
				</div>
			</div>

			<!-- Step 3: Confirm -->
			<div
				class="booking-step"
				class:is-active={internalStep === 3}
				aria-hidden={internalStep !== 3}
			>
				{#if internalStep === 3}
					{@const priceOpt =
						optionPrices(lot).find((o) => o.id === priceId) ?? optionPrices(lot)[0]}
					{@const total = Math.round(priceOpt.perHour * duration)}
					<div class="booking-summary-card">
						<div class="booking-summary-row">
							<span class="booking-summary-key">Lot</span>
							<span class="booking-summary-val">{lot.name}</span>
						</div>
						<div class="booking-summary-row">
							<span class="booking-summary-key">Start time</span>
							<span class="booking-summary-val">{startTimeDisplay}</span>
						</div>
						<div class="booking-summary-row">
							<span class="booking-summary-key">Duration</span>
							<span class="booking-summary-val">{duration}h</span>
						</div>
						<div class="booking-summary-row">
							<span class="booking-summary-key">Vehicle</span>
							<span class="booking-summary-val"
								>{vehicle === 'ev' ? 'EV' : 'Car'}{needsCharging ? ' + Charging' : ''}</span
							>
						</div>
						{#if slot !== null}
							<div class="booking-summary-row">
								<span class="booking-summary-key">Slot</span>
								<span class="booking-summary-val">#{slot}</span>
							</div>
						{/if}
						<div class="booking-summary-row">
							<span class="booking-summary-key">Price tier</span>
							<span class="booking-summary-val">{priceOpt.label} · ₹{priceOpt.perHour}/hr</span>
						</div>
						<div class="booking-summary-row booking-summary-total">
							<span class="booking-summary-key">Total</span>
							<span class="booking-summary-total-val">₹{total}</span>
						</div>
					</div>

					{#if error}
						<div class="booking-error" role="alert">{error}</div>
					{/if}

					<div class="booking-step-nav booking-step-nav--split">
						<button type="button" class="sp-btn booking-back-btn" onclick={goBack} disabled={busy}
							>← Back</button
						>
						<button
							type="button"
							class="sp-btn sp-btn-primary booking-confirm-btn"
							onclick={goToPayment}
							disabled={busy}
						>
							Proceed to Pay →
						</button>
					</div>
				{/if}
			</div>

			<!-- Step 4: UPI Payment -->
			<div
				class="booking-step"
				class:is-active={internalStep === 4}
				aria-hidden={internalStep !== 4}
			>
				{#if internalStep === 4}
					{@const priceOpt =
						optionPrices(lot).find((o) => o.id === priceId) ?? optionPrices(lot)[0]}
					{@const total = Math.round(priceOpt.perHour * duration)}

					<div class="pay-card">
						<!-- Amount -->
						<div class="pay-amount-row">
							<span class="pay-amount-label">Amount to pay</span>
							<span class="pay-amount-value">₹{total}</span>
						</div>

						<!-- QR code -->
						<div class="pay-qr-wrap">
						<canvas
							bind:this={qrCanvas}
							class="pay-qr-img"
							width="200"
							height="200"
						></canvas>
							<div class="pay-qr-badge">
								<span class="pay-qr-badge-dot"></span>
								Scan with any UPI app
							</div>
						</div>

						<!-- UPI ID -->
						<div class="pay-upi-row">
							<span class="pay-upi-label">UPI ID</span>
							<span class="pay-upi-id">{UPI_ID}</span>
						</div>

						<!-- Supported apps -->
						<div class="pay-apps-row">
							<span class="pay-app-tag">GPay</span>
							<span class="pay-app-tag">PhonePe</span>
							<span class="pay-app-tag">Paytm</span>
							<span class="pay-app-tag">BHIM</span>
							<span class="pay-app-tag">Any UPI</span>
						</div>

						<!-- Demo note -->
						<div class="pay-demo-note">
							<span class="i-fa6-solid-circle-info" aria-hidden="true"></span>
							Demo mode — tap "I've paid" to confirm your booking after scanning.
						</div>
					</div>

					{#if error}
						<div class="booking-error" role="alert">{error}</div>
					{/if}

					<div class="booking-step-nav booking-step-nav--split">
						<button
							type="button"
							class="sp-btn booking-back-btn"
							onclick={() => {
								internalStep = 3;
							}}
							disabled={busy}>← Back</button
						>
						<button
							type="button"
							class="sp-btn sp-btn-primary booking-confirm-btn"
							onclick={handlePaid}
							disabled={busy}
						>
							{busy ? 'Confirming…' : "✓ I've paid"}
						</button>
					</div>
				{/if}
			</div>
		{:else}
			<div class="booking-step is-active">
				<p style="color: var(--sp-muted); font-size: 14px;">No lot selected.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	/* ── Booking Modal ───────────────────────────────────────────── */
	.booking-backdrop {
		position: fixed;
		inset: 0;
		z-index: 49;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	.booking-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 50;
		width: min(520px, calc(100vw - 32px));
		max-height: calc(100svh - 48px);
		overflow-y: auto;
		border-radius: 24px;
		border: 1px solid var(--sp-border);
		background: var(--sp-surface-strong);
		box-shadow: 0 32px 120px rgba(0, 0, 0, 0.45);
		padding: 24px;
		outline: none;
	}

	.booking-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 20px;
	}

	.booking-title {
		font-family: var(--sp-font-display);
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--sp-text);
		margin: 0;
	}

	.booking-subtitle {
		font-size: 13px;
		color: var(--sp-muted);
		margin: 4px 0 0;
	}

	.booking-close {
		padding: 8px 12px;
		font-size: 14px;
		cursor: pointer;
		flex-shrink: 0;
	}

	/* Progress indicator */
	.booking-progress {
		display: flex;
		align-items: center;
		margin-bottom: 24px;
	}

	.booking-progress-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.booking-progress-dot {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid var(--sp-border);
		background: var(--sp-surface);
		display: grid;
		place-items: center;
		font-size: 12px;
		font-weight: 700;
		color: var(--sp-muted);
		transition:
			background 200ms ease,
			border-color 200ms ease,
			color 200ms ease;
	}

	.booking-progress-step.is-active .booking-progress-dot {
		border-color: var(--sp-brand);
		background: var(--sp-brand);
		color: #05210f;
	}

	.booking-progress-step.is-done .booking-progress-dot {
		border-color: var(--sp-brand);
		background: color-mix(in srgb, var(--sp-brand) 20%, transparent);
		color: var(--sp-brand);
	}

	.booking-progress-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--sp-muted);
		white-space: nowrap;
	}

	.booking-progress-step.is-active .booking-progress-label {
		color: var(--sp-brand);
	}

	.booking-progress-line {
		flex: 1;
		height: 2px;
		background: var(--sp-border);
		margin: 0 8px;
		margin-bottom: 16px;
		transition: background 200ms ease;
	}

	.booking-progress-line.is-done {
		background: var(--sp-brand);
	}

	/* Steps */
	.booking-steps-wrap {
		position: relative;
		overflow: hidden;
	}

	.booking-step {
		display: none;
		flex-direction: column;
		gap: 16px;
	}

	.booking-step.is-active {
		display: flex;
	}

	.booking-field-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.booking-field-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--sp-muted);
	}

	.booking-pills-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.booking-pill {
		padding: 8px 14px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}

	.booking-pill.is-selected {
		border-color: color-mix(in srgb, var(--sp-brand) 55%, var(--sp-border));
		background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand));
		color: #05210f;
	}

	.booking-hint {
		font-size: 12px;
		color: var(--sp-muted);
		margin: 0;
	}

	.booking-checkbox-label {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 14px;
		font-weight: 500;
		color: var(--sp-text);
		cursor: pointer;
	}

	.booking-checkbox {
		width: 16px;
		height: 16px;
		accent-color: var(--sp-brand);
		cursor: pointer;
	}

	/* Slot grid */
	.slot-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.slot-btn {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		border: 1px solid var(--sp-border);
		background: color-mix(in srgb, var(--sp-surface-strong) 80%, transparent);
		color: var(--sp-text);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		display: grid;
		place-items: center;
		transition:
			border-color 120ms ease,
			background 120ms ease,
			transform 100ms ease;
	}

	.slot-btn:hover {
		border-color: color-mix(in srgb, var(--sp-brand) 50%, var(--sp-border));
		transform: translateY(-1px);
	}

	.slot-btn.is-selected {
		border-color: var(--sp-brand);
		background: color-mix(in srgb, var(--sp-brand) 18%, var(--sp-surface));
		color: var(--sp-brand-2);
	}

	.slot-btn--any {
		width: auto;
		padding: 0 10px;
		font-size: 11px;
	}

	.slot-manual-input {
		display: inline-block;
		width: 80px;
		padding: 6px 10px;
		font-size: 13px;
		margin-left: 6px;
		vertical-align: middle;
	}

	/* Price cards */
	.booking-price-cards {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	@media (max-width: 480px) {
		.booking-price-cards {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		/* Bottom sheet on mobile */
		.booking-modal {
			top: auto;
			bottom: 0;
			left: 0;
			right: 0;
			transform: none;
			width: 100%;
			max-height: 92svh;
			border-radius: 24px 24px 0 0;
			padding: 20px 16px;
			padding-bottom: calc(env(safe-area-inset-bottom) + 20px);
		}
		.booking-price-cards {
			grid-template-columns: 1fr;
		}
		.slot-btn {
			width: 32px;
			height: 32px;
			font-size: 11px;
		}
	}

	.booking-price-card {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 14px 12px;
		border-radius: 14px;
		border: 2px solid var(--sp-border);
		background: var(--sp-surface);
		cursor: pointer;
		text-align: left;
		transition:
			border-color 150ms ease,
			background 150ms ease;
	}

	.booking-price-card:hover {
		border-color: color-mix(in srgb, var(--sp-brand) 40%, var(--sp-border));
	}

	.booking-price-card.is-selected {
		border-color: var(--sp-brand);
		background: color-mix(in srgb, var(--sp-brand) 8%, var(--sp-surface));
	}

	.booking-price-label {
		font-size: 12px;
		font-weight: 700;
		color: var(--sp-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.booking-price-amount {
		font-family: var(--sp-font-display);
		font-size: 20px;
		font-weight: 800;
		color: var(--sp-gold);
		letter-spacing: -0.02em;
	}

	.booking-price-unit {
		font-size: 13px;
		font-weight: 500;
		color: var(--sp-muted);
	}

	.booking-price-desc {
		font-size: 12px;
		color: var(--sp-muted);
		line-height: 1.4;
	}

	/* Summary card */
	.booking-summary-card {
		border-radius: 14px;
		border: 1px solid var(--sp-border);
		background: var(--sp-surface);
		overflow: hidden;
	}

	.booking-summary-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		border-bottom: 1px solid var(--sp-border);
		gap: 12px;
	}

	.booking-summary-row:last-child {
		border-bottom: none;
	}

	.booking-summary-key {
		font-size: 13px;
		color: var(--sp-muted);
		font-weight: 500;
	}

	.booking-summary-val {
		font-size: 13px;
		font-weight: 600;
		color: var(--sp-text);
		text-align: right;
	}

	.booking-summary-total {
		background: color-mix(in srgb, var(--sp-brand) 6%, transparent);
	}

	.booking-summary-total-val {
		font-family: var(--sp-font-display);
		font-size: 20px;
		font-weight: 800;
		color: var(--sp-gold);
		letter-spacing: -0.02em;
	}

	.booking-error {
		padding: 10px 14px;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--sp-danger) 35%, var(--sp-border));
		background: color-mix(in srgb, var(--sp-danger) 8%, transparent);
		color: color-mix(in srgb, var(--sp-danger) 80%, var(--sp-text));
		font-size: 13px;
		font-weight: 500;
	}

	/* Navigation buttons */
	.booking-step-nav {
		display: flex;
		justify-content: flex-end;
		margin-top: 8px;
	}

	.booking-step-nav--split {
		justify-content: space-between;
	}

	.booking-next-btn,
	.booking-confirm-btn {
		padding: 12px 24px;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
		border-radius: 12px;
	}

	.booking-back-btn {
		padding: 12px 20px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		border-radius: 12px;
	}

	/* ── UPI Payment Step ────────────────────────────────────────── */
	.pay-card {
		display: flex;
		flex-direction: column;
		gap: 14px;
		border-radius: 16px;
		border: 1px solid var(--sp-border);
		background: var(--sp-surface);
		padding: 18px;
	}

	.pay-amount-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.pay-amount-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--sp-muted);
	}

	.pay-amount-value {
		font-family: var(--sp-font-display);
		font-size: 26px;
		font-weight: 800;
		color: var(--sp-gold);
		letter-spacing: -0.02em;
	}

	.pay-qr-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.pay-qr-img {
		width: 180px;
		height: 180px;
		border-radius: 12px;
		border: 1px solid var(--sp-border);
		background: #fff;
		display: block;
	}

	.pay-qr-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 12px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--sp-brand) 35%, var(--sp-border));
		background: color-mix(in srgb, var(--sp-brand) 8%, transparent);
		color: var(--sp-brand);
		font-size: 12px;
		font-weight: 700;
	}

	.pay-qr-badge-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--sp-brand);
		animation: payPulse 1.8s ease-in-out infinite;
	}

	@keyframes payPulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.35;
		}
	}

	.pay-upi-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--sp-border) 40%, transparent);
	}

	.pay-upi-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--sp-muted);
	}

	.pay-upi-id {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 13px;
		font-weight: 700;
		color: var(--sp-text);
		letter-spacing: 0.02em;
	}

	.pay-apps-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.pay-app-tag {
		padding: 4px 10px;
		border-radius: 999px;
		border: 1px solid var(--sp-border);
		background: var(--sp-surface-strong);
		font-size: 11px;
		font-weight: 700;
		color: var(--sp-muted);
	}

	.pay-demo-note {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--sp-accent) 30%, var(--sp-border));
		background: color-mix(in srgb, var(--sp-accent) 6%, transparent);
		color: color-mix(in srgb, var(--sp-accent) 80%, var(--sp-text));
		font-size: 12px;
		font-weight: 500;
		line-height: 1.5;
	}
</style>
