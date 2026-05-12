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

	const xpProgress = $derived(Math.min(100, ((stats?.xp ?? 0) % 250) / 2.5));
	const xpToNext = $derived(250 - ((stats?.xp ?? 0) % 250));

	const avatarLetter = $derived(
		email ? email.charAt(0).toUpperCase() : '?'
	);

	function badgeIcon(badge: string): string {
		const b = badge.toLowerCase();
		if (b.includes('ev') || b.includes('electric')) return '⚡';
		if (b.includes('charge') || b.includes('master')) return '🔋';
		if (b.includes('plan')) return '📅';
		return '🏆';
	}

	const nextBadgeHint = $derived((() => {
		const badges = stats?.badges ?? [];
		if (!badges.includes('EV Driver')) return { label: 'EV Driver', hint: 'Book with an EV vehicle', icon: '⚡' };
		if (!badges.includes('Planner')) return { label: 'Planner', hint: 'Schedule a future booking', icon: '📅' };
		if (!badges.includes('Charge Master')) return { label: 'Charge Master', hint: 'Use EV charging 5 times', icon: '🔋' };
		return null;
	})());

	let deleteTooltipVisible = $state(false);
</script>

<section class="sp-section sp-pop">
	<!-- Avatar + identity -->
	<div class="profile-hero">
		<div class="profile-avatar" aria-hidden="true">
			{avatarLetter}
		</div>
		<div class="profile-identity">
			<div class="text-lg font-extrabold tracking-tight font-display">{email ?? 'Unknown user'}</div>
			<div class="text-sm mt-0.5" style="color: var(--sp-muted);">Member since 2024</div>
			<div class="mt-2 flex items-center gap-2">
				<span class="sp-chip">
					<span class="i-fa6-solid-star"></span>
					Level {stats?.level ?? 1}
				</span>
				<span class="sp-chip sp-chip--ok">
					<span class="i-fa6-solid-fire-flame-curved"></span>
					{stats?.streakDays ?? 0} day streak
				</span>
			</div>
		</div>
	</div>

	<!-- XP progress bar -->
	<div class="sp-kpi mt-5">
		<div class="flex items-center justify-between gap-3">
			<div class="text-xs font-bold" style="color: var(--sp-muted);">XP Progress</div>
			<div class="text-xs font-bold" style="color: var(--sp-gold);">Level {stats?.level ?? 1}</div>
		</div>
		<div class="mt-2 text-2xl font-extrabold font-display" style="color: var(--sp-gold);">{stats?.xp ?? 0} XP</div>
		<div class="mt-2 h-2 rounded-full" style="background: color-mix(in srgb, var(--sp-border) 55%, transparent);">
			<div
				class="xp-bar-fill h-2 rounded-full"
				style="width: {xpProgress}%;"
			></div>
		</div>
		<div class="mt-1 text-xs" style="color: var(--sp-muted);">{xpToNext} XP to next level</div>
	</div>

	<!-- Stats at a glance -->
	<div class="mt-4 grid grid-cols-3 gap-3">
		<div class="stat-mini-card">
			<div class="stat-mini-label">Total XP</div>
			<div class="stat-mini-value" style="color: var(--sp-gold);">{stats?.xp ?? 0}</div>
		</div>
		<div class="stat-mini-card">
			<div class="stat-mini-label">Level</div>
			<div class="stat-mini-value" style="color: var(--sp-brand-2);">{stats?.level ?? 1}</div>
		</div>
		<div class="stat-mini-card">
			<div class="stat-mini-label">Day Streak</div>
			<div class="stat-mini-value" style="color: var(--sp-accent);">{stats?.streakDays ?? 0}</div>
		</div>
	</div>

	<!-- Badges -->
	<div class="sp-glass rounded-2xl p-4 mt-4">
		<div class="text-xs font-bold mb-3" style="color: var(--sp-muted);">Badges</div>
		{#if (stats?.badges ?? []).length > 0}
			<div class="badges-grid">
				{#each (stats?.badges ?? []) as b (b)}
					<div class="badge-card">
						<div class="badge-icon">{badgeIcon(b)}</div>
						<div class="badge-name">{b}</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-sm" style="color: var(--sp-muted);">Complete bookings to unlock badges.</div>
		{/if}
		{#if nextBadgeHint}
			<div class="next-badge-hint mt-3">
				<span class="next-badge-icon">{nextBadgeHint.icon}</span>
				<span>
					Next: <strong>{nextBadgeHint.label}</strong> — {nextBadgeHint.hint}
				</span>
			</div>
		{/if}
	</div>

	<!-- Account & membership -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
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
	</div>

	<!-- Vehicle preferences -->
	<div class="sp-glass rounded-2xl p-4 mt-4">
		<div class="text-xs font-bold mb-3" style="color: var(--sp-muted);">Vehicle preferences</div>
		<div class="flex gap-2 flex-wrap">
			<button
				type="button"
				class="vehicle-toggle"
				class:is-active={bookingVehicle === 'car'}
				onclick={() => onVehicleChange('car')}
			>
				🚗 Car
			</button>
			<button
				type="button"
				class="vehicle-toggle"
				class:is-active={bookingVehicle === 'ev'}
				onclick={() => onVehicleChange('ev')}
			>
				⚡ EV
			</button>
			<button
				type="button"
				class="vehicle-toggle"
				class:is-active={bookingNeedsCharging}
				onclick={onChargingToggle}
			>
				🔋 Needs charging
			</button>
		</div>
		<div class="mt-2 text-xs" style="color: var(--sp-muted);">
			EV + charging will prioritize EV-enabled lots.
		</div>
	</div>

	<!-- Notifications -->
	<div class="sp-glass rounded-2xl p-4 mt-4">
		<div class="text-xs font-bold" style="color: var(--sp-muted);">Notifications</div>
		<div class="mt-1 text-sm font-extrabold">Realtime capacity alerts</div>
	</div>

	<!-- Logout -->
	<div class="mt-5">
		<a
			href="/logout"
			class="sp-btn px-5 py-3 text-sm font-bold w-full text-center block"
			style="text-decoration: none;"
		>
			Log out
		</a>
	</div>

	<!-- Danger zone -->
	<div class="danger-zone mt-4">
		<div class="text-xs font-bold mb-3" style="color: var(--sp-danger);">Danger zone</div>
		<div class="relative inline-block">
			<button
				type="button"
				class="sp-btn px-4 py-2.5 text-sm font-bold danger-btn"
				disabled
				onmouseenter={() => (deleteTooltipVisible = true)}
				onmouseleave={() => (deleteTooltipVisible = false)}
				onfocus={() => (deleteTooltipVisible = true)}
				onblur={() => (deleteTooltipVisible = false)}
				aria-describedby="delete-tooltip"
			>
				Delete account
			</button>
			{#if deleteTooltipVisible}
				<div class="delete-tooltip" id="delete-tooltip" role="tooltip">
					Coming soon
				</div>
			{/if}
		</div>
	</div>
</section>

<style>
/* Avatar hero */
.profile-hero {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--sp-brand-2), var(--sp-accent));
  display: grid;
  place-items: center;
  font-size: 28px;
  font-weight: 900;
  color: #05210f;
  flex-shrink: 0;
  box-shadow: 0 8px 28px color-mix(in srgb, var(--sp-brand) 35%, transparent);
}

.profile-identity {
  min-width: 0;
}

/* XP bar */
.xp-bar-fill {
  background: linear-gradient(90deg, var(--sp-accent), var(--sp-brand));
  transition: width 600ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Stats mini cards */
.stat-mini-card {
  border-radius: 16px;
  border: 1px solid var(--sp-border);
  background: color-mix(in srgb, var(--sp-surface-strong) 80%, transparent);
  padding: 12px;
  text-align: center;
}

.stat-mini-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--sp-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-mini-value {
  font-size: 22px;
  font-weight: 900;
  font-family: var(--sp-font-display);
  letter-spacing: -0.02em;
  margin-top: 4px;
}

/* Badges grid */
.badges-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--sp-gold) 35%, var(--sp-border));
  background: color-mix(in srgb, var(--sp-gold) 6%, var(--sp-surface));
}

