<script lang="ts">
	let {
		tab,
		stats,
		currentTheme,
		onTabChange,
		onToggleTheme,
	}: {
		tab: 'home' | 'map' | 'bookings' | 'profile';
		stats: { xp: number; level: number; streakDays: number; badges: string[] } | null;
		currentTheme: 'light' | 'dark';
		onTabChange: (t: 'home' | 'map' | 'bookings' | 'profile') => void;
		onToggleTheme: () => void;
	} = $props();
</script>

<aside class="dash-sidebar" aria-label="Main navigation">
	<!-- Logo -->
	<div class="dash-sidebar-logo">
		<div class="dash-logo-mark">SP</div>
		<span class="dash-logo-name">Smart Park</span>
	</div>

	<!-- Nav items -->
	<nav class="dash-sidebar-nav" aria-label="Dashboard navigation">
		{#each [
			{ id: 'home', label: 'Home', icon: 'i-fa6-solid-house' },
			{ id: 'map', label: 'Map', icon: 'i-fa6-solid-map-location-dot' },
			{ id: 'bookings', label: 'Bookings', icon: 'i-fa6-solid-ticket' },
			{ id: 'profile', label: 'Profile', icon: 'i-fa6-solid-user' },
		] as item}
			<button
				type="button"
				class="dash-nav-item"
				class:is-active={tab === item.id}
				onclick={() => onTabChange(item.id as typeof tab)}
				aria-current={tab === item.id ? 'page' : undefined}
			>
				<span class={item.icon} aria-hidden="true"></span>
				{item.label}
			</button>
		{/each}
	</nav>

	<!-- Spacer -->
	<div style="flex: 1;"></div>

	<!-- XP/stats display -->
	<div class="dash-sidebar-stats">
		<div class="dash-stat-row">
			<span class="i-fa6-solid-fire-flame-curved" aria-hidden="true"></span>
			<span>{stats?.streakDays ?? 0}d streak</span>
		</div>
		<div class="dash-stat-row">
			<span class="i-fa6-solid-star" aria-hidden="true"></span>
			<span>Level {stats?.level ?? 1} • {stats?.xp ?? 0} XP</span>
		</div>
	</div>

	<!-- Theme toggle in sidebar -->
	<button
		type="button"
		class="dash-theme-btn sp-btn"
		onclick={onToggleTheme}
		aria-label="Toggle theme"
	>
		<span class="i-bx-bulb" aria-hidden="true"></span>
		{currentTheme === 'dark' ? 'Light mode' : 'Dark mode'}
	</button>

	<!-- Logout -->
	<form method="POST" action="/logout" class="dash-sidebar-logout">
		<button class="sp-btn w-full" type="submit">Log out</button>
	</form>
</aside>

<style>
/* ── Sidebar ─────────────────────────────────────────────────── */
.dash-sidebar {
  grid-column: 1;
  grid-row: 1;
  position: sticky;
  top: 0;
  height: 100svh;
  overflow-y: auto;
  border-right: 1px solid var(--sp-border);
  background: var(--sp-bg0);
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  gap: 4px;
}

@media (max-width: 1023px) {
  .dash-sidebar {
    display: none;
  }
}

.dash-sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 16px;
  border-bottom: 1px solid var(--sp-border);
  margin-bottom: 8px;
}

.dash-logo-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand));
  color: #05210f;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 13px;
  flex-shrink: 0;
}

.dash-logo-name {
  font-family: var(--sp-font-display);
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.01em;
  color: var(--sp-text);
}

.dash-sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dash-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--sp-muted);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 150ms ease, color 150ms ease;
}

.dash-nav-item:hover {
  background: color-mix(in srgb, var(--sp-border) 60%, transparent);
  color: var(--sp-text);
}

.dash-nav-item.is-active {
  background: color-mix(in srgb, var(--sp-brand) 12%, transparent);
  color: var(--sp-brand);
  font-weight: 700;
}

.dash-nav-item:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--sp-brand) 60%, transparent);
  outline-offset: 2px;
}

.dash-sidebar-stats {
  padding: 12px 8px;
  border-top: 1px solid var(--sp-border);
  border-bottom: 1px solid var(--sp-border);
  margin: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dash-stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--sp-muted);
}

.dash-theme-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  margin-top: 4px;
}

.dash-sidebar-logout {
  margin-top: 4px;
}
</style>
