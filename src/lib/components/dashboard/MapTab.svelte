<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import SkeletonCard from '$lib/components/SkeletonCard.svelte';
	import type { ParkingLot } from '$lib/server/lots';

	let {
		mapContainer = $bindable(),
		parkingLots,
		filteredLots,
		selectedLotId,
		search,
		filterMode,
		status,
		lastUpdatedAt,
		errorMessage,
		lotsLoading,
		liveEvents,
		mapReady,
		mapInitError,
		showHeat,
		boundsDirty,
		areaBounds,
		pinMode,
		mapBottomCollapsed,
		selectedLotData,
		onSelectLot,
		onSearch,
		onFilterChange,
		onClearTarget,
		onToggleHeat,
		onSetPinMode,
		onSearchArea,
		onClearArea,
		onToggleDetails,
		onBook,
		onRetryLots,
	}: {
		mapContainer: HTMLDivElement | undefined;
		parkingLots: ParkingLot[];
		filteredLots: ParkingLot[];
		selectedLotId: string | null;
		search: string;
		filterMode: 'all' | 'available' | 'ev';
		status: 'connecting' | 'connected' | 'offline';
		lastUpdatedAt: string;
		errorMessage: string | null;
		lotsLoading: boolean;
		liveEvents: { type: string; lot: ParkingLot; timestamp: string }[];
		mapReady: boolean;
		mapInitError: string | null;
		showHeat: boolean;
		boundsDirty: boolean;
		areaBounds: any | null;
		pinMode: 'none' | 'home' | 'work';
		mapBottomCollapsed: boolean;
		selectedLotData: ParkingLot | null;
		onSelectLot: (id: string) => void;
		onSearch: (v: string) => void;
		onFilterChange: (f: 'all' | 'available' | 'ev') => void;
		onClearTarget: () => void;
		onToggleHeat: () => void;
		onSetPinMode: (m: 'none' | 'home' | 'work') => void;
		onSearchArea: () => void;
		onClearArea: () => void;
		onToggleDetails: () => void;
		onBook: () => void;
		onRetryLots: () => void;
	} = $props();
</script>

