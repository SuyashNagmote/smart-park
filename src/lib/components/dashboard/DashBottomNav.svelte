<script lang="ts">
	let {
		tab,
		onTabChange,
	}: {
		tab: 'home' | 'map' | 'bookings' | 'profile';
		onTabChange: (t: 'home' | 'map' | 'bookings' | 'profile') => void;
	} = $props();
</script>

<nav class="dash-bottomnav" aria-label="Bottom navigation">
	{#each [
		{ id: 'home', label: 'Home', icon: 'i-fa6-solid-house' },
		{ id: 'map', label: 'Map', icon: 'i-fa6-solid-map-location-dot' },
		{ id: 'bookings', label: 'Bookings', icon: 'i-fa6-solid-ticket' },
		{ id: 'profile', label: 'Profile', icon: 'i-fa6-solid-user' },
	] as item}
		<button
			type="button"
			class="dash-bottomnav-item"
			class:is-active={tab === item.id}
			onclick={() => onTabChange(item.id as typeof tab)}
			aria-current={tab === item.id ? 'page' : undefined}
			aria-label={item.label}
		>
			<span class={`${item.icon} dash-bottomnav-icon`} aria-hidden="true"></span>
			<span class="dash-bottomnav-label">{item.label}</span>
		</button>
	{/each}
</nav>

<style>
/* ── Bottom nav ──────────────────────────────────────────────── */
.dash-bottomnav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  height: calc(64px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--sp-surface-strong);
  border-top: 1px solid var(--sp-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
}

.dash-bottomnav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px;
  border: none;
  background: transparent;
  color: var(--sp-muted);
  cursor: pointer;
  height: 100%;
  transition: color 150ms ease;
}

.dash-bottomnav-item.is-active {
  color: var(--sp-brand);
}

.dash-bottomnav-icon {
  font-size: 20px;
  display: block;
}

.dash-bottomnav-label {
  font-size: 11px;
  font-weight: 700;
}

@media (max-width: 1023px) {
  .dash-bottomnav {
    display: grid;
  }
}
</style>
