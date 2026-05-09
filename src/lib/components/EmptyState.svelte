<script lang="ts">
	let {
		icon = 'i-fa6-solid-inbox',
		heading,
		description,
		actionLabel,
		onAction
	}: {
		icon?: string;
		heading: string;
		description: string;
		actionLabel?: string;
		onAction?: () => void;
	} = $props();
</script>

<div class="empty-state">
	<div class="empty-icon-wrap">
		<span class={`empty-icon ${icon}`} aria-hidden="true"></span>
	</div>
	<h3 class="empty-heading">{heading}</h3>
	<p class="empty-desc">{description}</p>
	{#if actionLabel && onAction}
		<button class="sp-btn sp-btn-primary empty-action" onclick={onAction}>
			{actionLabel}
		</button>
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 48px 24px;
		text-align: center;
	}

	.empty-icon-wrap {
		width: 64px;
		height: 64px;
		border-radius: 18px;
		background: color-mix(in srgb, var(--sp-muted) 12%, var(--sp-surface));
		border: 1px solid var(--sp-border);
		display: grid;
		place-items: center;
		margin-bottom: 4px;
	}

	.empty-icon {
		width: 28px;
		height: 28px;
		color: var(--sp-muted);
		display: block;
	}

	.empty-heading {
		font-family: var(--sp-font-display);
		font-size: 18px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--sp-text);
		margin: 0;
	}

	.empty-desc {
		font-size: 14px;
		color: var(--sp-muted);
		margin: 0;
		max-width: 320px;
		line-height: 1.5;
	}

	.empty-action {
		margin-top: 4px;
		padding: 10px 20px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
</style>