<div class="map-tab-grid">
	<!-- ── Left: Lot list panel ─────────────────────────────── -->
	<aside class="map-lot-panel">
		<!-- Search input -->
		<div class="sp-inputRow map-search-row">
			<span class="i-fa6-solid-magnifying-glass sp-inputIcon" aria-hidden="true"></span>
			<input
				type="search"
				placeholder="Search lots…"
				value={search}
				oninput={(e) => onSearch((e.target as HTMLInputElement).value)}
				aria-label="Search parking lots"
			/>
			<!-- Connection status -->
			<span
				class="map-status-dot"
				class:is-connected={status === 'connected'}
				class:is-offline={status === 'offline'}
				title={status}
				aria-label="Connection: {status}"
			></span>
		</div>

		<!-- Filter pills -->
		<div class="map-filter-row">
			<button
				type="button"
				class="sp-pill map-filter-pill"
				class:is-active={filterMode === 'all'}
				onclick={() => onFilterChange('all')}
			>All</button>
			<button
				type="button"
				class="sp-pill map-filter-pill"
				class:is-active={filterMode === 'available'}
				onclick={() => onFilterChange('available')}
			>Available</button>
			<button
				type="button"
				class="sp-pill map-filter-pill"
				class:is-active={filterMode === 'ev'}
				onclick={() => onFilterChange('ev')}
			>EV priority</button>
			{#if selectedLotId}
				<button
					type="button"
					class="sp-pill map-filter-pill map-filter-clear"
					onclick={onClearTarget}
				>Clear target</button>
			{/if}
		</div>

		<!-- Error banner -->
		{#if errorMessage}
			<ErrorBanner message={errorMessage} onRetry={onRetryLots} />
		{/if}

		<!-- Lot list -->
		<div class="map-lot-list" role="list" aria-label="Parking lots">
			{#if lotsLoading && parkingLots.length === 0}
				{#each [1, 2, 3, 4, 5] as _}
					<SkeletonCard lines={3} />
				{/each}
			{:else if filteredLots.length === 0}
				<EmptyState
					icon="i-fa6-solid-car"
					heading="No lots found"
					description="Try adjusting your search or filter."
				/>
			{:else}
				{#each filteredLots as lot (lot.id)}
					<button
						type="button"
						class="map-lot-card"
						class:is-selected={selectedLotId === lot.id}
						onclick={() => onSelectLot(lot.id)}
						aria-pressed={selectedLotId === lot.id}
					>
						<div class="map-lot-card-header">
							<span class="map-lot-name">{lot.name}</span>
							<span
								class="map-lot-avail"
								class:is-low={(lot.available ?? 0) < 5}
								class:is-empty={(lot.available ?? 0) === 0}
							>
								{lot.available ?? 0}/{lot.capacity}
							</span>
						</div>
						<div class="map-lot-meta">
							<span>{lot.area}</span>
							<span>₹{lot.hourlyRate ?? 50}/hr</span>
							{#if lot.ev}<span class="map-lot-ev-badge">⚡ EV</span>{/if}
						</div>
					</button>
				{/each}
			{/if}
		</div>

		<!-- Last updated -->
		{#if lastUpdatedAt}
			<div class="map-last-updated">Updated {lastUpdatedAt}</div>
		{/if}
	</aside>

	<!-- ── Right: Map section ───────────────────────────────── -->
	<section class="map-right-section">
		<!-- Map controls bar -->
		<div class="map-controls-bar">
			<button
				type="button"
				class="sp-btn map-ctrl-btn"
				class:is-active={showHeat}
				onclick={onToggleHeat}
				title="Toggle heat map"
				aria-pressed={showHeat}
			>
				<span class="i-fa6-solid-fire-flame-curved" aria-hidden="true"></span>
				Heat
			</button>
			<button
				type="button"
				class="sp-btn map-ctrl-btn"
				class:is-active={pinMode === 'home'}
				onclick={() => onSetPinMode(pinMode === 'home' ? 'none' : 'home')}
				title="Set home pin"
				aria-pressed={pinMode === 'home'}
			>
				<span class="i-fa6-solid-house" aria-hidden="true"></span>
				Home
			</button>
			<button
				type="button"
				class="sp-btn map-ctrl-btn"
				class:is-active={pinMode === 'work'}
				onclick={() => onSetPinMode(pinMode === 'work' ? 'none' : 'work')}
				title="Set work pin"
				aria-pressed={pinMode === 'work'}
			>
				<span class="i-fa6-solid-briefcase" aria-hidden="true"></span>
				Work
			</button>
			{#if boundsDirty || !areaBounds}
				<button
					type="button"
					class="sp-btn map-ctrl-btn"
					onclick={onSearchArea}
					title="Search this area"
				>
					<span class="i-fa6-solid-magnifying-glass" aria-hidden="true"></span>
					Search this area
				</button>
			{/if}
			{#if areaBounds}
				<button
					type="button"
					class="sp-btn map-ctrl-btn"
					onclick={onClearArea}
					title="Clear area filter"
				>
					<span class="i-fa6-solid-xmark" aria-hidden="true"></span>
					Clear area
				</button>
			{/if}
		</div>

		<!-- Map container -->
		<div class="map-container-wrap sp-map-shell">
			{#if mapInitError}
				<div class="map-init-error">
					<span class="i-fa6-solid-triangle-exclamation" aria-hidden="true"></span>
					{mapInitError}
				</div>
			{/if}
			<div bind:this={mapContainer} class="absolute inset-0 z-0" aria-label="Parking map"></div>
			{#if !mapReady && !mapInitError}
				<div class="map-loading-overlay" aria-live="polite">
					<span class="map-loading-spinner" aria-hidden="true"></span>
					<span>Loading map…</span>
				</div>
			{/if}
		</div>

		<!-- Lot detail bar -->
		{#if selectedLotData}
			<div class="map-detail-bar" class:is-collapsed={mapBottomCollapsed}>
				<button
					type="button"
					class="map-detail-toggle"
					onclick={onToggleDetails}
					aria-expanded={!mapBottomCollapsed}
					aria-label={mapBottomCollapsed ? 'Expand lot details' : 'Collapse lot details'}
				>
					<span class={mapBottomCollapsed ? 'i-fa6-solid-chevron-up' : 'i-fa6-solid-chevron-down'} aria-hidden="true"></span>
				</button>

				{#if !mapBottomCollapsed}
					<div class="map-detail-content">
						<div class="map-detail-info">
							<div class="map-detail-name">{selectedLotData.name}</div>
							<div class="map-detail-meta">
								<span>{selectedLotData.area}</span>
								<span class="map-detail-sep">·</span>
								<span
									class:text-danger={(selectedLotData.available ?? 0) === 0}
									class:text-warn={(selectedLotData.available ?? 0) < 5 && (selectedLotData.available ?? 0) > 0}
								>
									{selectedLotData.available ?? 0}/{selectedLotData.capacity} slots
								</span>
								<span class="map-detail-sep">·</span>
								<span style="color: var(--sp-gold);">₹{selectedLotData.hourlyRate ?? 50}/hr</span>
								{#if selectedLotData.ev}
									<span class="map-detail-sep">·</span>
									<span>⚡ EV</span>
									{#if selectedLotData.chargerKw}
										<span>{selectedLotData.chargerKw}kW</span>
									{/if}
								{/if}
							</div>
						</div>
						<button
							type="button"
							class="sp-btn sp-btn-primary map-book-btn"
							onclick={onBook}
							disabled={(selectedLotData.available ?? 0) === 0}
						>
							{(selectedLotData.available ?? 0) === 0 ? 'Full' : 'Book'}
						</button>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Realtime updates feed -->
		{#if liveEvents.length > 0}
			<div class="map-live-feed" aria-label="Live updates" aria-live="polite">
				<div class="map-live-feed-title">
					<span class="i-fa6-solid-bolt" aria-hidden="true"></span>
					Live
				</div>
				<div class="map-live-feed-list">
					{#each liveEvents.slice(0, 4) as ev (ev.timestamp + ev.lot.id)}
						<div class="map-live-event">
							<span class="map-live-event-name">{ev.lot.name}</span>
							<span class="map-live-event-time">{new Date(ev.timestamp).toLocaleTimeString()}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</section>
</div>

<style>
/* ── Map tab two-column grid ─────────────────────────────────── */
.map-tab-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  min-height: 0;
}

@media (min-width: 1024px) {
  .map-tab-grid {
    grid-template-columns: 380px 1fr;
    gap: 0;
  }
}

/* ── Left panel ──────────────────────────────────────────────── */
.map-lot-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-right: 1px solid var(--sp-border);
  background: var(--sp-bg0);
  overflow-y: auto;
  max-height: calc(100svh - 120px);
}

@media (max-width: 1023px) {
  .map-lot-panel {
    max-height: 280px;
    border-right: none;
    border-bottom: 1px solid var(--sp-border);
  }
}

.map-search-row {
  flex-shrink: 0;
}

.map-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--sp-muted);
  flex-shrink: 0;
  transition: background 300ms ease;
}

.map-status-dot.is-connected {
  background: var(--sp-brand);
}

.map-status-dot.is-offline {
  background: var(--sp-danger);
}

.map-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex-shrink: 0;
}

.map-filter-pill {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.map-filter-pill.is-active {
  border-color: color-mix(in srgb, var(--sp-brand) 55%, var(--sp-border));
  background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand));
  color: #05210f;
}

.map-filter-clear {
  border-color: color-mix(in srgb, var(--sp-warn) 40%, var(--sp-border));
  color: var(--sp-warn);
}

.map-lot-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.map-lot-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--sp-border);
  background: var(--sp-surface-strong);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: border-color 150ms ease, background 150ms ease, transform 120ms ease;
}

.map-lot-card:hover {
  border-color: color-mix(in srgb, var(--sp-brand) 35%, var(--sp-border));
  transform: translateY(-1px);
}

.map-lot-card.is-selected {
  border-color: var(--sp-brand);
  background: color-mix(in srgb, var(--sp-brand) 8%, var(--sp-surface-strong));
}

.map-lot-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.map-lot-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--sp-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-lot-avail {
  font-size: 12px;
  font-weight: 700;
  color: var(--sp-brand);
  flex-shrink: 0;
}

.map-lot-avail.is-low {
  color: var(--sp-warn);
}

.map-lot-avail.is-empty {
  color: var(--sp-danger);
}

.map-lot-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--sp-muted);
  font-weight: 500;
  flex-wrap: wrap;
}

.map-lot-ev-badge {
  color: var(--sp-accent);
  font-weight: 700;
}

.map-last-updated {
  font-size: 11px;
  color: var(--sp-muted);
  text-align: center;
  padding: 4px 0;
  flex-shrink: 0;
}

/* ── Right section ───────────────────────────────────────────── */
.map-right-section {
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
}

/* Map controls bar */
.map-controls-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--sp-border);
  background: var(--sp-bg0);
  flex-wrap: wrap;
  flex-shrink: 0;
  z-index: 10;
}

.map-ctrl-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border-radius: 10px;
}

.map-ctrl-btn.is-active {
  border-color: color-mix(in srgb, var(--sp-brand) 55%, var(--sp-border));
  background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand));
  color: #05210f;
}

/* Map container */
.map-container-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
}

.map-init-error {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: color-mix(in srgb, var(--sp-danger) 8%, var(--sp-surface));
  color: var(--sp-danger);
  font-size: 14px;
  font-weight: 600;
}

.map-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: color-mix(in srgb, var(--sp-bg0) 80%, transparent);
  font-size: 14px;
  color: var(--sp-muted);
  font-weight: 600;
}

