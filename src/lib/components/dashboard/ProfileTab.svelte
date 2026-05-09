<script lang="ts">
	let {
		email,
		stats,
		bookingVehicle,
		bookingNeedsCharging,
		onVehicleChange,
		onChargingToggle,
	}: {
		email: string | undefined;
		stats: { xp: number; level: number; streakDays: number; badges: string[] } | null;
		bookingVehicle: 'car' | 'ev';
		bookingNeedsCharging: boolean;
		onVehicleChange: (v: 'car' | 'ev') => void;
		onChargingToggle: () => void;
	} = $props();
</script>

<section class="sp-section sp-pop">
	<div class="text-2xl font-extrabold tracking-tight">Account, preferences and security</div>

	<!-- XP progress bar -->
	<div class="sp-kpi mb-4 mt-5">
		<div class="flex items-center justify-between gap-3">
			<div class="text-xs font-bold" style="color: var(--sp-muted);">XP Progress</div>
			<div class="text-xs font-bold" style="color: var(--sp-gold);">Level {stats?.level ?? 1}</div>
		</div>
		<div class="mt-2 text-2xl font-extrabold font-display" style="color: var(--sp-gold);">{stats?.xp ?? 0} XP</div>
		<div class="mt-2 h-2 rounded-full" style="background: color-mix(in srgb, var(--sp-border) 55%, transparent);">
			<div class="h-2 rounded-full transition-all duration-500" style="width: {Math.min(100, ((stats?.xp ?? 0) % 250) / 2.5)}%; background: linear-gradient(90deg, var(--sp-accent), var(--sp-brand));"></div>
		</div>
		<div class="mt-1 text-xs" style="color: var(--sp-muted);">{250 - ((stats?.xp ?? 0) % 250)} XP to next level</div>
	</div>

	<!-- Badges section -->
	<div class="sp-glass rounded-2xl p-4 mb-4">
		<div class="text-xs font-bold mb-3" style="color: var(--sp-muted);">Badges</div>
		<div class="flex flex-wrap gap-2">
			{#each (stats?.badges ?? []) as b (b)}
				<span class="sp-chip sp-chip--ok" style="color: var(--sp-gold); border-color: color-mix(in srgb, var(--sp-gold) 35%, var(--sp-border));">{b}</span>
			{/each}
			{#if (stats?.badges ?? []).length === 0}
				<span class="text-sm" style="color: var(--sp-muted);">Complete bookings to unlock badges.</span>
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
		<div class="sp-glass rounded-2xl p-4">
			<div class="text-xs font-bold" style="color: var(--sp-muted);">Account</div>
			<div class="mt-1 text-sm font-extrabold">{email}</div>
		</div>
		<div class="sp-glass rounded-2xl p-4">
			<div class="text-xs font-bold" style="color: var(--sp-muted);">Membership</div>
			<div class="mt-1 text-sm font-extrabold">Gold</div>
			<div class="mt-2 text-xs" style="color: var(--sp-muted);">
				Priority booking in high demand areas and faster support.
			</div>
		</div>
		<div class="sp-glass rounded-2xl p-4">
			<div class="text-xs font-bold" style="color: var(--sp-muted);">Vehicles</div>
			<div class="mt-2 flex gap-2 flex-wrap">
				<button
					type="button"
					class={'sp-pill ' + (bookingVehicle === 'car' ? 'sp-btn-primary' : '')}
					onclick={() => onVehicleChange('car')}
				>
					Car
				</button>
				<button
					type="button"
					class={'sp-pill ' + (bookingVehicle === 'ev' ? 'sp-btn-primary' : '')}
					onclick={() => onVehicleChange('ev')}
				>
					EV
				</button>
				<button
					type="button"
					class={'sp-pill ' + (bookingNeedsCharging ? 'sp-btn-primary' : '')}
					onclick={onChargingToggle}
				>
					Needs charging
				</button>
			</div>
			<div class="mt-2 text-xs" style="color: var(--sp-muted);">
				EV + charging will prioritize EV-enabled lots.
			</div>
		</div>
		<div class="sp-glass rounded-2xl p-4">
			<div class="text-xs font-bold" style="color: var(--sp-muted);">Notifications</div>
			<div class="mt-1 text-sm font-extrabold">Realtime capacity alerts</div>
		</div>
	</div>
</section>
