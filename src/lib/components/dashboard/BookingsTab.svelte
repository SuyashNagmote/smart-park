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

	<div class="mt-5 grid gap-3">
		{#if reservationsLoading}
			{#each [1,2,3] as _}
				<SkeletonCard lines={3} />
			{/each}
		{/if}
		{#if reservationsError}
			<ErrorBanner message="Could not load bookings" onRetry={onRefresh} />
		{/if}
		{#each reservations as r (r.id)}
			{@const isActive = r.sessionStatus === 'active'}
			{@const startedAt = r.sessionStartedAt ? Number(r.sessionStartedAt) : null}
			{@const elapsedMs = isActive && startedAt ? Math.max(0, activeNowMs - startedAt) : 0}
			{@const elapsedHr = elapsedMs / (60 * 60 * 1000)}
			{@const liveCost = isActive ? Math.max(0, Math.round(Number(r.pricePerHour) * elapsedHr)) : null}
			<div class="sp-glass rounded-2xl p-4">
				<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
					<div class="min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<div class="text-sm font-extrabold truncate">{r.lotName}</div>
							{#if isActive}
								<span class="sp-statusPill" data-tone="ok"><span class="sp-statusDot"></span>active</span>
							{:else if r.sessionStatus === 'completed'}
								<span class="sp-statusPill" data-tone="warn"><span class="sp-statusDot"></span>completed</span>
							{:else}
								<span class="sp-statusPill" data-tone="ok"><span class="sp-statusDot"></span>{r.status}</span>
							{/if}
						</div>
						<div class="text-xs mt-0.5 truncate" style="color: var(--sp-muted);">
							{r.lotArea} • {new Date(r.createdAt).toLocaleString()}
						</div>
						<div class="text-xs mt-2" style="color: var(--sp-muted);">
							{r.vehicleType === 'ev' ? 'EV' : 'Car'}
							{#if r.needsCharging} · Charging{/if}
							{#if r.slotNumber} · Slot #{r.slotNumber}{/if}
							· {new Date(r.startTime).toLocaleString()} · {r.durationHours}h
							· <span style="color: var(--sp-gold);">₹{r.totalPrice}</span>
						</div>
						{#if isActive}
							<div class="mt-2 text-xs font-extrabold" style="color: var(--sp-brand-2);">
								Session active • live cost ₹{liveCost}
							</div>
						{:else if r.sessionStatus === 'completed'}
							<div class="mt-2 text-xs font-extrabold" style="color: var(--sp-accent);">
								Session completed • final ₹{r.actualTotalPrice ?? r.totalPrice}
							</div>
						{/if}
					</div>
					<div class="shrink-0 sm:text-right">
						<div class="text-xs mt-1" style="color: var(--sp-muted);">Receipt</div>
						<div class="text-xs font-extrabold">{r.receiptCode}</div>
						<div class="mt-3 flex gap-2 justify-start sm:justify-end flex-wrap">
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
			</div>
		{/each}
		{#if reservations.length === 0 && !reservationsLoading}
			<EmptyState
				icon="i-fa6-solid-calendar-xmark"
				heading="No bookings yet"
				description="Find a lot on the map and make your first reservation to start earning XP."
				actionLabel="Find a lot"
				onAction={onGoMap}
			/>
		{/if}
	</div>
</section>
