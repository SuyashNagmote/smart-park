<script lang="ts">
	import SkeletonCard from '$lib/components/SkeletonCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';

	let {
		reservations,
		reservationsLoading,
		reservationsError,
		quests,
		activeNowMs,
		onRefresh,
		onViewOnMap,
		onReschedule,
		onStartSession,
		onStopSession,
		onCancel,
		onGoHome,
		onGoMap,
	}: {
		reservations: any[];
		reservationsLoading: boolean;
		reservationsError: string | null;
		quests: any | null;
		activeNowMs: number;
		onRefresh: () => void;
		onViewOnMap: (r: any) => void;
		onReschedule: (r: any) => void;
		onStartSession: (r: any) => void;
		onStopSession: (r: any) => void;
		onCancel: (id: string) => void;
		onGoHome: () => void;
		onGoMap: () => void;
	} = $props();

	// ── Filter & sort state ──────────────────────────────────────
	type FilterKey = 'all' | 'active' | 'upcoming' | 'completed' | 'cancelled';
	type SortKey = 'newest' | 'oldest' | 'lot';

	let filterKey = $state<FilterKey>('all');
	let sortKey = $state<SortKey>('newest');

	function isActive(r: any) { return r.sessionStatus === 'active'; }
	function isUpcoming(r: any) {
		return r.status === 'confirmed' && r.sessionStatus === 'not_started' && Number(r.startTime) > Date.now();
	}
	function isCompleted(r: any) { return r.sessionStatus === 'completed' || r.status === 'cancelled'; }
	function isCancelled(r: any) { return r.status === 'cancelled'; }

	function countFor(key: FilterKey): number {
		if (key === 'all') return reservations.length;
		if (key === 'active') return reservations.filter(isActive).length;
		if (key === 'upcoming') return reservations.filter(isUpcoming).length;
		if (key === 'completed') return reservations.filter(isCompleted).length;
		if (key === 'cancelled') return reservations.filter(isCancelled).length;
		return 0;
	}

	let filteredAndSorted = $derived((() => {
		let list = [...reservations];

		// Filter
		if (filterKey === 'active') list = list.filter(isActive);
		else if (filterKey === 'upcoming') list = list.filter(isUpcoming);
		else if (filterKey === 'completed') list = list.filter(isCompleted);
		else if (filterKey === 'cancelled') list = list.filter(isCancelled);

		// Sort
		if (sortKey === 'newest') list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
		else if (sortKey === 'oldest') list.sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
		else if (sortKey === 'lot') list.sort((a, b) => (a.lotName ?? '').localeCompare(b.lotName ?? ''));

		return list;
	})());

	const filterOptions: { key: FilterKey; label: string }[] = [
		{ key: 'all', label: 'All' },
		{ key: 'active', label: 'Active' },
		{ key: 'upcoming', label: 'Upcoming' },
		{ key: 'completed', label: 'Completed' },
		{ key: 'cancelled', label: 'Cancelled' },
	];

	// ── Card helpers ─────────────────────────────────────────────
	function cardAccent(r: any): string {
		if (isActive(r)) return 'var(--sp-brand)';
		if (isUpcoming(r)) return 'var(--sp-gold)';
		return 'var(--sp-muted)';
	}

	function fmtCountdown(ms: number): string {
		const totalMin = Math.floor(ms / 60000);
		const h = Math.floor(totalMin / 60);
		const m = totalMin % 60;
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	}

	function fmtElapsed(ms: number): string {
		const totalMin = Math.floor(ms / 60000);
		const h = Math.floor(totalMin / 60);
		const m = totalMin % 60;
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	}

	function vehicleIcon(r: any): string {
		return r.vehicleType === 'ev' ? '⚡' : '🚗';
	}

	function vehicleLabel(r: any): string {
		return r.vehicleType === 'ev' ? 'EV' : 'Car';
	}

	function directionsUrl(r: any): string {
		return `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}`;
	}
</script>