.badge-icon {
  font-size: 16px;
}

.badge-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--sp-gold);
}

/* Next badge hint */
.next-badge-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--sp-accent) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--sp-accent) 25%, var(--sp-border));
  font-size: 12px;
  color: var(--sp-muted);
}

.next-badge-icon {
  font-size: 16px;
}

/* Vehicle toggles */
.vehicle-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 12px;
  border: 1px solid var(--sp-border);
  background: color-mix(in srgb, var(--sp-surface-strong) 80%, transparent);
  color: var(--sp-text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, transform 100ms ease;
}

.vehicle-toggle:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--sp-brand) 40%, var(--sp-border));
}

.vehicle-toggle.is-active {
  border-color: color-mix(in srgb, var(--sp-brand) 55%, var(--sp-border));
  background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand));
  color: #05210f;
}

/* Danger zone */
.danger-zone {
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--sp-danger) 30%, var(--sp-border));
  background: color-mix(in srgb, var(--sp-danger) 4%, transparent);
  padding: 16px;
}

.danger-btn {
  border-color: color-mix(in srgb, var(--sp-danger) 40%, var(--sp-border));
  color: var(--sp-danger);
  opacity: 0.6;
  cursor: not-allowed;
}

.delete-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 5px 10px;
  border-radius: 8px;
  background: var(--sp-surface-strong);
  border: 1px solid var(--sp-border);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  font-size: 12px;
  font-weight: 600;
  color: var(--sp-muted);
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
}
</style>
