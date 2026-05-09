<script lang="ts">
	let {
		lot,
		step,
		duration,
		vehicle,
		needsCharging,
		slot,
		priceId,
		busy,
		error,
		onClose,
		onNext,
		onBack,
		onDurationChange,
		onVehicleChange,
		onChargingToggle,
		onSlotChange,
		onPriceChange,
		onConfirm,
		bindStep1El,
		bindStep2El,
		bindStep3El,
		bindModalEl,
	}: {
		lot: any;
		step: 1 | 2 | 3;
		duration: number;
		vehicle: 'car' | 'ev';
		needsCharging: boolean;
		slot: number | null;
		priceId: 'standard' | 'flex' | 'green';
		busy: boolean;
		error: string | null;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
		onDurationChange: (h: number) => void;
		onVehicleChange: (v: 'car' | 'ev') => void;
		onChargingToggle: () => void;
		onSlotChange: (s: number | null) => void;
		onPriceChange: (p: 'standard' | 'flex' | 'green') => void;
		onConfirm: () => void;
		bindStep1El: (el: HTMLDivElement) => void;
		bindStep2El: (el: HTMLDivElement) => void;
		bindStep3El: (el: HTMLDivElement) => void;
		bindModalEl: (el: HTMLDivElement) => void;
	} = $props();

	let step1El: HTMLDivElement | undefined = $state();
	let step2El: HTMLDivElement | undefined = $state();
	let step3El: HTMLDivElement | undefined = $state();
	let modalEl: HTMLDivElement | undefined = $state();

	$effect(() => { if (step1El) bindStep1El(step1El); });
	$effect(() => { if (step2El) bindStep2El(step2El); });
	$effect(() => { if (step3El) bindStep3El(step3El); });
	$effect(() => { if (modalEl) bindModalEl(modalEl); });

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
<div
	class="booking-backdrop"
	onclick={() => !busy && onClose()}
	aria-hidden="true"
></div>

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
			aria-label="Close booking dialog"
		>✕</button>
	</div>

	<!-- Progress indicator -->
	<div class="booking-progress" aria-label="Step {step} of 3">
		{#each ([1, 2, 3] as const) as s}
			<div class="booking-progress-step" class:is-active={step === s} class:is-done={step > s}>
				<div class="booking-progress-dot">
					{#if step > s}✓{:else}{s}{/if}
				</div>
				<span class="booking-progress-label">{['Duration', 'Price', 'Confirm'][s - 1]}</span>
			</div>
			{#if s < 3}
				<div class="booking-progress-line" class:is-done={step > s}></div>
			{/if}
		{/each}
	</div>

	<!-- Steps container -->
	<div class="booking-steps-wrap">
		{#if lot}
			<!-- Step 1: Duration & Vehicle -->
			<div
				class="booking-step"
				class:is-active={step === 1}
				bind:this={step1El}
				aria-hidden={step !== 1}
			>
				<div class="booking-field-group">
					<div class="booking-field-label">Duration</div>
					<div class="booking-pills-row">
						{#each [1, 2, 3, 4, 6, 8, 12] as h}
							<button
								type="button"
								class="sp-pill booking-pill"
								class:is-selected={duration === h}
								onclick={() => onDurationChange(h)}
							>{h}h</button>
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
							onclick={() => onVehicleChange('car')}
						>🚗 Car</button>
						<button
							type="button"
							class="sp-pill booking-pill"
							class:is-selected={vehicle === 'ev'}
							onclick={() => onVehicleChange('ev')}
							disabled={!lot.ev}
						>⚡ EV</button>
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

				<div class="booking-step-nav">
					<button
						type="button"
						class="sp-btn sp-btn-primary booking-next-btn"
						onclick={onNext}
					>Next →</button>
				</div>
			</div>

			<!-- Step 2: Price Tier -->
			<div
				class="booking-step"
				class:is-active={step === 2}
				bind:this={step2El}
				aria-hidden={step !== 2}
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
								<div class="booking-price-amount">₹{opt.perHour}<span class="booking-price-unit">/hr</span></div>
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
					<button type="button" class="sp-btn booking-back-btn" onclick={onBack}>← Back</button>
					<button type="button" class="sp-btn sp-btn-primary booking-next-btn" onclick={onNext}>Next →</button>
				</div>
			</div>

			<!-- Step 3: Confirm -->
			<div
				class="booking-step"
				class:is-active={step === 3}
				bind:this={step3El}
				aria-hidden={step !== 3}
			>
				{#if step === 3}
					{@const priceOpt = optionPrices(lot).find(o => o.id === priceId) ?? optionPrices(lot)[0]}
					{@const total = Math.round(priceOpt.perHour * duration)}
					<div class="booking-summary-card">
						<div class="booking-summary-row">
							<span class="booking-summary-key">Lot</span>
							<span class="booking-summary-val">{lot.name}</span>
						</div>
						<div class="booking-summary-row">
							<span class="booking-summary-key">Duration</span>
							<span class="booking-summary-val">{duration}h</span>
						</div>
						<div class="booking-summary-row">
							<span class="booking-summary-key">Vehicle</span>
							<span class="booking-summary-val">{vehicle === 'ev' ? 'EV' : 'Car'}{needsCharging ? ' + Charging' : ''}</span>
						</div>
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
						<button type="button" class="sp-btn booking-back-btn" onclick={onBack} disabled={busy}>← Back</button>
						<button
							type="button"
							class="sp-btn sp-btn-primary booking-confirm-btn"
							onclick={onConfirm}
							disabled={busy}
						>
							{busy ? 'Booking…' : 'Confirm booking'}
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
  transition: background 200ms ease, border-color 200ms ease, color 200ms ease;
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
  transition: border-color 150ms ease, background 150ms ease;
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
</style>
