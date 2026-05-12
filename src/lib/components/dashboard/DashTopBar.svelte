<script lang="ts">
	let {
		email,
		level,
		currentTheme,
		onToggleTheme,
	}: {
		email: string | undefined;
		level: number;
		currentTheme: 'light' | 'dark';
		onToggleTheme: () => void;
	} = $props();
</script>

<header class="dash-topbar" aria-label="Mobile header">
	<div class="dash-topbar-inner">
		<div class="dash-topbar-brand">
			<div class="dash-logo-mark-sm">SP</div>
			<span class="dash-topbar-email">{email}</span>
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
				class="sp-btn sp-glass dash-mobile-theme"
				onclick={onToggleTheme}
				aria-label="Toggle theme"
			>
				<span class="i-bx-bulb" aria-hidden="true"></span>
			</button>
		</div>
	</div>
</header>

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

.dash-topbar-email {
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  padding: 8px;
  font-size: 16px;
  cursor: pointer;
}

@media (max-width: 1023px) {
  .dash-topbar {
    display: block;
  }
}
</style>
