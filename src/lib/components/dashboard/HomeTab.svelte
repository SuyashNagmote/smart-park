<script lang="ts">
	import SkeletonCard from '$lib/components/SkeletonCard.svelte';

	let {
		stats,
		suggestion,
		liveEvents,
		liveActivityOpen,
		parkingRushOpen,
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
		onFindLots: () => void;
		onViewBookings: () => void;
		onPlayRush: () => void;
		onViewLot: (lot: any) => void;
		onBookLot: (lot: any) => void;
		onToggleLiveActivity: () => void;
	} = $props();
</script>

<section class="sp-section sp-pop">
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
		<div class="flex items-center gap-2">
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

	{#if stats === null}<SkeletonCard lines={3} />{/if}
	<div class="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
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
			<div class="mt-2 text-xs" style="color: var(--sp-muted);">
				Book once per day to keep the flame alive.
			</div>
		</div>
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
		</div>
	</div>

	{#if suggestion}
		{@const s = suggestion}
		<div class="mt-6 sp-glass rounded-2xl p-4 sm:p-5">
		<div class="flex items-center justify-between gap-3">
			<div class="min-w-0">
				<div class="sp-chip">
					<span class="i-fa6-solid-robot"></span>
					Smart suggestion
				</div>
				<div class="mt-2 text-lg font-extrabold truncate font-display">{s.name}</div>
				<div class="text-sm truncate" style="color: var(--sp-muted);">
					{s.area} • ₹{s.hourlyRate ?? 50}/hr • {s.available ?? 0}/{s.capacity} slots
					{#if s.ev} • EV charging{/if}
				</div>
			</div>
			<div class="flex items-center gap-2">
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
