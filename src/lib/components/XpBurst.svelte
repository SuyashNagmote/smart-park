<script lang="ts">
	let { xp = 0, label = 'Booking confirmed', receipt = '' }: { xp?: number; label?: string; receipt?: string } =
		$props();
</script>

<div class="sp-xpburst sp-pop" role="status" aria-live="polite">
	<div class="sp-xpburst__card">
		<div class="sp-xpburst__coin" aria-hidden="true">
			<div class="sp-xpburst__coinInner"></div>
		</div>
		<div class="sp-xpburst__txt">
			<div class="sp-xpburst__title">{label}</div>
			<div class="sp-xpburst__sub">
				<span class="sp-xpburst__xp">+{xp} XP</span>
				{#if receipt}
					<span class="sp-xpburst__dot">•</span>
					<span class="sp-xpburst__receipt">{receipt}</span>
				{/if}
			</div>
		</div>

		<div class="sp-xpburst__spark sp-xpburst__spark--a"></div>
		<div class="sp-xpburst__spark sp-xpburst__spark--b"></div>
		<div class="sp-xpburst__spark sp-xpburst__spark--c"></div>
	</div>
</div>

