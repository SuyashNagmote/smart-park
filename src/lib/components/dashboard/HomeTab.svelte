<script lang="ts">
	import SkeletonCard from '$lib/components/SkeletonCard.svelte';

	let {
		stats,
		suggestion,
		liveEvents,
		liveActivityOpen,
		parkingRushOpen,
		userPos,
		onFindLots,
		onViewBookings,
		onPlayRush,
		onViewLot,
		onBookLot,
		onToggleLiveActivity,
	}: {
		stats: { xp: number; level: number; streakDays: number; badges: string[] } | null;
		suggestion: any | null;
		liveEvents: { type: string; lot: any; timestamp: string }[];
		liveActivityOpen: boolean;
		parkingRushOpen: boolean;
		userPos: { lat: number; lon: number } | null;
		onFindLots: () => void;
		onViewBookings: () => void;
		onPlayRush: () => void;
		onViewLot: (lot: any) => void;
		onBookLot: (lot: any) => void;
		onToggleLiveActivity: () => void;
	} = $props();

	// ── Suggestion helpers ───────────────────────────────────────
	let whySuggestedOpen = $state(false);

	function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
		const R = 6371;
		const dLat = ((b.lat - a.lat) * Math.PI) / 180;
		const dLon = ((b.lon - a.lon) * Math.PI) / 180;
		const sinLat = Math.sin(dLat / 2);
		const sinLon = Math.sin(dLon / 2);
		const aa = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLon * sinLon;
		return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
	}

	let suggestionDistance = $derived(
		suggestion && userPos
			? haversineKm(userPos, { lat: suggestion.lat, lon: suggestion.lon })
			: null
	);

	function fmtDist(km: number): string {
		if (km < 1) return `${Math.round(km * 1000)}m away`;
		return `${km.toFixed(1)}km away`;
	}

	let availabilityPct = $derived(
		suggestion ? Math.round(((suggestion.available ?? 0) / Math.max(1, suggestion.capacity)) * 100) : 0
	);

	let availabilityUrgent = $derived(
		suggestion && (suggestion.available ?? 0) > 0 && (suggestion.available ?? 0) < 3
	);

	// ── Streak sparkline ─────────────────────────────────────────
	// Generate a visual pattern for last 7 days based on streakDays
	let sparkBars = $derived((() => {
		const streak = stats?.streakDays ?? 0;
		// Build a 7-bar pattern: last `streak` days (up to 7) are "active"
		const bars: boolean[] = [];
		for (let i = 6; i >= 0; i--) {
			bars.push(i < streak);
		}
		return bars;
	})());

	// ── Next badge hint ──────────────────────────────────────────
	let nextBadgeHint = $derived((() => {
		const badges = stats?.badges ?? [];
		if (!badges.includes('EV Driver')) return { label: 'EV Driver', hint: 'Book with an EV vehicle', icon: '⚡' };
		if (!badges.includes('Planner')) return { label: 'Planner', hint: 'Schedule a future booking', icon: '📅' };
		if (!badges.includes('Charge Master')) return { label: 'Charge Master', hint: 'Use EV charging 5 times', icon: '🔋' };
		return null;
	})());
</script>

