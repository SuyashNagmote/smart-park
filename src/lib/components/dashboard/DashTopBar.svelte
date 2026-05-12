<script lang="ts">
	let {
		email,
		level,
		currentTheme,
		onToggleTheme,
		hidden = false,
	}: {
		email: string | undefined;
		level: number;
		currentTheme: 'light' | 'dark';
		onToggleTheme: () => void;
		hidden?: boolean;
	} = $props();
</script>

{#if !hidden}
<header class="dash-topbar" aria-label="Mobile header">
	<div class="dash-topbar-inner">
		<div class="dash-topbar-brand">
			<div class="dash-logo-mark-sm">SP</div>
			<span class="dash-topbar-name">Smart Park</span>
		</div>
		<div class="dash-topbar-actions">
			<!-- XP badge on mobile -->
			<div class="dash-mobile-xp">
				<span class="i-fa6-solid-star" aria-hidden="true"></span>
				<span>Lv {level}</span>
			</div>
			<!-- Theme toggle on mobile -->
			<button
				type="button"
				class="dash-mobile-theme"
				onclick={onToggleTheme}
				aria-label="Toggle theme"
			>
				<span class="i-bx-bulb" aria-hidden="true"></span>
			</button>
		</div>
	</div>
</header>
{/if}

<style>
/* ── Mobile top bar ──────────────────────────────────────────── */
.dash-topbar {
  display: none;
  border-bottom: 1px solid var(--sp-border);
  background: var(--sp-bg0);
  position: sticky;
  top: 0;
  z-index: 40;
}

.dash-topbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  gap: 12px;
}

.dash-topbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.dash-logo-mark-sm {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand));
  color: #05210f;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 12px;
  flex-shrink: 0;
}

.dash-topbar-name {
  font-family: var(--sp-font-display);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--sp-text);
}

.dash-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.dash-mobile-xp {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--sp-brand);
  padding: 6px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--sp-brand) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--sp-brand) 25%, var(--sp-border));
}

.dash-mobile-theme {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--sp-border);
  background: var(--sp-surface-strong);
  color: var(--sp-muted);
  font-size: 16px;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
}

.dash-mobile-theme:hover {
  color: var(--sp-text);
  background: color-mix(in srgb, var(--sp-border) 60%, transparent);
}

@media (max-width: 1023px) {
  .dash-topbar {
    display: block;
  }
}
</style>
