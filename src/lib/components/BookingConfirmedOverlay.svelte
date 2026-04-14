<script lang="ts">
	import ConfettiBurst from './ConfettiBurst.svelte';

	let { receipt = '' }: { receipt?: string } = $props();
</script>

<div class="sp-booking-ok" role="status" aria-live="polite">
	<ConfettiBurst mode="shower" fullScreen={true} durationMs={2200} intensity={1.15} bursts={1} />

	<div class="sp-booking-ok__card sp-pop">
		<div class="sp-booking-ok__title">BOOKING CONFIRMED</div>
		{#if receipt}
			<div class="sp-booking-ok__receipt">{receipt}</div>
		{/if}
	</div>
</div>