<section class="sp-section sp-pop">
	<!-- Hero -->
	<div class="flex flex-wrap items-center gap-3 justify-between">
		<div>
			<div class="sp-chip">
				<span class="i-fa6-solid-bolt"></span>
				Now serving
			</div>
			<div class="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
				Your parking streak starts today.
			</div>
			<div class="mt-1 text-sm" style="color: var(--sp-muted);">
				Earn XP for choosing cheaper, closer, and greener (EV) options.
			</div>
		</div>
		<div class="flex items-center gap-2 flex-wrap">
			<button class="sp-btn sp-btn-primary px-4 py-2.5 text-sm" type="button" onclick={onFindLots}>
				Find lots
			</button>
			<button class="sp-btn px-4 py-2.5 text-sm font-bold" type="button" onclick={onViewBookings}>
				My bookings
			</button>
			<button class="sp-btn px-4 py-2.5 text-sm font-extrabold" type="button" onclick={onPlayRush}>
				Play Parking Rush
			</button>
		</div>
	</div>

	<!-- Quick actions row -->
	<div class="quick-actions mt-5">
		<button type="button" class="quick-action-btn" onclick={onFindLots}>
			<span class="quick-action-icon">📍</span>
			<span class="quick-action-label">Find Parking</span>
		</button>
		<button type="button" class="quick-action-btn" onclick={onViewBookings}>
			<span class="quick-action-icon">📅</span>
			<span class="quick-action-label">My Bookings</span>
		</button>
		<button type="button" class="quick-action-btn" onclick={onFindLots}>
			<span class="quick-action-icon">⚡</span>
			<span class="quick-action-label">EV Charging</span>
		</button>
	</div>

	{#if stats === null}<SkeletonCard lines={3} />{/if}
	<div class="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
		<!-- XP card -->
		<div class="sp-kpi">
			<div class="flex items-center justify-between gap-3">
				<div class="text-xs font-bold" style="color: var(--sp-muted);">Level</div>
				<div class="sp-glass rounded-xl px-2 py-1 text-xs font-extrabold">
					<span class="i-fa6-solid-star mr-1"></span>Lv {stats?.level ?? 1}
				</div>
			</div>
			<div class="mt-2 text-2xl font-extrabold tracking-tight font-display" style="color: var(--sp-gold);">
				{stats?.xp ?? 0} XP
			</div>
			<div class="mt-2 h-2 rounded-full" style="background: color-mix(in srgb, var(--sp-border) 55%, transparent);">
				<div
					class="h-2 rounded-full"
					style="width: {Math.min(100, ((stats?.xp ?? 0) % 250) / 2.5)}%; background: linear-gradient(90deg, var(--sp-accent), var(--sp-brand));"
				></div>
			</div>
			<div class="mt-2 text-xs" style="color: var(--sp-muted);">
				{stats?.xp ?? 0} XP • next level in {250 - ((stats?.xp ?? 0) % 250)} XP
			</div>
		</div>

		<!-- Streak card with sparkline -->
		<div class="sp-kpi">
			<div class="flex items-center justify-between gap-3">
				<div class="text-xs font-bold" style="color: var(--sp-muted);">Streak</div>
				<div class="sp-glass rounded-xl px-2 py-1 text-xs font-extrabold">
					<span class="i-fa6-solid-fire-flame-curved mr-1"></span>{stats?.streakDays ?? 0}d
				</div>
			</div>
			<div class="mt-2 text-2xl font-extrabold tracking-tight font-display">
				{stats?.streakDays ?? 0} days
			</div>
			<!-- Sparkline bars -->
			<div class="sparkline mt-2" aria-label="Last 7 days activity">
				{#each sparkBars as active, i}
					<div
						class="spark-bar"
						class:is-active={active}
						style="height: {active ? (12 + (i % 3) * 4) : 6}px;"
						title={active ? 'Active day' : 'Inactive day'}
					></div>
				{/each}
			</div>
			<div class="mt-2 text-xs" style="color: var(--sp-muted);">
				Book once per day to keep the flame alive.
			</div>
		</div>

		<!-- Badges card -->
		<div class="sp-kpi">
			<div class="text-xs font-bold" style="color: var(--sp-muted);">Badges</div>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each (stats?.badges ?? []).slice(0, 6) as b (b)}
					<span class="sp-chip">{b}</span>
				{/each}
				{#if (stats?.badges ?? []).length === 0}
					<span class="text-sm" style="color: var(--sp-muted);">Book to unlock badges.</span>
				{/if}
			</div>
			{#if nextBadgeHint}
				<div class="next-badge-hint mt-3">
					<span>{nextBadgeHint.icon}</span>
					<span class="text-xs" style="color: var(--sp-muted);">
						Next: <strong style="color: var(--sp-text);">{nextBadgeHint.label}</strong> — {nextBadgeHint.hint}
					</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Smart suggestion card -->
	{#if suggestion}
		{@const s = suggestion}
		<div class="mt-6 sp-glass rounded-2xl p-4 sm:p-5">
			<div class="flex items-start justify-between gap-3 flex-wrap">
				<div class="min-w-0 flex-1">
					<div class="sp-chip">
						<span class="i-fa6-solid-robot"></span>
						Smart suggestion
					</div>
					<div class="mt-2 text-lg font-extrabold truncate font-display">{s.name}</div>
					<div class="text-sm truncate" style="color: var(--sp-muted);">
						{s.area} • ₹{s.hourlyRate ?? 50}/hr
						{#if suggestionDistance !== null}
							• {fmtDist(suggestionDistance)}
						{/if}
						{#if s.ev} • EV charging{/if}
					</div>

					<!-- Availability bar -->
					<div class="avail-bar-wrap mt-3">
						<div class="avail-bar-track">
							<div
								class="avail-bar-fill"
								style="width: {availabilityPct}%; background: {availabilityPct > 50 ? 'var(--sp-brand)' : availabilityPct > 20 ? 'var(--sp-gold)' : 'var(--sp-danger)'};"
							></div>
						</div>
						<span class="avail-bar-label">
							{#if availabilityUrgent}
								<span style="color: var(--sp-danger); font-weight: 800;">Only {s.available} left!</span>
							{:else}
								{s.available ?? 0}/{s.capacity} slots
							{/if}
						</span>
					</div>

					<!-- Why suggested? expandable -->
					<button
						type="button"
						class="why-toggle mt-3"
						onclick={() => (whySuggestedOpen = !whySuggestedOpen)}
						aria-expanded={whySuggestedOpen}
					>
						<span class="i-fa6-solid-circle-info" style="font-size: 12px;"></span>
						Why suggested?
						<span class={whySuggestedOpen ? 'i-fa6-solid-chevron-up' : 'i-fa6-solid-chevron-down'} style="font-size: 10px;"></span>
					</button>
					{#if whySuggestedOpen}
						<div class="why-content mt-2">
							<div class="why-row">
								<span>📍</span>
								<span>Nearest available lot{suggestionDistance !== null ? ` (${fmtDist(suggestionDistance)})` : ''}</span>
							</div>
							<div class="why-row">
								<span>💰</span>
								<span>Best price at ₹{s.hourlyRate ?? 50}/hr</span>
							</div>
							{#if s.ev}
								<div class="why-row">
									<span>⚡</span>
									<span>EV charging supported</span>
								</div>
							{/if}
						</div>
					{/if}
				</div>
				<div class="flex items-center gap-2 flex-shrink-0">
					<button
						class="sp-btn px-4 py-2.5 text-sm font-bold"
						type="button"
						onclick={() => onViewLot(s)}
					>
						View
					</button>
					<button
						class="sp-btn sp-btn-primary px-4 py-2.5 text-sm"
						type="button"
						onclick={() => onBookLot(s)}
					>
						Book
					</button>
				</div>
			</div>
		</div>
	{:else}
		<div class="mt-6 sp-glass rounded-2xl p-4 sm:p-5 text-sm" style="color: var(--sp-muted);">
			Loading lots…
		</div>
	{/if}

	<!-- Live activity collapsible section -->
	<div class="mt-6 sp-glass rounded-2xl overflow-hidden">
		<button
			type="button"
			class="w-full flex items-center justify-between px-4 py-3 text-sm font-extrabold"
			onclick={onToggleLiveActivity}
			aria-expanded={liveActivityOpen}
		>
			<span><span class="i-fa6-solid-bolt mr-2"></span>Live activity</span>
			<span class={liveActivityOpen ? 'i-fa6-solid-chevron-up' : 'i-fa6-solid-chevron-down'} aria-hidden="true"></span>
		</button>
		{#if liveActivityOpen}
			<div class="px-4 pb-4 grid gap-2">
				{#each liveEvents.slice(0, 6) as ev (ev.timestamp + ev.lot.id)}
					<div class="flex items-center justify-between gap-3 text-xs py-1 border-t" style="border-color: var(--sp-border);">
						<span class="font-extrabold truncate">{ev.lot.name}</span>
						<span style="color: var(--sp-muted);">{ev.type === 'exit_detected' ? 'Availability updated' : 'Pricing updated'} · {new Date(ev.timestamp).toLocaleTimeString()}</span>
					</div>
				{/each}
				{#if liveEvents.length === 0}
					<div class="text-xs py-2" style="color: var(--sp-muted);">No live events yet.</div>
				{/if}
			</div>
		{/if}
	</div>
</section>

<style>
/* Quick actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.quick-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 10px;
  border-radius: 16px;
  border: 1px solid var(--sp-border);
  background: color-mix(in srgb, var(--sp-surface-strong) 80%, transparent);
  color: var(--sp-text);
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.quick-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(2, 8, 23, 0.14);
  border-color: color-mix(in srgb, var(--sp-brand) 40%, var(--sp-border));
}

.quick-action-btn:active {
  transform: translateY(0);
}

.quick-action-icon {
  font-size: 22px;
}

.quick-action-label {
  font-size: 12px;
  font-weight: 700;
}

/* Sparkline */
.sparkline {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 20px;
}

.spark-bar {
  flex: 1;
  border-radius: 3px;
  background: color-mix(in srgb, var(--sp-border) 80%, transparent);
  transition: height 300ms ease;
}

.spark-bar.is-active {
  background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand));
}

/* Next badge hint */
.next-badge-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--sp-accent) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--sp-accent) 22%, var(--sp-border));
}

/* Availability bar */
.avail-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avail-bar-track {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sp-border) 60%, transparent);
  overflow: hidden;
}

.avail-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 400ms ease;
}

.avail-bar-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--sp-muted);
  white-space: nowrap;
}

/* Why suggested */
.why-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--sp-accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.why-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--sp-surface-strong) 70%, transparent);
  border: 1px solid var(--sp-border);
}

.why-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--sp-muted);
}
</style>