.map-loading-spinner {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 2px solid var(--sp-border);
  border-top-color: var(--sp-brand);
  animation: mapSpin 700ms linear infinite;
  display: block;
}

@keyframes mapSpin {
  to { transform: rotate(360deg); }
}

/* Lot detail bar */
.map-detail-bar {
  position: relative;
  border-top: 1px solid var(--sp-border);
  background: var(--sp-surface-strong);
  flex-shrink: 0;
  z-index: 10;
}

.map-detail-toggle {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid var(--sp-border);
  background: var(--sp-surface-strong);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 12px;
  color: var(--sp-muted);
  z-index: 11;
  transition: color 150ms ease;
}

.map-detail-toggle:hover {
  color: var(--sp-text);
}

.map-detail-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
}

.map-detail-info {
  min-width: 0;
  flex: 1;
}

.map-detail-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--sp-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-detail-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--sp-muted);
  font-weight: 500;
  flex-wrap: wrap;
  margin-top: 3px;
}

.map-detail-sep {
  opacity: 0.4;
}

.text-danger {
  color: var(--sp-danger);
}

.text-warn {
  color: var(--sp-warn);
}

.map-book-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}

/* Live feed */
.map-live-feed {
  border-top: 1px solid var(--sp-border);
  background: var(--sp-bg0);
  padding: 8px 14px;
  flex-shrink: 0;
}

.map-live-feed-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  color: var(--sp-brand);
  margin-bottom: 4px;
}

.map-live-feed-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.map-live-event {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  padding: 2px 0;
}

.map-live-event-name {
  font-weight: 600;
  color: var(--sp-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-live-event-time {
  color: var(--sp-muted);
  flex-shrink: 0;
}
</style>
