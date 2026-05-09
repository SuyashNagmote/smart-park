<script lang="ts">
	let {
		session,
		busy,
		onStop,
	}: {
		session: { r: any; elapsedMs: number; liveCost: number; remainingMs: number };
		busy: boolean;
		onStop: () => void;
	} = $props();

	function fmtHMS(ms: number) {
		const s = Math.max(0, Math.floor(ms / 1000));
		const hh = Math.floor(s / 3600);
		const mm = Math.floor((s % 3600) / 60);
		const ss = s % 60;
		if (hh > 0) return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
		return `${mm}:${String(ss).padStart(2, '0')}`;
	}
</script>

<div class="sp-cockpit sp-pop">
	<div class="sp-cockpit__wrap">
		<div class="min-w-0">
			<div class="sp-cockpit__title truncate">
				<span class="i-fa6-solid-stopwatch mr-2"></span>Session running
			</div>
			<div class="sp-cockpit__sub">
				<span class="truncate">{session.r.lotName}</span>
				<span class="opacity-40">•</span>
				<span>elapsed {fmtHMS(session.elapsedMs)}</span>
				<span class="opacity-40">•</span>
				<span>remaining {fmtHMS(session.remainingMs)}</span>
			</div>
		</div>

		<div class="flex items-center gap-3 shrink-0">
			<div class="sp-cockpit__kpi">
				<div class="sp-cockpit__kpiLabel">Live cost</div>
				<div class="sp-cockpit__kpiValue" style="color: var(--sp-gold);">₹{session.liveCost}</div>
			</div>
			<button
				class="sp-btn sp-btn-primary px-4 py-2.5 text-sm font-extrabold"
				type="button"
				disabled={busy}
				onclick={onStop}
			>
				{busy ? 'Stopping…' : 'Stop'}
			</button>
		</div>
	</div>
</div>
