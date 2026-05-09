<script lang="ts">
	let { lines = 3 }: { lines?: number } = $props();
</script>

<div class="skeleton-card">
	<!-- Title line: ~60% width -->
	<div class="sp-skeleton skeleton-title"></div>
	<!-- Subtitle line: ~40% width -->
	<div class="sp-skeleton skeleton-subtitle"></div>
	<!-- Additional content lines -->
	{#each Array(Math.max(0, lines - 2)) as _}
		<div class="sp-skeleton skeleton-line"></div>
	{/each}
	<!-- Pill placeholders -->
	<div class="skeleton-pills">
		<div class="sp-skeleton skeleton-pill"></div>
		<div class="sp-skeleton skeleton-pill"></div>
	</div>
</div>

<style>
	.skeleton-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
		border-radius: 16px;
		border: 1px solid var(--sp-border);
		background: var(--sp-surface-strong);
	}

	.skeleton-title {
		height: 20px;
		width: 62%;
	}

	.skeleton-subtitle {
		height: 16px;
		width: 40%;
	}

	.skeleton-line {
		height: 14px;
		width: 80%;
	}

	.skeleton-pills {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}

	.skeleton-pill {
		height: 24px;
		width: 64px;
		border-radius: 999px;
	}
</style>