<section class="sp-section sp-pop">
	<div class="sp-sectionHead">
		<div>
			<div class="text-2xl font-extrabold tracking-tight font-display sp-sectionTitle">Your bookings</div>
			<div class="text-sm mt-1" style="color: var(--sp-muted);">
				Receipts, status, and quick actions.
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if quests?.quests}
				<button class="sp-btn px-4 py-2.5 text-sm font-bold" type="button" onclick={onGoHome}>
					Quests
				</button>
			{/if}
			<button class="sp-btn px-4 py-2.5 text-sm font-bold" type="button" onclick={onRefresh}>
				Refresh
			</button>
		</div>
	</div>

	<!-- Filter & sort controls -->
	<div class="filter-bar mt-4">
		<div class="filter-pills">
			{#each filterOptions as opt}
				{@const count = countFor(opt.key)}
				<button
					type="button"
					class="sp-pill filter-pill"
					class:is-active={filterKey === opt.key}
					onclick={() => (filterKey = opt.key)}
				>
					{opt.label}
					<span class="filter-count">{count}</span>
				</button>
			{/each}
		</div>
		<select
			class="sp-input sort-select"
			bind:value={sortKey}
			aria-label="Sort bookings"
		>
			<option value="newest">Newest first</option>
			<option value="oldest">Oldest first</option>
			<option value="lot">By lot name</option>
		</select>
	</div>

	<div class="mt-4 grid gap-3">
		{#if reservationsLoading}
			{#each [1,2,3] as _}
				<SkeletonCard lines={3} />
			{/each}
		{/if}
		{#if reservationsError}
			<ErrorBanner message="Could not load bookings" onRetry={onRefresh} />
		{/if}
		{#each filteredAndSorted as r (r.id)}
			{@const active = isActive(r)}
			{@const upcoming = isUpcoming(r)}
			{@const startedAt = r.sessionStartedAt ? Number(r.sessionStartedAt) : null}
			{@const elapsedMs = active && startedAt ? Math.max(0, activeNowMs - startedAt) : 0}
			{@const elapsedHr = elapsedMs / (60 * 60 * 1000)}
			{@const liveCost = active ? Math.max(0, Math.round(Number(r.pricePerHour) * elapsedHr)) : null}
			{@const timeUntilMs = upcoming ? Math.max(0, Number(r.startTime) - activeNowMs) : 0}
			<div class="booking-card sp-glass rounded-2xl" style="--accent: {cardAccent(r)};">
				<!-- Colored left border accent -->
				<div class="booking-card-accent"></div>

				<div class="booking-card-body">
					<!-- Top row: lot name + receipt code -->
					<div class="booking-card-top">
						<div class="booking-card-left min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								<div class="text-sm font-extrabold truncate">{r.lotName}</div>
								{#if active}
									<span class="sp-statusPill" data-tone="ok"><span class="sp-statusDot"></span>active</span>
								{:else if r.sessionStatus === 'completed'}
									<span class="sp-statusPill" data-tone="warn"><span class="sp-statusDot"></span>completed</span>
								{:else if r.status === 'cancelled'}
									<span class="sp-statusPill" data-tone="danger"><span class="sp-statusDot"></span>cancelled</span>
								{:else if upcoming}
									<span class="sp-statusPill" data-tone="ok"><span class="sp-statusDot"></span>upcoming</span>
								{:else}
									<span class="sp-statusPill" data-tone="ok"><span class="sp-statusDot"></span>{r.status}</span>
								{/if}
							</div>
							<div class="text-xs mt-0.5 truncate" style="color: var(--sp-muted);">
								{r.lotArea} • {new Date(Number(r.createdAt)).toLocaleString()}
							</div>
						</div>
						<div class="booking-card-receipt">
							<div class="receipt-label">Receipt</div>
							<div class="receipt-code">{r.receiptCode}</div>
						</div>
					</div>

					<!-- Details row -->
					<div class="booking-card-details">
						<span class="vehicle-badge">
							{vehicleIcon(r)} {vehicleLabel(r)}
							{#if r.needsCharging} · Charging{/if}
						</span>
						{#if r.slotNumber}
							<span class="detail-chip">Slot #{r.slotNumber}</span>
						{/if}
						<span class="detail-chip">{new Date(Number(r.startTime)).toLocaleString()}</span>
						<span class="detail-chip">{r.durationHours}h</span>
						<span class="detail-chip" style="color: var(--sp-gold);">₹{r.totalPrice}</span>
					</div>

					<!-- Live status pills -->
					{#if active}
						<div class="booking-card-live">
							<span class="live-pill live-pill--active">
								⏱ {fmtElapsed(elapsedMs)} elapsed
							</span>
							<span class="live-pill live-pill--cost">
								Live ₹{liveCost}
							</span>
						</div>
					{:else if upcoming}
						<div class="booking-card-live">
							<span class="live-pill live-pill--upcoming">
								🕐 Starts in {fmtCountdown(timeUntilMs)}
							</span>
						</div>
					{:else if r.sessionStatus === 'completed'}
						<div class="booking-card-live">
							<span class="live-pill live-pill--done">
								✓ Final ₹{r.actualTotalPrice ?? r.totalPrice}
							</span>
						</div>
					{/if}

					<!-- Action buttons row -->
					<div class="booking-card-actions">
						<button
							class="sp-btn px-3 py-2 text-xs font-extrabold"
							type="button"
							onclick={() => onViewOnMap(r)}
						>
							View
						</button>
						<a
							class="sp-btn px-3 py-2 text-xs font-extrabold"
							href={`/api/reservations/${r.id}/receipt`}
							target="_blank"
							rel="noreferrer"
						>
							PDF
						</a>
						<a
							class="sp-btn px-3 py-2 text-xs font-extrabold"
							href={directionsUrl(r)}
							target="_blank"
							rel="noreferrer"
							title="Get directions"
						>
							🗺 Directions
						</a>
						{#if r.status === 'confirmed'}
							<button
								class="sp-btn px-3 py-2 text-xs font-extrabold"
								type="button"
								disabled={r.sessionStatus === 'active'}
								onclick={() => onReschedule(r)}
							>
								Reschedule
							</button>
							{#if r.sessionStatus === 'not_started'}
								<button
									class="sp-btn sp-btn-primary px-3 py-2 text-xs font-extrabold"
									type="button"
									onclick={() => onStartSession(r)}
								>
									Start
								</button>
							{:else if r.sessionStatus === 'active'}
								<button
									class="sp-btn sp-btn-primary px-3 py-2 text-xs font-extrabold"
									type="button"
									onclick={() => onStopSession(r)}
								>
									Stop
								</button>
							{/if}
							<button
								class="sp-btn px-3 py-2 text-xs font-extrabold"
								type="button"
								onclick={() => onCancel(r.id)}
							>
								Cancel
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/each}
		{#if filteredAndSorted.length === 0 && !reservationsLoading}
			{#if reservations.length === 0}
				<EmptyState
					icon="i-fa6-solid-calendar-xmark"
					heading="No bookings yet"
					description="Find a lot on the map and make your first reservation to start earning XP."
					actionLabel="Find a lot"
					onAction={onGoMap}
				/>
			{:else}
				<div class="text-sm text-center py-8" style="color: var(--sp-muted);">
					No bookings match this filter.
				</div>
			{/if}
		{/if}
	</div>
</section>

<style>
/* Filter bar */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.filter-pill {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  gap: 6px;
}

.filter-pill.is-active {
  border-color: color-mix(in srgb, var(--sp-brand) 55%, var(--sp-border));
  background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand));
  color: #05210f;
}

.filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sp-border) 60%, transparent);
  font-size: 10px;
  font-weight: 900;
}

.filter-pill.is-active .filter-count {
  background: rgba(5, 33, 15, 0.25);
}

.sort-select {
  width: auto;
  min-width: 140px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* Booking card */
.booking-card {
  display: flex;
  overflow: hidden;
  position: relative;
}

.booking-card-accent {
  width: 4px;
  flex-shrink: 0;
  background: var(--accent, var(--sp-muted));
  border-radius: 4px 0 0 4px;
}

.booking-card-body {
  flex: 1;
  padding: 14px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.booking-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.booking-card-left {
  flex: 1;
  min-width: 0;
}

.booking-card-receipt {
  flex-shrink: 0;
  text-align: right;
}

.receipt-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--sp-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.receipt-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 14px;
  font-weight: 800;
  color: var(--sp-text);
  letter-spacing: 0.04em;
}

/* Details row */
.booking-card-details {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.vehicle-badge {
  font-size: 12px;
  font-weight: 700;
  color: var(--sp-text);
}

.detail-chip {
  font-size: 11px;
  font-weight: 600;
  color: var(--sp-muted);
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--sp-border);
  background: color-mix(in srgb, var(--sp-surface-strong) 70%, transparent);
}

/* Live status pills */
.booking-card-live {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.live-pill--active {
  background: color-mix(in srgb, var(--sp-brand) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--sp-brand) 35%, var(--sp-border));
  color: var(--sp-brand-2);
}

.live-pill--cost {
  background: color-mix(in srgb, var(--sp-gold) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--sp-gold) 35%, var(--sp-border));
  color: var(--sp-gold);
}

.live-pill--upcoming {
  background: color-mix(in srgb, var(--sp-gold) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--sp-gold) 35%, var(--sp-border));
  color: var(--sp-gold);
}

.live-pill--done {
  background: color-mix(in srgb, var(--sp-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--sp-accent) 30%, var(--sp-border));
  color: var(--sp-accent);
}

/* Action buttons */
.booking-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid var(--sp-border);
}
</style>
